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

  it("every preset is spec/-backed and names its module", () => {
    // Vendor-constant gate: a preset may exist only where spec/ records the
    // range with a source. Ranges belong to a module, so each must name one.
    expect(ANALOG_PRESETS.length).toBeGreaterThan(0);
    for (const preset of ANALOG_PRESETS) {
      expect(preset.source).toBe("spec/vendor-analog-ranges.md");
      expect(preset.vendor.length).toBeGreaterThan(0);
      expect(preset.module.length).toBeGreaterThan(0);
      expect(preset.rawMax).toBeGreaterThan(preset.rawMin);
    }
  });

  it("preset ids are unique", () => {
    const ids = ANALOG_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries the ranges spec/ records for each vendor", () => {
    const byId = new Map(ANALOG_PRESETS.map((p) => [p.id, p]));
    // Siemens rated range.
    expect([byId.get("s7")!.rawMin, byId.get("s7")!.rawMax]).toEqual([0, 27648]);
    // Mitsubishi R60AD4 — SH-081232ENG.
    expect([byId.get("r60ad4-normal")!.rawMin, byId.get("r60ad4-normal")!.rawMax]).toEqual([0, 32000]);
    expect([byId.get("r60ad4-extended")!.rawMin, byId.get("r60ad4-extended")!.rawMax]).toEqual([-8000, 32000]);
    // AB SLC 1746-NI4 4-20mA — 1746-UM005B-EN-P.
    expect([byId.get("slc-ni4-4-20ma")!.rawMin, byId.get("slc-ni4-4-20ma")!.rawMax]).toEqual([3277, 16384]);
    // LS XGF-AD4S precise 4-20mA — XGF-AD4S V1.4.
    expect([byId.get("xgf-ad4s-precise-4-20ma")!.rawMin, byId.get("xgf-ad4s-precise-4-20ma")!.rawMax]).toEqual([4000, 20000]);
    // Mitsubishi Q64AD — SH(NA)-080055-U Table 3.1, both resolution modes.
    expect([byId.get("q64ad-normal-unipolar")!.rawMin, byId.get("q64ad-normal-unipolar")!.rawMax]).toEqual([0, 4000]);
    expect([byId.get("q64ad-normal-bipolar")!.rawMin, byId.get("q64ad-normal-bipolar")!.rawMax]).toEqual([-4000, 4000]);
    expect([byId.get("q64ad-high-0-10v")!.rawMin, byId.get("q64ad-high-0-10v")!.rawMax]).toEqual([0, 16000]);
    expect([byId.get("q64ad-high-unipolar-12000")!.rawMin, byId.get("q64ad-high-unipolar-12000")!.rawMax]).toEqual([0, 12000]);
    expect([byId.get("q64ad-high-bipolar")!.rawMin, byId.get("q64ad-high-bipolar")!.rawMax]).toEqual([-16000, 16000]);
    // Mitsubishi L60AD4 — SH(NA)-080899ENG-F section 3.2 table (1).
    expect([byId.get("l60ad4-normal")!.rawMin, byId.get("l60ad4-normal")!.rawMax]).toEqual([0, 20000]);
    expect([byId.get("l60ad4-bipolar")!.rawMin, byId.get("l60ad4-bipolar")!.rawMax]).toEqual([-20000, 20000]);
    expect([byId.get("l60ad4-extended")!.rawMin, byId.get("l60ad4-extended")!.rawMax]).toEqual([-5000, 22500]);
    // Mitsubishi FX5U CPU built-in — JY997D60501H chapter 7.
    expect([byId.get("fx5u-builtin-0-10v")!.rawMin, byId.get("fx5u-builtin-0-10v")!.rawMax]).toEqual([0, 4000]);
    // LS XGF-AD8A — V1.8 Table 2.2, four formats.
    expect([byId.get("xgf-ad8a-unsigned")!.rawMin, byId.get("xgf-ad8a-unsigned")!.rawMax]).toEqual([0, 16000]);
    expect([byId.get("xgf-ad8a-signed")!.rawMin, byId.get("xgf-ad8a-signed")!.rawMax]).toEqual([-8000, 8000]);
    expect([byId.get("xgf-ad8a-percentile")!.rawMin, byId.get("xgf-ad8a-percentile")!.rawMax]).toEqual([0, 10000]);
    expect([byId.get("xgf-ad8a-precise-4-20ma")!.rawMin, byId.get("xgf-ad8a-precise-4-20ma")!.rawMax]).toEqual([4000, 20000]);
    // LS XBF-AD04A — V2.4 section 2.2.2.
    expect([byId.get("xbf-ad04a-unsigned")!.rawMin, byId.get("xbf-ad04a-unsigned")!.rawMax]).toEqual([0, 4000]);
    expect([byId.get("xbf-ad04a-signed")!.rawMin, byId.get("xbf-ad04a-signed")!.rawMax]).toEqual([-2000, 2000]);
    expect([byId.get("xbf-ad04a-percentile")!.rawMin, byId.get("xbf-ad04a-percentile")!.rawMax]).toEqual([0, 1000]);
    expect([byId.get("xbf-ad04a-precise-4-20ma")!.rawMin, byId.get("xbf-ad04a-precise-4-20ma")!.rawMax]).toEqual([400, 2000]);
  });

  it("does not carry one module's range over to a sibling module", () => {
    // The whole reason the gate exists: these four Mitsubishi A/D families are
    // routinely assumed to share a range and every one of them differs.
    const max = (id: string) => ANALOG_PRESETS.find((p) => p.id === id)!.rawMax;
    const unipolarFullScale = [
      max("r60ad4-normal"), // MELSEC iQ-R  32000
      max("q64ad-normal-unipolar"), // MELSEC-Q     4000
      max("l60ad4-normal"), // MELSEC-L    20000
      max("fx5u-builtin-0-10v"), // iQ-F built-in 4000
    ];
    expect(unipolarFullScale).toEqual([32000, 4000, 20000, 4000]);
    // Q64AD normal and the FX5U built-in coincide at 4000 by accident; they must
    // still be distinct presets on distinct modules.
    const q64 = ANALOG_PRESETS.find((p) => p.id === "q64ad-normal-unipolar")!;
    const fx5 = ANALOG_PRESETS.find((p) => p.id === "fx5u-builtin-0-10v")!;
    expect(q64.module).not.toBe(fx5.module);

    // Same for the two LS families: 14-bit AD8A vs 16-bit AD4S vs 12-bit AD04A.
    expect(max("xgf-ad8a-signed")).toBe(8000);
    expect(max("xgf-ad4s-signed")).toBe(32000);
    expect(max("xbf-ad04a-signed")).toBe(2000);
  });

  it("ControlLogix presets exist only for integer mode and warn about the endpoints", () => {
    // 1756-UM009G-EN-P: floating point mode scales on the module, so no raw range
    // exists there; integer mode is fixed at -32768..32767 but those counts sit on
    // the EXTENDED signal endpoints, which the note has to state.
    const clx = ANALOG_PRESETS.filter((p) => p.id.startsWith("clx-if8-"));
    expect(clx.length).toBe(4);
    for (const p of clx) {
      expect([p.rawMin, p.rawMax]).toEqual([-32768, 32767]);
      expect(p.module).toContain("integer mode");
      expect(p.note).toContain("Integer mode only");
    }
    // The 0-20 mA top count is 20.58 mA, not 20 mA.
    expect(ANALOG_PRESETS.find((p) => p.id === "clx-if8-int-0-20ma")!.note).toContain("20.58 mA");
  });

  it("the isolated ControlLogix inputs do not inherit the IF8 endpoints", () => {
    // Same p.31 table, different headroom per module. Copying an IF8 conversion
    // onto an IF6I is the mistake these presets exist to prevent, so the notes
    // have to name the endpoint that differs.
    const note = (id: string) => ANALOG_PRESETS.find((p) => p.id === id)!.note!;

    // 0-20 mA reaches full count at 20.58 mA on the IF8 and 21.09376 mA here.
    expect(note("clx-if8-int-0-20ma")).toContain("20.58 mA");
    expect(note("clx-if6cis-int-0-20ma")).toContain("21.09376 mA");
    expect(note("clx-if6i-int-0-20ma")).toContain("21.09376 mA");
    expect(note("clx-if6cis-int-0-20ma")).not.toContain("20.58 mA,");

    // 0-10V likewise: 10.25 V on the IF8, 10.54688 V on the IF6I.
    expect(note("clx-if8-int-0-10v")).toContain("10.25 V");
    expect(note("clx-if6i-int-0-10v")).toContain("10.54688 V");

    // Range names lie: the 1-487 ohm range actually starts below 1 ohm.
    expect(note("clx-ir6i-int-1-487")).toContain("0.859068653");

    // Every isolated-family preset is integer-mode only and full signed span.
    const family = ANALOG_PRESETS.filter(
      (p) => /^clx-(if6cis|if6i|ir6i|it6i)-/.test(p.id),
    );
    expect(family.length).toBe(11);
    for (const preset of family) {
      expect([preset.rawMin, preset.rawMax]).toEqual([-32768, 32767]);
      expect(preset.module).toContain("integer mode");
      expect(preset.note).toContain("Integer mode only");
      expect(preset.source).toBe("spec/vendor-analog-ranges.md");
    }

    // The thermocouple module returns millivolts, not temperature — saying so
    // is the whole point of its note.
    expect(note("clx-it6i-int-12-30mv")).toContain("not temperature");
  });

  it("notes, where present, are non-empty prose", () => {
    for (const preset of ANALOG_PRESETS) {
      if (preset.note !== undefined) expect(preset.note.trim().length).toBeGreaterThan(0);
    }
  });

  it("scales through a vendor preset end to end", () => {
    // AB 4-20mA: the bottom of the raw range is the bottom of the span.
    const ab = ANALOG_PRESETS.find((p) => p.id === "slc-ni4-4-20ma")!;
    expect(scale(ab.rawMin, ab.rawMin, ab.rawMax, 0, 100)).toBeCloseTo(0, 9);
    expect(scale(ab.rawMax, ab.rawMin, ab.rawMax, 0, 100)).toBeCloseTo(100, 9);
    // Mitsubishi mid-scale.
    const mit = ANALOG_PRESETS.find((p) => p.id === "r60ad4-normal")!;
    expect(scale(16000, mit.rawMin, mit.rawMax, 0, 100)).toBeCloseTo(50, 9);
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
