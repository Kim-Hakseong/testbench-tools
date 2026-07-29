// Linear scaling engines: generic scale, 4-20 mA current loops with fault
// judgement, PLC analog raw ranges (vendor presets gated by spec/), ADC
// count↔voltage. Pure TS, no DOM. BCD lives in convert.ts.

/** Linear interpolation x: [inMin, inMax] → [outMin, outMax] (no clamping). */
export function scale(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((x - inMin) * (outMax - outMin)) / (inMax - inMin);
}

/**
 * 4-20 mA loop judgement (DESIGN §2):
 *   x < 3.8        → open-loop (broken wire / no transmitter)
 *   3.8 ≤ x < 4    → under-range
 *   x > 20.5       → over-range
 *   otherwise      → ok
 */
export type LoopStatus = "open-loop" | "under-range" | "ok" | "over-range";

export function loopStatus(mA: number): LoopStatus {
  if (mA < 3.8) return "open-loop";
  if (mA < 4) return "under-range";
  if (mA > 20.5) return "over-range";
  return "ok";
}

export interface CurrentScaleResult {
  value: number;
  percentOfSpan: number;
  status: LoopStatus;
}

/** Map a 4-20 mA signal onto [outMin, outMax] with loop judgement. */
export function scaleCurrent(mA: number, outMin: number, outMax: number): CurrentScaleResult {
  return {
    value: scale(mA, 4, 20, outMin, outMax),
    percentOfSpan: scale(mA, 4, 20, 0, 100),
    status: loopStatus(mA),
  };
}

// ---------------------------------------------------------------------------
// PLC analog vendor presets — ONLY entries backed by spec/vendor-analog-ranges.md
// may appear here (vendor-constant gate).
//
// A raw range belongs to a MODULE and an input range, not to a vendor: the same
// maker ships modules that differ, and some let you pick the output format per
// channel. Presets are therefore one row per module + range (+ format).
// ---------------------------------------------------------------------------
export interface AnalogPreset {
  id: string;
  label: string;
  /** Maker, for grouping in a picker. */
  vendor: string;
  /** Module the range belongs to, or the family when the maker states it that way. */
  module: string;
  rawMin: number;
  rawMax: number;
  /** Provenance inside this repo. */
  source: string;
  /**
   * Anything the raw range alone does not tell you — most importantly when the
   * count endpoints do NOT sit on the nominal signal endpoints, which is what
   * silently miscalibrates a loop. Shown next to the result.
   */
  note?: string;
}

