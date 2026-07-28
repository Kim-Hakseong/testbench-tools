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
