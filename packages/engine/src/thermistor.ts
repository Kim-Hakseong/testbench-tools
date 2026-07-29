// NTC thermistor resistance ↔ temperature.
//
// Two models, and the gap between them is the whole point of this module:
//
//   Beta (B-parameter)   1/T = 1/T0 + (1/B)·ln(R/R0)
//       Two constants and one anchor point. Exact at T0 and at whichever
//       second temperature B was measured at, and wrong everywhere else —
//       by degrees, not millidegrees, once you are 40 K away from the anchor.
//       B is *not* a property of the part on its own: it is defined between
//       two temperatures, so B25/85 and B25/125 are different numbers for the
//       same thermistor. This module never invents that pair; callers state it.
//
//   Steinhart-Hart       1/T = A + B·ln(R) + C·ln(R)³
//       Three constants, no anchor. Fitted through three (R, T) points it
//       tracks a real NTC to a few hundredths of a degree over a 190 K span.
//       The R → T direction is direct. The T → R direction is a cubic in
//       ln R and is solved in closed form here (Cardano), not iterated.
//
// Everything is in kelvin internally; every public function takes and returns
// °C, because that is what datasheets and instruments show. T(K) = T(°C) +
// 273.15 — the only place the two ever meet is `toKelvin` below.
//
// No coefficient in this file is a manufacturer constant except the one
// reference curve at the bottom, whose provenance is recorded in
// `spec/ntc-thermistor.md`. Curves without a spec entry must not be added.

/** 0 K expressed in °C. T(K) = T(°C) + 273.15 exactly (ITS-90 definition). */
export const ABSOLUTE_ZERO_C = -273.15;

/** A measured point on a thermistor's R/T curve. */
export interface NtcPoint {
  /** Resistance in ohms. Must be > 0. */
  ohms: number;
  /** Temperature in °C. Must be above absolute zero. */
  celsius: number;
}

export type NtcOhmsResult = { ok: true; ohms: number } | { ok: false; error: string };

export type NtcCelsiusResult = { ok: true; celsius: number } | { ok: false; error: string };

function toKelvin(celsius: number): number {
  return celsius - ABSOLUTE_ZERO_C;
}

function toCelsius(kelvin: number): number {
  return kelvin + ABSOLUTE_ZERO_C;
}

/** Guard shared by every entry point: a usable temperature in °C. */
function checkCelsius(celsius: number, what: string): string | null {
  if (!Number.isFinite(celsius)) return `Enter ${what} in °C`;
  if (celsius <= ABSOLUTE_ZERO_C) {
    return `${what} must be above absolute zero (${ABSOLUTE_ZERO_C} °C)`;
  }
  return null;
}

/** Guard shared by every entry point: a usable resistance in ohms. */
function checkOhms(ohms: number, what: string): string | null {
  if (!Number.isFinite(ohms)) return `Enter ${what} in ohms`;
  if (ohms <= 0) return `${what} must be greater than 0 Ω`;
  return null;
}

// ---------------------------------------------------------------------------
// Beta (B-parameter) equation
// ---------------------------------------------------------------------------

/**
 * The three numbers the Beta equation needs.
 *
 * `betaLowC`/`betaHighC` are the pair B was measured between. They do not
 * enter the equation — they are carried so a result can say *which* B it
 * used, because B25/85 ≠ B25/50 and a bare "B = 3435 K" is ambiguous.
 */
export interface NtcBetaParams {
  /** Resistance at the anchor temperature, in ohms. Usually 10 kΩ. */
  r0Ohms: number;
  /** Anchor temperature in °C. Usually 25 °C. */
  t0C: number;
  /** B in kelvin. */
  beta: number;
  /** Lower temperature of the pair B is quoted between, in °C. */
  betaLowC?: number;
  /** Upper temperature of the pair B is quoted between, in °C. */
  betaHighC?: number;
}

function checkBetaParams(p: NtcBetaParams): string | null {
  const r0 = checkOhms(p.r0Ohms, "R0");
  if (r0) return r0;
  const t0 = checkCelsius(p.t0C, "T0");
  if (t0) return t0;
  if (!Number.isFinite(p.beta)) return "Enter B in kelvin";
  if (p.beta <= 0) return "B must be greater than 0 K for an NTC thermistor";
  return null;
}

/**
 * How B is written when the pair is known: "B25/85". Falls back to plain "B"
 * rather than guessing a pair.
 */