export const ANALOG_PRESETS: AnalogPreset[] = [
  // Siemens — rated analogue range.
  {
    id: "s7",
    label: "Siemens S7 (0…27648)",
    vendor: "Siemens",
    module: "S7 analogue",
    rawMin: 0,
    rawMax: 27648,
    source: "spec/vendor-analog-ranges.md",
  },

  // Mitsubishi R60AD4 — SH-081232ENG performance specifications.
  {
    id: "r60ad4-normal",
    label: "Mitsubishi R60AD4 · 0–10V / 4–20mA (0…32000)",
    vendor: "Mitsubishi",
    module: "MELSEC iQ-R R60AD4",
    rawMin: 0,
    rawMax: 32000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "r60ad4-extended",
    label: "Mitsubishi R60AD4 · 4–20mA extended (−8000…32000)",
    vendor: "Mitsubishi",
    module: "MELSEC iQ-R R60AD4",
    rawMin: -8000,
    rawMax: 32000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "r60ad4-bipolar",
    label: "Mitsubishi R60AD4 · −10–10V (−32000…32000)",
    vendor: "Mitsubishi",
    module: "MELSEC iQ-R R60AD4",
    rawMin: -32000,
    rawMax: 32000,
    source: "spec/vendor-analog-ranges.md",
  },

  // Mitsubishi MELSEC-Q Q64AD — SH(NA)-080055-U Table 3.1. The resolution mode is a
  // parameter, and it changes the endpoints, so it is part of the preset identity.
  {
    id: "q64ad-normal-unipolar",
    label: "Mitsubishi Q64AD · normal res., 0–10V / 0–5V / 1–5V / 0–20mA / 4–20mA (0…4000)",
    vendor: "Mitsubishi",
    module: "MELSEC-Q Q64AD",
    rawMin: 0,
    rawMax: 4000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "q64ad-normal-bipolar",
    label: "Mitsubishi Q64AD · normal res., −10–10V (−4000…4000)",
    vendor: "Mitsubishi",
    module: "MELSEC-Q Q64AD",
    rawMin: -4000,
    rawMax: 4000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "q64ad-high-0-10v",
    label: "Mitsubishi Q64AD · high res., 0–10V (0…16000)",
    vendor: "Mitsubishi",
    module: "MELSEC-Q Q64AD",
    rawMin: 0,
    rawMax: 16000,
    source: "spec/vendor-analog-ranges.md",
    note: "High resolution mode gives 0…16000 only on 0–10V; 0–5V, 1–5V, 0–20mA and 4–20mA give 0…12000.",
  },
  {
    id: "q64ad-high-unipolar-12000",
    label: "Mitsubishi Q64AD · high res., 0–5V / 1–5V / 0–20mA / 4–20mA (0…12000)",
    vendor: "Mitsubishi",
    module: "MELSEC-Q Q64AD",
    rawMin: 0,
    rawMax: 12000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "q64ad-high-bipolar",
    label: "Mitsubishi Q64AD · high res., −10–10V (−16000…16000)",
    vendor: "Mitsubishi",
    module: "MELSEC-Q Q64AD",
    rawMin: -16000,
    rawMax: 16000,
    source: "spec/vendor-analog-ranges.md",
  },

  // Mitsubishi MELSEC-L L60AD4 — SH(NA)-080899ENG-F section 3.2 table (1).
  {
    id: "l60ad4-normal",
    label: "Mitsubishi L60AD4 · 0–10V / 0–5V / 1–5V / 0–20mA / 4–20mA (0…20000)",
    vendor: "Mitsubishi",
    module: "MELSEC-L L60AD4",
    rawMin: 0,
    rawMax: 20000,
    source: "spec/vendor-analog-ranges.md",
    note: "L60AD4 only. The 8-channel siblings L60ADVL8 and L60ADIL8 in the same manual use different endpoints.",
  },
  {
    id: "l60ad4-bipolar",
    label: "Mitsubishi L60AD4 · −10–10V (−20000…20000)",
    vendor: "Mitsubishi",
    module: "MELSEC-L L60AD4",
    rawMin: -20000,
    rawMax: 20000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "l60ad4-extended",
    label: "Mitsubishi L60AD4 · 1–5V / 4–20mA extended (−5000…22500)",
    vendor: "Mitsubishi",
    module: "MELSEC-L L60AD4",
    rawMin: -5000,
    rawMax: 22500,
    source: "spec/vendor-analog-ranges.md",
  },

  // Mitsubishi MELSEC iQ-F FX5U CPU built-in analogue — JY997D60501H chapter 7.
  {
    id: "fx5u-builtin-0-10v",
    label: "Mitsubishi FX5U CPU built-in · 0–10V (0…4000)",
    vendor: "Mitsubishi",
    module: "MELSEC iQ-F FX5U CPU built-in analogue",
    rawMin: 0,
    rawMax: 4000,
    source: "spec/vendor-analog-ranges.md",
    note: "The FX5U built-in analogue is 0–10V only (2 in, 1 out), unsigned 12-bit. It is not an FX5-4AD-ADP.",
  },

  // Allen-Bradley SLC 500 analogue INPUT — 1746-UM005B-EN-P integer representation.
  {
    id: "slc-ni4-4-20ma",
    label: "AB SLC 1746-NI4 · 4–20mA (3277…16384)",
    vendor: "Allen-Bradley",
    module: "SLC 500 1746-NI4 input",
    rawMin: 3277,
    rawMax: 16384,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "slc-ni4-0-20ma",
    label: "AB SLC 1746-NI4 · 0–20mA (0…16384)",
    vendor: "Allen-Bradley",
    module: "SLC 500 1746-NI4 input",
    rawMin: 0,
    rawMax: 16384,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "slc-ni4-0-10v",
    label: "AB SLC 1746-NI4 · 0–10V (0…32767)",
    vendor: "Allen-Bradley",
    module: "SLC 500 1746-NI4 input",
    rawMin: 0,
    rawMax: 32767,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "slc-ni4-bipolar",
    label: "AB SLC 1746-NI4 · −10–10V (−32768…32767)",
    vendor: "Allen-Bradley",
    module: "SLC 500 1746-NI4 input",
    rawMin: -32768,
    rawMax: 32767,
    source: "spec/vendor-analog-ranges.md",
  },

  // Allen-Bradley ControlLogix 1756-IF8 — 1756-UM009G-EN-P, integer mode only.
  // Floating point mode scales on the module, so no raw range exists there.
  // The counts sit on the EXTENDED signal endpoints, not on the nominal ones.
  {
    id: "clx-if8-int-bipolar-10v",
    label: "AB 1756-IF8 · integer, ±10V (−32768…32767 = −10.25…+10.25 V)",
    vendor: "Allen-Bradley",
    module: "ControlLogix 1756-IF8 / -IF16 (integer mode)",
    rawMin: -32768,
    rawMax: 32767,
    source: "spec/vendor-analog-ranges.md",
    note: "Integer mode only — floating point mode returns engineering units and has no raw range. −32768 = −10.25 V and 32767 = +10.25 V, not ±10 V: enter the engineering values for ±10.25 V.",
  },
  {
    id: "clx-if8-int-0-10v",
    label: "AB 1756-IF8 · integer, 0–10V (−32768…32767 = 0…10.25 V)",
    vendor: "Allen-Bradley",
    module: "ControlLogix 1756-IF8 / -IF16 (integer mode)",
    rawMin: -32768,
    rawMax: 32767,
    source: "spec/vendor-analog-ranges.md",
    note: "Integer mode only. −32768 = 0 V and 32767 = 10.25 V, so 0 V is the bottom count, not 0 counts.",
  },
  {
    id: "clx-if8-int-0-5v",
    label: "AB 1756-IF8 · integer, 0–5V (−32768…32767 = 0…5.125 V)",
    vendor: "Allen-Bradley",
    module: "ControlLogix 1756-IF8 / -IF16 (integer mode)",
    rawMin: -32768,
    rawMax: 32767,
    source: "spec/vendor-analog-ranges.md",
    note: "Integer mode only. −32768 = 0 V and 32767 = 5.125 V.",
  },
  {
    id: "clx-if8-int-0-20ma",
    label: "AB 1756-IF8 · integer, 0–20mA (−32768…32767 = 0…20.58 mA)",
    vendor: "Allen-Bradley",
    module: "ControlLogix 1756-IF8 / -IF16 (integer mode)",
    rawMin: -32768,
    rawMax: 32767,
    source: "spec/vendor-analog-ranges.md",
    note: "Integer mode only. −32768 = 0 mA and 32767 = 20.58 mA, not 20 mA. There is no separate 4–20 mA range on this module.",
  },

  // LS XGF-AD4S — output format is chosen per channel.
  {
    id: "xgf-ad4s-signed",
    label: "LS XGF-AD4S · Signed value (−32000…32000)",
    vendor: "LS ELECTRIC",
    module: "XGF-AD4S",
    rawMin: -32000,
    rawMax: 32000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "xgf-ad4s-percentile",
    label: "LS XGF-AD4S · Percentile value (0…10000)",
    vendor: "LS ELECTRIC",
    module: "XGF-AD4S",
    rawMin: 0,
    rawMax: 10000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "xgf-ad4s-precise-4-20ma",
    label: "LS XGF-AD4S · Precise, 4–20mA (4000…20000)",
    vendor: "LS ELECTRIC",
    module: "XGF-AD4S",
    rawMin: 4000,
    rawMax: 20000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "xgf-ad4s-precise-0-10v",
    label: "LS XGF-AD4S · Precise, 0–10V (0…10000)",
    vendor: "LS ELECTRIC",
    module: "XGF-AD4S",
    rawMin: 0,
    rawMax: 10000,
    source: "spec/vendor-analog-ranges.md",
  },

  // LS XGF-AD8A — XGT 8-channel, 14-bit. Four formats, and none of them match the
  // 16-bit XGF-AD4S above. Manual V1.8 (2025-02) Table 2.2.
  {
    id: "xgf-ad8a-unsigned",
    label: "LS XGF-AD8A · Unsigned value (0…16000)",
    vendor: "LS ELECTRIC",
    module: "XGF-AD8A",
    rawMin: 0,
    rawMax: 16000,
    source: "spec/vendor-analog-ranges.md",
    note: "14-bit module. Do not reuse XGF-AD4S values here — that module is 16-bit and its signed format is −32000…32000.",
  },
  {
    id: "xgf-ad8a-signed",
    label: "LS XGF-AD8A · Signed value (−8000…8000)",
    vendor: "LS ELECTRIC",
    module: "XGF-AD8A",
    rawMin: -8000,
    rawMax: 8000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "xgf-ad8a-percentile",
    label: "LS XGF-AD8A · Percentile value (0…10000)",
    vendor: "LS ELECTRIC",
    module: "XGF-AD8A",
    rawMin: 0,
    rawMax: 10000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "xgf-ad8a-precise-0-10v",
    label: "LS XGF-AD8A · Precise, 0–10V (0…10000)",
    vendor: "LS ELECTRIC",
    module: "XGF-AD8A",
    rawMin: 0,
    rawMax: 10000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "xgf-ad8a-precise-4-20ma",
    label: "LS XGF-AD8A · Precise, 4–20mA (4000…20000)",
    vendor: "LS ELECTRIC",
    module: "XGF-AD8A",
    rawMin: 4000,
    rawMax: 20000,
    source: "spec/vendor-analog-ranges.md",
  },

  // LS XBF-AD04A — XGB 4-channel, 12-bit. Manual V2.4 (2024-06) section 2.2.2.
  {
    id: "xbf-ad04a-unsigned",
    label: "LS XBF-AD04A · Unsigned value (0…4000)",
    vendor: "LS ELECTRIC",
    module: "XBF-AD04A",
    rawMin: 0,
    rawMax: 4000,
    source: "spec/vendor-analog-ranges.md",
    note: "12-bit module: 0–10V, 4–20mA and 0–20mA only. The manual's note 3 claims full scale is 16000 — that is a copy/paste error from the XGF-AD8A manual; the specification table says 4000.",
  },
  {
    id: "xbf-ad04a-signed",
    label: "LS XBF-AD04A · Signed value (−2000…2000)",
    vendor: "LS ELECTRIC",
    module: "XBF-AD04A",
    rawMin: -2000,
    rawMax: 2000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "xbf-ad04a-percentile",
    label: "LS XBF-AD04A · Percentile value (0…1000)",
    vendor: "LS ELECTRIC",
    module: "XBF-AD04A",
    rawMin: 0,
    rawMax: 1000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "xbf-ad04a-precise-0-10v",
    label: "LS XBF-AD04A · Precise, 0–10V (0…1000)",
    vendor: "LS ELECTRIC",
    module: "XBF-AD04A",
    rawMin: 0,
    rawMax: 1000,
    source: "spec/vendor-analog-ranges.md",
  },
  {
    id: "xbf-ad04a-precise-4-20ma",
    label: "LS XBF-AD04A · Precise, 4–20mA (400…2000)",
    vendor: "LS ELECTRIC",
    module: "XBF-AD04A",
    rawMin: 400,
    rawMax: 2000,
    source: "spec/vendor-analog-ranges.md",
  },
];

// ---------------------------------------------------------------------------
// ADC — convention: ratio = count / (2^N − 1)  (full-scale = all-ones code).
// The tool page states this convention explicitly (DESIGN §2).
// ---------------------------------------------------------------------------
export interface AdcResult {
  voltage: number;
  /** Size of one LSB in volts: vref / (2^N − 1). */
  lsb: number;
  ratio: number;
}

export function adcToVoltage(count: number, bits: number, vref: number): AdcResult {
  const maxCode = Math.pow(2, bits) - 1;
  const ratio = count / maxCode;
  return { voltage: ratio * vref, lsb: vref / maxCode, ratio };
}

export function voltageToAdc(voltage: number, bits: number, vref: number): number {
  const maxCode = Math.pow(2, bits) - 1;
  const code = Math.round((voltage / vref) * maxCode);
  return Math.min(maxCode, Math.max(0, code));
}
