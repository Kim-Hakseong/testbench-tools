import { describe, expect, it } from "vitest";
import { asciiToBytes, } from "./convert";
import { xor8 } from "./checksum";
import { buildNmea, checksumHex, nmeaChecksum, parseNmea, nmeaLatitude, nmeaLongitude, nmeaCoordinateToDegrees, nmeaTime, nmeaDate, } from "./nmea";

// Canonical example sentence (published in countless NMEA references):
const GGA_BODY = "GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,";

describe("nmea checksum", () => {
  it("matches the golden-tested xor8 engine", () => {
    expect(nmeaChecksum(GGA_BODY)).toBe(xor8(asciiToBytes(GGA_BODY)));
  });

  it("canonical GGA example → 0x47", () => {
    expect(checksumHex(nmeaChecksum(GGA_BODY))).toBe("47");
  });

  it("buildNmea wraps body with $ and *HH", () => {
    expect(buildNmea("GPGLL,4916.45,N,12311.12,W,225444,A")).toBe(
      "$GPGLL,4916.45,N,12311.12,W,225444,A*31",
    );
  });
});

describe("nmea parse", () => {
  it("parses a valid sentence", () => {
    const r = parseNmea(`$${GGA_BODY}*47`);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sentence.talker).toBe("GP");
      expect(r.sentence.type).toBe("GGA");
      expect(r.sentence.fields[0]).toBe("123519");
      expect(r.sentence.valid).toBe(true);
    }
  });

  it("flags a checksum mismatch", () => {
    const r = parseNmea(`$${GGA_BODY}*48`);
    expect(r.ok && r.sentence.valid).toBe(false);
  });

  it("handles missing checksum (valid = null)", () => {
    const r = parseNmea(`$${GGA_BODY}`);
    expect(r.ok && r.sentence.valid).toBe(null);
    expect(r.ok && r.sentence.computed).toBe(0x47);
  });

  it("rejects garbage", () => {
    expect(parseNmea("hello").ok).toBe(false);
    expect(parseNmea("$GPGGA,1*XY").ok).toBe(false);
  });

  it("proprietary sentences keep the P talker", () => {
    const r = parseNmea("$PGRME,15.0,M,45.0,M,25.0,M*1C");
    expect(r.ok && r.sentence.talker).toBe("P");
  });
});

describe("nmea coordinate encoding", () => {
  // Hand-computed, not captured from the implementation: 0.5665° × 60 = 33.99′.
  it("encodes decimal degrees as ddmm.mmmm — degrees and MINUTES, not a decimal", () => {
    expect(nmeaLatitude(37.5665)).toEqual({ ok: true, value: { field: "3733.9900", hemisphere: "N" } });
    expect(nmeaLongitude(126.978)).toEqual({ ok: true, value: { field: "12658.6800", hemisphere: "E" } });
    expect(nmeaLatitude(-33.8688)).toEqual({ ok: true, value: { field: "3352.1280", hemisphere: "S" } });
    expect(nmeaLongitude(-151.2093)).toEqual({ ok: true, value: { field: "15112.5580", hemisphere: "W" } });
  });

  it("carries 60.0000 minutes into the next degree instead of printing it", () => {
    const r = nmeaLatitude(36.9999999);
    expect(r).toEqual({ ok: true, value: { field: "3700.0000", hemisphere: "N" } });
  });

  it("round-trips through the decoder helper", () => {
    const enc = nmeaLatitude(37.5665);
    if (!enc.ok) throw new Error(enc.error);
    expect(nmeaCoordinateToDegrees(enc.value.field, enc.value.hemisphere)).toBeCloseTo(37.5665, 9);
    expect(nmeaCoordinateToDegrees("3352.1280", "S")).toBeCloseTo(-33.8688, 9);
  });

  it("rejects out-of-range and non-finite input", () => {
    expect(nmeaLatitude(91).ok).toBe(false);
    expect(nmeaLongitude(-181).ok).toBe(false);
    expect(nmeaLatitude(Number.NaN).ok).toBe(false);
  });
});

describe("nmea time and date fields", () => {
  it("formats hhmmss.ss and ddmmyy", () => {
    expect(nmeaTime(9, 5, 3.5)).toBe("090503.50");
    expect(nmeaTime(23, 59, 59.99)).toBe("235959.99");
    expect(nmeaDate(7, 8, 2026)).toBe("070826");
  });

  it("rejects impossible values rather than wrapping them", () => {
    expect(nmeaTime(24, 0, 0)).toBeNull();
    expect(nmeaTime(0, 60, 0)).toBeNull();
    expect(nmeaTime(0, 0, 60)).toBeNull();
    expect(nmeaDate(32, 1, 2026)).toBeNull();
    expect(nmeaDate(1, 13, 2026)).toBeNull();
  });
});

describe("generated sentences", () => {
  it("assembles a GGA body that decodes back to the same values", () => {
    const lat = nmeaLatitude(37.5665);
    const lon = nmeaLongitude(126.978);
    if (!lat.ok || !lon.ok) throw new Error("encode failed");
    const body = `GPGGA,${nmeaTime(2, 30, 0)},${lat.value.field},${lat.value.hemisphere},${lon.value.field},${lon.value.hemisphere},1,08,0.9,38.0,M,19.0,M,,`;
    const sentence = buildNmea(body);
    const parsed = parseNmea(sentence);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.sentence.type).toBe("GGA");
      expect(parsed.sentence.valid).toBe(true);
      expect(nmeaCoordinateToDegrees(parsed.sentence.fields[1]!, parsed.sentence.fields[2]!)).toBeCloseTo(37.5665, 9);
    }
  });
});