export function ntcBetaLabel(p: Pick<NtcBetaParams, "betaLowC" | "betaHighC">): string {
  const { betaLowC: lo, betaHighC: hi } = p;
  if (!Number.isFinite(lo as number) || !Number.isFinite(hi as number)) return "B";
  return `B${trimNumber(lo as number)}/${trimNumber(hi as number)}`;
}

function trimNumber(v: number): string {
  return Number(v.toFixed(4)).toString();
}

/** R(T) from the Beta equation: R = R0·exp(B·(1/T − 1/T0)), T in kelvin. */
export function ntcBetaResistance(p: NtcBetaParams, celsius: number): NtcOhmsResult {
  const bad = checkBetaParams(p) ?? checkCelsius(celsius, "temperature");
  if (bad) return { ok: false, error: bad };
  const ohms = p.r0Ohms * Math.exp(p.beta * (1 / toKelvin(celsius) - 1 / toKelvin(p.t0C)));
  if (!Number.isFinite(ohms) || ohms <= 0) {
    return { ok: false, error: "Resistance overflowed — check B, R0 and the temperature" };
  }
  return { ok: true, ohms };
}

/** T(R) from the Beta equation: 1/T = 1/T0 + ln(R/R0)/B, T in kelvin. */
export function ntcBetaTemperature(p: NtcBetaParams, ohms: number): NtcCelsiusResult {
  const bad = checkBetaParams(p) ?? checkOhms(ohms, "resistance");
  if (bad) return { ok: false, error: bad };
  const inverseK = 1 / toKelvin(p.t0C) + Math.log(ohms / p.r0Ohms) / p.beta;
  if (!(inverseK > 0)) {
    return {
      ok: false,
      error: "That resistance puts the Beta equation at or below absolute zero — check R0, T0 and B",
    };
  }
  return { ok: true, celsius: toCelsius(1 / inverseK) };
}

export type NtcBetaFitResult =
  | { ok: true; beta: number; lowC: number; highC: number; label: string }
  | { ok: false; error: string };

/**
 * B from two measured points: B = ln(R1/R2) / (1/T1 − 1/T2), T in kelvin.
 *
 * This is the definition manufacturers use, which is why the answer depends on
 * which two temperatures you pick. Feeding the same thermistor's 25/50 pair and
 * its 25/125 pair returns two different numbers, and both are correct.
 */
export function ntcBetaFromTwoPoints(a: NtcPoint, b: NtcPoint): NtcBetaFitResult {
  const bad =
    checkOhms(a.ohms, "the first resistance") ??
    checkOhms(b.ohms, "the second resistance") ??
    checkCelsius(a.celsius, "the first temperature") ??
    checkCelsius(b.celsius, "the second temperature");
  if (bad) return { ok: false, error: bad };
  const ka = toKelvin(a.celsius);
  const kb = toKelvin(b.celsius);
  if (ka === kb) {
    return { ok: false, error: "B needs two different temperatures — both points are at the same one" };
  }
  if (a.ohms === b.ohms) {
    return { ok: false, error: "Both points have the same resistance, so B would be 0 K" };
  }
  const beta = Math.log(a.ohms / b.ohms) / (1 / ka - 1 / kb);
  if (!Number.isFinite(beta)) return { ok: false, error: "B is not finite for those two points" };
  const lowC = Math.min(a.celsius, b.celsius);
  const highC = Math.max(a.celsius, b.celsius);
  return { ok: true, beta, lowC, highC, label: ntcBetaLabel({ betaLowC: lowC, betaHighC: highC }) };
}

// ---------------------------------------------------------------------------
// Steinhart-Hart equation
// ---------------------------------------------------------------------------

/** A, B and C of 1/T = A + B·ln(R) + C·ln(R)³, T in kelvin, R in ohms. */
export interface SteinhartHartCoefficients {
  a: number;
  b: number;
  c: number;
}

function checkCoefficients(co: SteinhartHartCoefficients): string | null {
  for (const [name, v] of [
    ["A", co.a],
    ["B", co.b],
    ["C", co.c],
  ] as const) {
    if (!Number.isFinite(v)) return `Coefficient ${name} is not a number`;
  }
  if (co.a === 0 && co.b === 0 && co.c === 0) return "All three coefficients are zero";
  return null;
}

