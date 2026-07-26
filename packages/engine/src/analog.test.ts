import { describe, expect, it } from "vitest";
import {
  applyCal,
  dbFromPowerRatio,
  dbFromVoltageRatio,
  dbmFromWatts,
  invertCal,
  loopBudget,
  powerRatioFromDb,
  sineLevels,
  twoPointCal,
  vrmsFromPower,
  wattsFromDbm,
} from "./analog";
import { dividerOptions, dividerVout, E24, E96, nearestValue } from "./eseries";
import { modbusAddressViews, parseDataModelAddress } from "./modbus";

describe("two-point calibration", () => {
  it("fits slope/offset through two points", () => {
    // 4 mA → 0 °C, 20 mA → 200 °C: slope 12.5, offset −50
    const c = twoPointCal(4, 0, 20, 200)!;
    expect(c.slope).toBeCloseTo(12.5, 12);
    expect(c.offset).toBeCloseTo(-50, 12);
    expect(applyCal(c, 12)).toBeCloseTo(100, 12);
    expect(invertCal(c, 100)).toBeCloseTo(12, 12);
  });

  it("rejects vertical fits", () => {
    expect(twoPointCal(5, 0, 5, 10)).toBeNull();
  });
});

describe("loop budget", () => {
  it("24 V, 250 Ω + 50 Ω wire, 12 V lift-off @ 20 mA", () => {
    const r = loopBudget({ supply: 24, minTransmitterV: 12, loopResistance: 300 });
    expect(r.vDrop).toBeCloseTo(6, 12); // 0.02 × 300
    expect(r.vAtTransmitter).toBeCloseTo(18, 12);
    expect(r.margin).toBeCloseTo(6, 12);
    expect(r.maxResistance).toBeCloseTo(600, 12); // (24−12)/0.02
    expect(r.ok).toBe(true);
  });

  it("flags an over-burdened loop", () => {
    expect(loopBudget({ supply: 12, minTransmitterV: 10, loopResistance: 250 }).ok).toBe(false);
  });
});

describe("sine levels", () => {
  it("230 Vrms → 325.27 Vpk, 650.54 Vpp", () => {
    const s = sineLevels("rms", 230);
    expect(s.peak).toBeCloseTo(325.269, 2);
    expect(s.peakToPeak).toBeCloseTo(650.538, 2);
  });

  it("round-trips peak → rms → peak", () => {
    const s = sineLevels("pp", 10);
    expect(sineLevels("rms", s.rms).peakToPeak).toBeCloseTo(10, 12);
  });
});

describe("dB / dBm", () => {
  it("power ×2 = 3.0103 dB, voltage ×10 = 20 dB", () => {
    expect(dbFromPowerRatio(2)).toBeCloseTo(3.0103, 4);
    expect(dbFromVoltageRatio(10)).toBeCloseTo(20, 12);
    expect(powerRatioFromDb(10)).toBeCloseTo(10, 12);
  });

  it("0 dBm = 1 mW = 0.2236 Vrms @ 50 Ω", () => {
    expect(wattsFromDbm(0)).toBeCloseTo(1e-3, 15);
    expect(dbmFromWatts(1)).toBeCloseTo(30, 12);
    expect(vrmsFromPower(1e-3, 50)).toBeCloseTo(0.2236, 4);
  });
});

describe("E-series + divider", () => {
  it("series sanity: 24 / 96 values, known members", () => {
    expect(E24).toHaveLength(24);
    expect(E96).toHaveLength(96);
    for (const v of [4.7, 6.8, 9.1]) expect(E24).toContain(v);
    for (const v of [1.0, 1.3, 4.99, 8.25, 9.76]) expect(E96).toContain(v);
  });

  it("nearest E24 to 4.9k is 4.7k or 5.1k", () => {
    expect([4700, 5100]).toContain(nearestValue(4900, "E24"));
  });

  it("divider math: 12 V with 10k/10k → 6 V", () => {
    expect(dividerVout(12, 10_000, 10_000)).toBeCloseTo(6, 12);
  });

  it("finds accurate 3.3 V from 5 V pairs (E96, <1% error)", () => {
    const opts = dividerOptions(5, 3.3, "E96", 10_000);
    expect(opts.length).toBeGreaterThan(0);
    expect(Math.abs(opts[0]!.error)).toBeLessThan(0.01);
  });
});

describe("modbus address notation", () => {
  it("holding register protocol 0 ↔ 40001 / 400001", () => {
    const v = modbusAddressViews("holding-register", 0)!;
    expect(v.oneBased).toBe(1);
    expect(v.fiveDigit).toBe("40001");
    expect(v.sixDigit).toBe("400001");
  });

  it("parses 40011 → holding register, protocol 10", () => {
    const v = parseDataModelAddress("40011")!;
    expect(v.entity).toBe("holding-register");
    expect(v.protocol).toBe(10);
  });

  it("parses 30001 and 100005", () => {
    expect(parseDataModelAddress("30001")!.entity).toBe("input-register");
    const d = parseDataModelAddress("100005")!;
    expect(d.entity).toBe("discrete-input");
    expect(d.protocol).toBe(4);
  });

  it("rejects invalid input", () => {
    expect(parseDataModelAddress("90001")).toBeNull();
    expect(parseDataModelAddress("4001")).toBeNull();
    expect(modbusAddressViews("coil", 70000)).toBeNull();
  });
});
