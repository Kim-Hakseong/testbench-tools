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
// may appear here (CLAUDE.md §5-3 vendor-constant gate).
// AB / Mitsubishi / LS: [미정] — not in spec/, must not be implemented.
// ---------------------------------------------------------------------------
export interface AnalogPreset {
  id: string;
  label: string;
  rawMin: number;
  rawMax: number;
  /** Provenance inside this repo. */
  source: string;
}

export const ANALOG_PRESETS: AnalogPreset[] = [
  {
    id: "s7",
    label: "Siemens S7 (0…27648)",
    rawMin: 0,
    rawMax: 27648,
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
