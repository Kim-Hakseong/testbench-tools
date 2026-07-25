import { describe, expect, it } from "vitest";
import { rtdResistance, rtdTemperature } from "./rtd";
import {
  adcToVoltage,
  ANALOG_PRESETS,
  loopStatus,
  scale,
  scaleCurrent,
  voltageToAdc,
} from "./scaling";
import vectors from "../vectors/scaling.json";

describe("§9.6 4-20 mA scaling", () => {
  const [outMin, outMax] = vectors.currentLoop.range as [number, number];

  it.each(vectors.currentLoop.cases)("$mA mA → $value", ({ mA, value }) => {
    const r = scaleCurrent(mA, outMin, outMax);
    expect(r.value).toBeCloseTo(value, 9);
    expect(r.status).toBe("ok");
  });

  it("3.7 mA is judged open-loop", () => {
    expect(loopStatus(vectors.currentLoop.openLoop.mA)).toBe(vectors.currentLoop.openLoop.status);
    expect(scaleCurrent(vectors.currentLoop.openLoop.mA, outMin, outMax).status).toBe("open-loop");
  });

  it("boundary judgements: 3.9 under-range, 20.6 over-range, 4..20 ok", () => {
    expect(loopStatus(3.9)).toBe("under-range");
    expect(loopStatus(20.6)).toBe("over-range");
    expect(loopStatus(4)).toBe("ok");
    expect(loopStatus(20)).toBe("ok");
  });
});

describe("§9.6 S7 preset scaling", () => {
  it("raw 13824 @ 0..100 → 50.0", () => {
    const s7 = ANALOG_PRESETS.find((p) => p.id === "s7")!;
    const v = vectors.s7Preset;
    expect(scale(v.raw, s7.rawMin, s7.rawMax, v.engMin, v.engMax)).toBeCloseTo(v.value, 9);
  });

  it("catalog contains ONLY spec/-backed presets (S7)", () => {
    // CLAUDE.md §5-3: AB / Mitsubishi / LS must not appear until spec/ records them.
    expect(ANALOG_PRESETS.map((p) => p.id)).toEqual(["s7"]);
    expect(ANALOG_PRESETS[0]!.source).toBe("spec/vendor-analog-ranges.md");
  });
});

describe("§9.6 ADC", () => {
  const { bits, vref } = vectors.adc;

  it.each(vectors.adc.cases)("count $count → $voltage V", ({ count, voltage, tolerance }) => {
    expect(Math.abs(adcToVoltage(count, bits, vref).voltage - voltage)).toBeLessThan(tolerance);
  });

  it("LSB = 0.805861 mV (1e-5)", () => {
    const lsbMv = adcToVoltage(0, bits, vref).lsb * 1000;
    expect(Math.abs(lsbMv - vectors.adc.lsbMillivolts)).toBeLessThan(vectors.adc.lsbTolerance);
  });

  it("voltage → count roundtrip and clamping", () => {
    expect(voltageToAdc(1.650403, bits, vref)).toBe(2048);
    expect(voltageToAdc(99, bits, vref)).toBe(4095);
    expect(voltageToAdc(-1, bits, vref)).toBe(0);
  });
});

describe("§9.6 PT100 (IEC 60751, T ≥ 0)", () => {
  const v = vectors.pt100;

  it("R(100 °C) = 138.5055 Ω (1e-3)", () => {
    expect(Math.abs(rtdResistance(100, v.r0)! - v.resistanceAt100C)).toBeLessThan(v.resistanceTolerance);
  });

  it("R = 108.5 Ω → T = 21.8189 °C (1e-3)", () => {
    expect(Math.abs(rtdTemperature(v.inverse.r, v.r0)! - v.inverse.tempC)).toBeLessThan(v.inverse.tolerance);
  });

  it("roundtrip R(T(108.5)) = 108.5 (1e-5)", () => {
    const t = rtdTemperature(v.inverse.r, v.r0)!;
    expect(Math.abs(rtdResistance(t, v.r0)! - v.inverse.r)).toBeLessThan(v.roundtripTolerance);
  });

  it("PT1000 scales with r0 = 1000", () => {
    expect(Math.abs(rtdResistance(100, 1000)! - 1385.055)).toBeLessThan(1e-2);
  });

  it("out-of-range inputs return null (T<0 branch is P1)", () => {
    expect(rtdResistance(-10)).toBeNull();
    expect(rtdTemperature(99.9)).toBeNull();
    expect(rtdResistance(900)).toBeNull();
  });
});