/** T(R), direct: 1/T = A + B·ln R + C·(ln R)³. */
export function ntcSteinhartTemperature(
  co: SteinhartHartCoefficients,
  ohms: number,
): NtcCelsiusResult {
  const bad = checkCoefficients(co) ?? checkOhms(ohms, "resistance");
  if (bad) return { ok: false, error: bad };
  const l = Math.log(ohms);
  const inverseK = co.a + co.b * l + co.c * l * l * l;
  if (!(inverseK > 0)) {
    return {
      ok: false,
      error: "These coefficients put that resistance at or below absolute zero — check A, B and C",
    };
  }
  return { ok: true, celsius: toCelsius(1 / inverseK) };
}

/**
 * R(T), closed form. With x = ln R the equation is a depressed cubic
 *
 *     C·x³ + B·x + (A − 1/T) = 0
 *
 * whose Cardano solution, written the way it is usually quoted for
 * thermistors, is
 *
 *     y = (A − 1/T) / (2C)
 *     z = √( (B/3C)³ + y² )
 *     R = exp( ∛(z − y) − ∛(z + y) )
 *
 * Iterating instead of solving is common and unnecessary: this is exact to
 * within floating point, and it cannot fail to converge on a bad guess.
 *
 * The discriminant under the root is negative only when B and C have opposite
 * signs — then the cubic has three real roots, several resistances give the
 * same temperature, and there is no single answer to return. That is refused
 * rather than silently picking a branch.
 */
export function ntcSteinhartResistance(
  co: SteinhartHartCoefficients,
  celsius: number,
): NtcOhmsResult {
  const bad = checkCoefficients(co) ?? checkCelsius(celsius, "temperature");
  if (bad) return { ok: false, error: bad };
  const inverseK = 1 / toKelvin(celsius);

  if (co.c === 0) {
    // Degenerates to the two-constant form, which is still invertible.
    if (co.b === 0) return { ok: false, error: "With B = 0 and C = 0 the equation has no inverse" };
    const ohms = Math.exp((inverseK - co.a) / co.b);
    return Number.isFinite(ohms) && ohms > 0
      ? { ok: true, ohms }
      : { ok: false, error: "Resistance overflowed — check A, B and C" };
  }

  const y = (co.a - inverseK) / (2 * co.c);
  const p = co.b / (3 * co.c);
  const discriminant = p * p * p + y * y;
  if (discriminant < 0) {
    return {
      ok: false,
      error:
        "These coefficients are not monotonic here — more than one resistance gives that temperature, so there is no single answer",
    };
  }
  const z = Math.sqrt(discriminant);
  const ohms = Math.exp(Math.cbrt(z - y) - Math.cbrt(z + y));
  if (!Number.isFinite(ohms) || ohms <= 0) {
    return { ok: false, error: "Resistance overflowed — check A, B and C" };
  }
  return { ok: true, ohms };
}

// ---------------------------------------------------------------------------
// Fitting A, B and C from three points
// ---------------------------------------------------------------------------

export type NtcFitResult =
  | {
      ok: true;
      coefficients: SteinhartHartCoefficients;
      /** Worst |T_fit − T_given| over the three input points, in °C. */
      maxResidualC: number;
    }
  | { ok: false; error: string };

/** 3×3 solve, Gaussian elimination with partial pivoting. Null if singular. */
function solve3(m: number[][], v: number[]): number[] | null {
  const a = m.map((row, i) => [...row, v[i]!]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r;
    }
    if (!Number.isFinite(a[pivot]![col]!) || a[pivot]![col] === 0) return null;
    [a[col], a[pivot]] = [a[pivot]!, a[col]!];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = a[r]![col]! / a[col]![col]!;
      for (let k = col; k < 4; k++) a[r]![k]! -= f * a[col]![k]!;
    }
  }
  const out = [a[0]![3]! / a[0]![0]!, a[1]![3]! / a[1]![1]!, a[2]![3]! / a[2]![2]!];
  return out.every((x) => Number.isFinite(x)) ? out : null;
}

