// Analog/instrumentation math: two-point calibration, 4-20 mA loop voltage
// budget, sine-wave level conversions, dB / dBm. Pure TS, no DOM.

// ---------------------------------------------------------------------------
// Two-point calibration: fit y = slope·x + offset through two reference points
// ---------------------------------------------------------------------------
export interface TwoPointCal {
  slope: number;
  offset: number;
}

export function twoPointCal(x1: number, y1: number, x2: number, y2: number): TwoPointCal | null {
  if (x1 === x2) return null;
  const slope = (y2 - y1) / (x2 - x1);
  return { slope, offset: y1 - slope * x1 };
}

export function applyCal(c: TwoPointCal, x: number): number {
  return c.slope * x + c.offset;
}

export function invertCal(c: TwoPointCal, y: number): number | null {
  if (c.slope === 0) return null;
  return (y - c.offset) / c.slope;
}

// ---------------------------------------------------------------------------
// 4-20 mA loop voltage budget (Ohm's law over the series loop)
// ---------------------------------------------------------------------------
export interface LoopBudgetInput {
  /** Loop supply voltage in volts. */
  supply: number;
  /** Minimum operating (lift-off) voltage of the transmitter, from its datasheet. */
  minTransmitterV: number;
  /** Total series resistance: sense resistor + wire + barriers, in ohms. */
  loopResistance: number;
  /** Worst-case loop current in amps (default 0.02 = 20 mA full scale). */
  current?: number;
}

export interface LoopBudgetResult {
  /** Voltage dropped across the series resistance at the given current. */
  vDrop: number;
  /** Voltage left for the transmitter. */
  vAtTransmitter: number;
  /** vAtTransmitter − minTransmitterV (negative = loop will fail at full scale). */
  margin: number;
  /** Maximum series resistance the budget allows. */
  maxResistance: number;
  ok: boolean;
}

export function loopBudget({
  supply,
  minTransmitterV,
  loopResistance,
  current = 0.02,
}: LoopBudgetInput): LoopBudgetResult {
  const vDrop = current * loopResistance;
  const vAtTransmitter = supply - vDrop;
  const margin = vAtTransmitter - minTransmitterV;
  return {
    vDrop,
    vAtTransmitter,
    margin,
    maxResistance: (supply - minTransmitterV) / current,
    ok: margin >= 0,
  };
}

// ---------------------------------------------------------------------------
// Sine-wave level conversions (pure sinusoid, zero DC offset)
// ---------------------------------------------------------------------------
export interface SineLevels {
  rms: number;
  peak: number;
  peakToPeak: number;
  /** Rectified average = 2·peak/π. */
  avgRectified: number;
}

export function sineLevels(kind: "rms" | "peak" | "pp", value: number): SineLevels {
  const peak =
    kind === "rms" ? value * Math.SQRT2 : kind === "peak" ? value : value / 2;
  return {
    rms: peak / Math.SQRT2,
    peak,
    peakToPeak: 2 * peak,
    avgRectified: (2 * peak) / Math.PI,
  };
}

// ---------------------------------------------------------------------------
// dB / dBm
// ---------------------------------------------------------------------------
export const dbFromPowerRatio = (r: number): number => 10 * Math.log10(r);
export const powerRatioFromDb = (db: number): number => Math.pow(10, db / 10);
export const dbFromVoltageRatio = (r: number): number => 20 * Math.log10(r);
export const voltageRatioFromDb = (db: number): number => Math.pow(10, db / 20);

/** dBm ↔ watts (reference 1 mW). */
export const wattsFromDbm = (dbm: number): number => 1e-3 * Math.pow(10, dbm / 10);
export const dbmFromWatts = (w: number): number => 10 * Math.log10(w / 1e-3);

/** RMS voltage of a power P across impedance R: V = √(P·R). */
export const vrmsFromPower = (watts: number, ohms: number): number => Math.sqrt(watts * ohms);
