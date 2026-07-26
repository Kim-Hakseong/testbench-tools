import { describe, expect, it } from "vitest";
import { asciiToBytes, } from "./convert";
import { xor8 } from "./checksum";
import { buildNmea, checksumHex, nmeaChecksum, parseNmea } from "./nmea";

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