/**
 * A, B and C from three (R, T) points — the reason this tool exists, because
 * datasheets publish an R/T table and almost never publish A, B and C.
 *
 * The system is linear in the coefficients once you substitute x = ln R:
 *
 *     [ 1  x1  x1³ ] [A]   [1/T1]
 *     [ 1  x2  x2³ ] [B] = [1/T2]
 *     [ 1  x3  x3³ ] [C]   [1/T3]
 *
 * so it is solved, not optimised — three points, three unknowns, and the fit
 * passes exactly through all three. Choose them spread across the range you
 * care about; three points 10 K apart will fit each other perfectly and say
 * nothing about the rest of the curve.
 *
 * Duplicate temperatures or duplicate resistances are refused: the matrix is
 * singular or the answer is meaningless, and NaN coefficients that only fail
 * later are worse than a refusal here.
 */
export function ntcFitSteinhartHart(points: readonly NtcPoint[]): NtcFitResult {
  if (points.length !== 3) {
    return { ok: false, error: `Fitting A, B and C needs exactly 3 points — got ${points.length}` };
  }
  for (let i = 0; i < 3; i++) {
    const bad =
      checkOhms(points[i]!.ohms, `resistance ${i + 1}`) ??
      checkCelsius(points[i]!.celsius, `temperature ${i + 1}`);
    if (bad) return { ok: false, error: bad };
  }
  // Separation thresholds, not equality tests. Two points a nanokelvin apart
  // are not two points: the solve is dominated by rounding and returns wild
  // coefficients that still reproduce their own inputs, so a residual check
  // alone would pass them. Any real measurement clears these by orders of
  // magnitude — 1 µ°C and 1 part in 10⁹ of resistance.
  const MIN_SEPARATION_C = 1e-6;
  const MIN_LN_OHMS_SEPARATION = 1e-9;
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      if (Math.abs(points[i]!.celsius - points[j]!.celsius) < MIN_SEPARATION_C) {
        return {
          ok: false,
          error: `Points ${i + 1} and ${j + 1} are at the same temperature — three different temperatures are required`,
        };
      }
      if (
        Math.abs(Math.log(points[i]!.ohms) - Math.log(points[j]!.ohms)) < MIN_LN_OHMS_SEPARATION
      ) {
        return {
          ok: false,
          error: `Points ${i + 1} and ${j + 1} have the same resistance — three different resistances are required`,
        };
      }
    }
  }

  const m = points.map((pt) => {
    const l = Math.log(pt.ohms);
    return [1, l, l * l * l];
  });
  const rhs = points.map((pt) => 1 / toKelvin(pt.celsius));
  const solved = solve3(m, rhs);
  if (!solved) {
    return { ok: false, error: "Those three points are too close together to fit A, B and C" };
  }
  const coefficients: SteinhartHartCoefficients = {
    a: solved[0]!,
    b: solved[1]!,
    c: solved[2]!,
  };

  // A fit that does not reproduce its own inputs is not a fit. Near-duplicate
  // points survive the equality checks above but blow up here.
  let maxResidualC = 0;
  for (const pt of points) {
    const back = ntcSteinhartTemperature(coefficients, pt.ohms);
    if (!back.ok) return { ok: false, error: `Fit failed to reproduce its own points: ${back.error}` };
    maxResidualC = Math.max(maxResidualC, Math.abs(back.celsius - pt.celsius));
  }
  if (maxResidualC > 1e-6) {
    return {
      ok: false,
      error: `Ill-conditioned fit — it misses its own input points by ${maxResidualC.toFixed(4)} °C. Spread the three points further apart.`,
    };
  }
  return { ok: true, coefficients, maxResidualC };
}

// ---------------------------------------------------------------------------
// Model comparison — what the Beta equation costs you
// ---------------------------------------------------------------------------

export interface NtcDeviationRow {
  /** Temperature the row is evaluated at, in °C. */
  celsius: number;
  /** Resistance the Steinhart-Hart curve gives there, in ohms. */
  ohms: number;
  /** Temperature the Beta equation reports for that same resistance, in °C. */
  betaCelsius: number;
  /** betaCelsius − celsius, in °C. Positive means the Beta equation reads high. */
  deviationC: number;
}

export type NtcDeviationResult =
  | {
      ok: true;
      rows: NtcDeviationRow[];
      /** Largest |deviationC| in the sweep, in °C. */
      maxAbsDeviationC: number;
      /** Temperature where that worst case occurs, in °C. */
      worstCelsius: number;
    }
  | { ok: false; error: string };

/**
 * How far apart the two models are, in degrees, across a sweep.
 *
 * Steinhart-Hart is treated as the reference and the Beta equation as the
 * approximation, which is the honest ordering when A, B and C were fitted to
 * the same datasheet the B value came from. At each temperature: take the
 * resistance the fitted curve gives, then ask what the Beta equation would
 * have called that resistance. The difference is the error a Beta-only
 * firmware would ship with — near zero at the anchor point, and growing to
 * whole degrees at the ends of the range.
 */
export function ntcModelDeviation(
  beta: NtcBetaParams,
  coefficients: SteinhartHartCoefficients,
  temperaturesC: readonly number[],
): NtcDeviationResult {
  if (temperaturesC.length === 0) return { ok: false, error: "No temperatures to compare" };
  const rows: NtcDeviationRow[] = [];
  let maxAbsDeviationC = 0;
  let worstCelsius = temperaturesC[0]!;
  for (const celsius of temperaturesC) {
    const r = ntcSteinhartResistance(coefficients, celsius);
    if (!r.ok) return { ok: false, error: r.error };
    const back = ntcBetaTemperature(beta, r.ohms);
    if (!back.ok) return { ok: false, error: back.error };
    const deviationC = back.celsius - celsius;
    rows.push({ celsius, ohms: r.ohms, betaCelsius: back.celsius, deviationC });
    if (Math.abs(deviationC) > maxAbsDeviationC) {
      maxAbsDeviationC = Math.abs(deviationC);
      worstCelsius = celsius;
    }
  }
  return { ok: true, rows, maxAbsDeviationC, worstCelsius };
}

/** `count` temperatures from `fromC` to `toC` inclusive, for a deviation sweep. */
export function ntcSweepTemperatures(fromC: number, toC: number, count: number): number[] {
  if (!Number.isFinite(fromC) || !Number.isFinite(toC) || count < 2) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(fromC + ((toC - fromC) * i) / (count - 1));
  return out;
}

// ---------------------------------------------------------------------------
// Optional: voltage divider readout
// ---------------------------------------------------------------------------

/**
 * Which leg the thermistor is in.
 * - `pulldown`: series resistor to the supply, thermistor to ground, output
 *   taken across the thermistor. An NTC's resistance falls as it heats, so
 *   this output falls with temperature.
 * - `pullup`: thermistor to the supply, series resistor to ground, output
 *   taken across the series resistor. This output rises with temperature.
 */
export type NtcDividerTopology = "pulldown" | "pullup";

export interface NtcDividerInput {
  ohms: number;
  seriesOhms: number;
  supplyVolts: number;
  topology: NtcDividerTopology;
  /** ADC resolution in bits. Omit to skip the count. */
  adcBits?: number;
  /** ADC full-scale reference in volts. Defaults to the supply (ratiometric). */
  adcRefVolts?: number;
}

export type NtcDividerResult =
  | {
      ok: true;
      volts: number;
      /** volts / supplyVolts. */
      ratio: number;
      /** Rounded and clamped ADC code, if bits were given. */
      counts?: number;
      /** Full-scale code 2^bits − 1, if bits were given. */
      fullScaleCounts?: number;
    }
  | { ok: false; error: string };

/**
 * Divider output for a given thermistor resistance.
 *
 * ADC codes follow the same convention as the rest of the engine:
 * ratio = count / (2^N − 1), i.e. full scale is the all-ones code. Default
 * reference is the supply itself, which is the ratiometric arrangement where
 * supply error cancels.
 */
export function ntcDividerReading(input: NtcDividerInput): NtcDividerResult {
  const bad =
    checkOhms(input.ohms, "thermistor resistance") ?? checkOhms(input.seriesOhms, "series resistor");
  if (bad) return { ok: false, error: bad };
  if (!Number.isFinite(input.supplyVolts) || input.supplyVolts <= 0) {
    return { ok: false, error: "Supply voltage must be greater than 0 V" };
  }
  const total = input.ohms + input.seriesOhms;
  const across = input.topology === "pulldown" ? input.ohms : input.seriesOhms;
  const volts = (input.supplyVolts * across) / total;
  const out: Extract<NtcDividerResult, { ok: true }> = {
    ok: true,
    volts,
    ratio: volts / input.supplyVolts,
  };
  if (input.adcBits !== undefined) {
    if (!Number.isInteger(input.adcBits) || input.adcBits < 1 || input.adcBits > 32) {
      return { ok: false, error: "ADC resolution must be a whole number of bits from 1 to 32" };
    }
    const ref = input.adcRefVolts ?? input.supplyVolts;
    if (!Number.isFinite(ref) || ref <= 0) {
      return { ok: false, error: "ADC reference must be greater than 0 V" };
    }
    const fullScaleCounts = Math.pow(2, input.adcBits) - 1;
    out.fullScaleCounts = fullScaleCounts;
    out.counts = Math.min(fullScaleCounts, Math.max(0, Math.round((volts / ref) * fullScaleCounts)));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reference curve
//
// One curve only, transcribed from a datasheet whose document number, revision
// and URL are recorded in `spec/ntc-thermistor.md` (CLAUDE.md §5-3). It exists
// so the fit can be demonstrated and checked against points it was not fitted
// to. Adding a curve without a spec entry is not allowed.
// ---------------------------------------------------------------------------

export interface NtcReferenceCurve {
  id: string;
  label: string;
  /** Resistance at 25 °C, in ohms, as the datasheet states it. */
  r25Ohms: number;
  /** B25/85 in kelvin, as the datasheet states it. */
  beta2585: number;
  /** Document, revision and URL — must match `spec/ntc-thermistor.md`. */
  source: string;
  /** [°C, Ω] rows exactly as printed. */
  table: readonly (readonly [number, number])[];
  /** Three temperatures from the table that span it well, for the fit. */
  suggestedFitC: readonly [number, number, number];
}

const NTCLE100E3103: NtcReferenceCurve = {
  id: "ntcle100e3103",
  label: "Vishay NTCLE100E3103 — 10 kΩ, B25/85 3977 K",
  r25Ohms: 10000,
  beta2585: 3977,
  source:
    "Vishay BCcomponents NTCLE100E3 datasheet, document 29049, revision 07-May-2025 — resistance values at intermediate temperatures, NTCLE100E3103*** column",
  suggestedFitC: [-40, 25, 125],
  table: [
    [-40, 332094],
    [-35, 239900],
    [-30, 175200],
    [-25, 129287],
    [-20, 96358],
    [-15, 72500],
    [-10, 55046],
    [-5, 42157],
    [0, 32554],
    [5, 25339],
    [10, 19872],
    [15, 15698],
    [20, 12488],
    [25, 10000],
    [30, 8059],
    [35, 6535],
    [40, 5330],
    [45, 4372],
    [50, 3605],
    [55, 2989],
    [60, 2490],
    [65, 2084],
    [70, 1753],
    [75, 1481],
    [80, 1256],
    [85, 1070],
    [90, 915.4],
    [95, 786.0],
    [100, 677.3],
    [105, 585.7],
    [110, 508.3],
    [115, 442.6],
    [120, 386.6],
    [125, 338.7],
    [130, 297.7],
    [135, 262.4],
    [140, 231.9],
    [145, 205.5],
    [150, 182.6],
  ],
};

export const NTC_REFERENCE_CURVES: readonly NtcReferenceCurve[] = [NTCLE100E3103];

export type NtcCurveCheckResult =
  | {
      ok: true;
      /** Rows compared. */
      count: number;
      /** Worst |T_model − T_table| in °C. */
      maxAbsC: number;
      /** Table temperature where that happens, in °C. */
      worstCelsius: number;
      /** Root-mean-square residual in °C. */
      rmsC: number;
    }
  | { ok: false; error: string };

/**
 * Check a coefficient set against every row of a published table — including
 * the rows it was fitted to and, more usefully, the ones it was not. A fit
 * that reproduces its own three points and nothing else shows up immediately.
 */
export function ntcCheckAgainstTable(
  coefficients: SteinhartHartCoefficients,
  table: readonly (readonly [number, number])[],
): NtcCurveCheckResult {
  if (table.length === 0) return { ok: false, error: "Table is empty" };
  let maxAbsC = 0;
  let worstCelsius = table[0]![0];
  let sumSquares = 0;
  for (const [celsius, ohms] of table) {
    const got = ntcSteinhartTemperature(coefficients, ohms);
    if (!got.ok) return { ok: false, error: got.error };
    const residual = got.celsius - celsius;
    sumSquares += residual * residual;
    if (Math.abs(residual) > maxAbsC) {
      maxAbsC = Math.abs(residual);
      worstCelsius = celsius;
    }
  }
  return {
    ok: true,
    count: table.length,
    maxAbsC,
    worstCelsius,
    rmsC: Math.sqrt(sumSquares / table.length),
  };
}
