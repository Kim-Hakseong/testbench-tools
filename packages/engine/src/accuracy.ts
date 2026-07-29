// Instrument accuracy specifications → absolute measurement uncertainty.
//
// Bench and handheld instruments publish accuracy as a *sum of terms*, not as
// a single percentage:
//
//   ±(0.0035 % of reading + 0.0005 % of range)     typical bench DMM
//   ±(0.05 % + 3 counts)                           typical handheld DMM
//   ±(0.1 % of reading + 2 digits)                 same thing, different word
//   ±(35 ppm of reading + 5 ppm of range)          calibrator / 8½-digit style
//
// Turning that into "what is my actual error at 4.7 V on the 10 V range" is
// arithmetic, but it is arithmetic people get wrong in a specific way: they
// read the first term, call it the accuracy, and ignore the second. The second
// term does not shrink when the reading does. Measure 0.1 V on a 10 V range and
// the "% of range" term is the whole error budget, while the headline "0.0035 %"
// is off by more than an order of magnitude.
//
// So this module's real output is the *breakdown* — how many absolute units
// each published term contributed — plus the reading at which the terms cross
// over. Those two numbers are what tell someone they are on the wrong range.
//
// Nothing here is vendor data. The module implements the arithmetic that the
// specification's own wording defines; the numbers come from whatever the user
// types in. Instrument presets, if any are ever added, are gated by
// `spec/instrument-accuracy.md` (CLAUDE.md §5-3).
//
// ---------------------------------------------------------------------------
// Why the terms are summed and not root-sum-squared
// ---------------------------------------------------------------------------
// A published accuracy specification is a *limit of error*: the manufacturer
// asserts the instrument stays inside the stated band over the stated interval
// and temperature window. The terms of one such expression are not independent
// random contributions with their own distributions — they are two pieces of
// one guaranteed bound, and the bound is the arithmetic sum. RSS is the right
// tool one level up, when you combine several *independent* uncertainty
// sources into a budget (GUM). Applying RSS inside a single vendor expression
// quietly shrinks the manufacturer's own guarantee, so this module never does
// it. `rssCombine` is provided separately for the budget case, clearly labelled.

/**
 * One published accuracy term, as the manufacturer writes it.
 *
 * Every field is optional: real specifications use two or three of them, and
 * which two depends on the instrument class. All values are magnitudes — a
 * negative entry is refused rather than silently taken as absolute, because a
 * minus sign in a spec field almost always means the user typed the wrong box.
 */
export interface AccuracySpec {
  /** "% of reading", "% rdg", "% of measured value". */
  percentOfReading?: number;
  /** "ppm of reading" — the same term at calibrator scale. 1 ppm = 1e-4 %. */
  ppmOfReading?: number;
  /** "% of range", "% of full scale", "% FS". Independent of the reading. */
  percentOfRange?: number;
  /** "ppm of range". */
  ppmOfRange?: number;
  /**
   * "counts", "digits", "LSD", "d" — a number of least-significant display
   * steps. Needs a count size, see `CountBasis`.
   */
  counts?: number;
  /** A fixed floor in the measured unit, e.g. "+ 2 mV". Rare but real. */
  offset?: number;
}

/**
 * How big one display count is, in the measured unit.
 *
 * Handheld specifications quote counts without ever saying what a count is
 * worth — it depends on the range and on the meter's display. Three ways to
 * pin it down, in decreasing order of how sure the user can be:
 *
 *   resolution      the user read the step straight off the display (0.001 V)
 *   countsFullScale the meter's rated count (6000, 20 000, 199 999)
 *   digits          "5½ digits", meaning n full digits plus a leading half one
 *
 * `digits` is the loosest of the three. n½ digits means the display carries n
 * digits that run 0-9 plus one leading digit limited to 0 or 1, so it resolves
 * the nominal range into 10^n steps and can over-range to 2·10^n − 1 counts
 * before it has to switch range. This module reads the *nominal* range: a 5½
 * digit meter on its 10 V range steps by 10 V / 10^5 = 100 µV, and would show
 * up to 19.9999 V if pushed. Enter 10 for the range, not 19.9999.
 */
export type CountBasis =
  | { kind: "resolution"; resolution: number }
  | { kind: "countsFullScale"; countsFullScale: number }
  | { kind: "digits"; digits: number };

/** Which published term a breakdown row came from. */
export type AccuracyTermId = "reading" | "range" | "counts" | "offset";

export interface AccuracyTerm {
  id: AccuracyTermId;
  /** How the specification words this term, e.g. "0.0035 % of reading". */
  label: string;
  /** This term's contribution in the measured unit. Always ≥ 0. */
  value: number;
  /** Share of the total, 0…1. Zero total gives 0 rather than NaN. */
  fraction: number;
  /** True for terms that do not change when the reading changes. */
  fixed: boolean;
}

export interface AccuracyResult {
  ok: true;
  reading: number;
  range: number;
  /** Total ± uncertainty in the measured unit. */
  uncertainty: number;
  /** reading − uncertainty. */
  min: number;
  /** reading + uncertainty. */
  max: number;
  /**
   * uncertainty as a percentage of |reading|, or null at reading = 0 where the
   * ratio does not exist. This is the number that blows up on the wrong range.
   */
  percentOfReading: number | null;
  /** The same figure in ppm, or null at reading = 0. */
  ppmOfReading: number | null;
  /** uncertainty as a percentage of |range| — always defined. */
  percentOfRange: number;
  /** Every non-zero published term, largest contribution first. */
  terms: AccuracyTerm[];
  /** The largest term, or null when the spec contributes nothing. */
  dominant: AccuracyTerm | null;
  /** Sum of the reading-proportional terms, in the measured unit. */
  readingTermTotal: number;
  /** Sum of the range, counts and offset terms — the part that does not shrink. */
  fixedTermTotal: number;
  /**
   * True when the fixed part is the larger half of the budget. The classic
   * small-value-on-a-large-range mistake shows up here.
   */
  fixedExceedsReading: boolean;
  /**
   * The reading at which the reading-proportional part would equal the fixed
   * part. Below it the fixed terms dominate; above it they stop mattering.
   * null when there is no % of reading term (nothing to cross over), and it
   * may legitimately land above full scale — that means the fixed terms
   * dominate everywhere on this range.
   */
  crossoverReading: number | null;
  /** |reading| / |range| × 100 — how much of the range is being used. */
  readingPercentOfRange: number;
  /** True when |reading| > |range|; the spec no longer applies as written. */
  readingExceedsRange: boolean;
  /** Value of one display count in the measured unit, when counts were used. */
  countSize: number | null;
  /** True when every spec field was zero or absent, so the result is 0. */
  specEmpty: boolean;
}

export type AccuracyOutcome = AccuracyResult | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 1 ppm = 1 part in 10^6 = 1e-4 %. */
export function ppmToPercent(ppm: number): number {
  return ppm / 10000;
}

/** 1 % = 10 000 ppm. */
export function percentToPpm(percent: number): number {
  return percent * 10000;
}

/**
 * Largest count an n½-digit display can show before it must change range:
 * 2·10^n − 1 (5½ digits → 199 999). Informational — the uncertainty maths uses
 * the nominal range, not this over-range ceiling.
 */
export function halfDigitMaxCounts(digits: number): number | null {
  const full = Math.floor(digits);
  if (!Number.isFinite(digits) || full < 1 || full > 12) return null;
  const half = digits - full;
  // Only the two conventional forms: "5" (plain) and "5.5" (n½).
  if (half !== 0 && Math.abs(half - 0.5) > 1e-9) return null;
  return half === 0 ? Math.pow(10, full) - 1 : 2 * Math.pow(10, full) - 1;
}

/**
 * Size of one display count in the measured unit.
 *
 * Returns null on an unusable basis rather than guessing, so a bad `digits`
 * entry surfaces as an error instead of a plausible wrong count size.
 */
export function countSize(range: number, basis: CountBasis): number | null {
  const span = Math.abs(range);
  switch (basis.kind) {
    case "resolution":
      return Number.isFinite(basis.resolution) && basis.resolution > 0 ? basis.resolution : null;
    case "countsFullScale":
      return Number.isFinite(basis.countsFullScale) && basis.countsFullScale > 0 && span > 0
        ? span / basis.countsFullScale
        : null;
    case "digits": {
      // n½ digits resolves the nominal range into 10^n steps.
      const full = Math.floor(basis.digits);
      const half = basis.digits - full;
      if (!Number.isFinite(basis.digits) || full < 1 || full > 12) return null;
      if (half !== 0 && Math.abs(half - 0.5) > 1e-9) return null;
      return span > 0 ? span / Math.pow(10, full) : null;
    }
  }
}

/** Format a number for a term label without dragging in float noise. */
function trim(v: number): string {
  return Number(v.toPrecision(12)).toString();
}

/**
 * The specification rewritten the way a manual prints it, e.g.
 * `±(0.0035 % of reading + 0.0005 % of range)`. Empty specs give `±0`.
 */
export function formatSpec(spec: AccuracySpec, unit = ""): string {
  const u = unit ? ` ${unit}` : "";
  const parts: string[] = [];
  if (spec.percentOfReading) parts.push(`${trim(spec.percentOfReading)} % of reading`);
  if (spec.ppmOfReading) parts.push(`${trim(spec.ppmOfReading)} ppm of reading`);
  if (spec.percentOfRange) parts.push(`${trim(spec.percentOfRange)} % of range`);
  if (spec.ppmOfRange) parts.push(`${trim(spec.ppmOfRange)} ppm of range`);
  if (spec.counts) parts.push(`${trim(spec.counts)} counts`);
  if (spec.offset) parts.push(`${trim(spec.offset)}${u}`);
  if (parts.length === 0) return "±0";
  return parts.length === 1 ? `±${parts[0]}` : `±(${parts.join(" + ")})`;
}

// ---------------------------------------------------------------------------
// The calculation
// ---------------------------------------------------------------------------

export interface AccuracyInput {
  /** The value the instrument displayed, in whatever unit it displays. */
  reading: number;
  /** The range (full scale) the instrument was on, same unit. Must be > 0. */
  range: number;
  spec: AccuracySpec;
  /** Required only when `spec.counts` is set. */
  countBasis?: CountBasis;
}

const SPEC_FIELDS: (keyof AccuracySpec)[] = [
  "percentOfReading",
  "ppmOfReading",
  "percentOfRange",
  "ppmOfRange",
  "counts",
  "offset",
];

/**
 * Absolute uncertainty for one reading against one published specification.
 *
 * The terms are summed, per the note at the top of this file. `reading` may be
 * negative or zero; `range` is a magnitude and must be positive, because "% of
 * range" is meaningless without one.
 */
export function measurementAccuracy(input: AccuracyInput): AccuracyOutcome {
  const { reading, range, spec } = input;

  if (!Number.isFinite(reading)) return { ok: false, error: "Enter a reading." };
  if (!Number.isFinite(range)) return { ok: false, error: "Enter the range (full scale)." };
  if (range <= 0) return { ok: false, error: "Range must be greater than zero." };

  for (const field of SPEC_FIELDS) {
    const v = spec[field];
    if (v === undefined) continue;
    if (!Number.isFinite(v)) return { ok: false, error: `${field} is not a number.` };
    // A minus sign here is a typo, not a smaller error band. Refuse it.
    if (v < 0) return { ok: false, error: `${field} must not be negative — specs state a ± band.` };
  }

  const absReading = Math.abs(reading);
  const percentOfReadingTotal = (spec.percentOfReading ?? 0) + ppmToPercent(spec.ppmOfReading ?? 0);
  const percentOfRangeTotal = (spec.percentOfRange ?? 0) + ppmToPercent(spec.ppmOfRange ?? 0);

  // Counts only need a basis when the spec actually uses counts.
  let size: number | null = null;
  if (spec.counts) {
    if (!input.countBasis) {
      return {
        ok: false,
        error: "A counts/digits term needs the display resolution, count or digit count.",
      };
    }
    size = countSize(range, input.countBasis);
    if (size === null || !Number.isFinite(size) || size <= 0) {
      return {
        ok: false,
        error:
          "Could not size one count. Give the resolution directly, the meter's full-scale count, or digits as 3.5/4.5/5.5/6.5.",
      };
    }
  }

  const readingTerm = (percentOfReadingTotal / 100) * absReading;
  const rangeTerm = (percentOfRangeTotal / 100) * range;
  const countsTerm = size === null ? 0 : (spec.counts ?? 0) * size;
  const offsetTerm = spec.offset ?? 0;

  const uncertainty = readingTerm + rangeTerm + countsTerm + offsetTerm;
  const fixedTermTotal = rangeTerm + countsTerm + offsetTerm;

  const raw: { id: AccuracyTermId; label: string; value: number; fixed: boolean }[] = [
    {
      id: "reading",
      label:
        spec.ppmOfReading && !spec.percentOfReading
          ? `${trim(spec.ppmOfReading)} ppm of reading`
          : `${trim(percentOfReadingTotal)} % of reading`,
      value: readingTerm,
      fixed: false,
    },
    {
      id: "range",
      label:
        spec.ppmOfRange && !spec.percentOfRange
          ? `${trim(spec.ppmOfRange)} ppm of range`
          : `${trim(percentOfRangeTotal)} % of range`,
      value: rangeTerm,
      fixed: true,
    },
    { id: "counts", label: `${trim(spec.counts ?? 0)} counts`, value: countsTerm, fixed: true },
    { id: "offset", label: "fixed offset", value: offsetTerm, fixed: true },
  ];

  const terms: AccuracyTerm[] = raw
    .filter((t) => t.value > 0)
    .map((t) => ({ ...t, fraction: uncertainty > 0 ? t.value / uncertainty : 0 }))
    // Largest first: the point of the breakdown is which term is in charge.
    .sort((a, b) => b.value - a.value);

  // Where the sloping part overtakes the flat part. Only meaningful if there
  // is a sloping part at all; it may sit above full scale, which is itself the
  // answer — the fixed terms then dominate across the whole range.
  const crossoverReading =
    percentOfReadingTotal > 0 ? fixedTermTotal / (percentOfReadingTotal / 100) : null;

  return {
    ok: true,
    reading,
    range,
    uncertainty,
    min: reading - uncertainty,
    max: reading + uncertainty,
    percentOfReading: absReading > 0 ? (uncertainty / absReading) * 100 : null,
    ppmOfReading: absReading > 0 ? (uncertainty / absReading) * 1e6 : null,
    percentOfRange: (uncertainty / range) * 100,
    terms,
    dominant: terms[0] ?? null,
    readingTermTotal: readingTerm,
    fixedTermTotal,
    fixedExceedsReading: fixedTermTotal > readingTerm,
    crossoverReading,
    readingPercentOfRange: (absReading / range) * 100,
    readingExceedsRange: absReading > range,
    countSize: size,
    specEmpty: uncertainty === 0,
  };
}

/**
 * Root-sum-square of independent uncertainty contributions.
 *
 * This is the GUM combination, for the level *above* a single instrument spec:
 * meter + reference + fixturing, each an independent source. Do not use it on
 * the terms inside one published expression — see the header note.
 */
export function rssCombine(values: readonly number[]): number {
  let sum = 0;
  for (const v of values) sum += v * v;
  return Math.sqrt(sum);
}

// ---------------------------------------------------------------------------
// Instrument presets — VENDOR CONSTANT GATE (CLAUDE.md §5-3)
//
// ONLY entries recorded in `spec/instrument-accuracy.md` with a document
// number, a revision date, the URL that actually returned a PDF and a verbatim
// extract may appear below. Nothing here is from memory or from a secondary
// source. If a specification cannot be sourced that way, it does not ship.
//
// Deliberately narrow, because breadth is what makes a preset table wrong:
//   · DC voltage only, and only the 1-year column
//   · nominal ranges, never the 20 % over-range display ceiling
//   · everything normalised to volts, so 600.0 mV is range 0.6
//
// The 24-hour, 90-day and 2-year columns, temperature coefficients and the AC,
// resistance and current functions are all left to manual entry. Each extra
// column multiplies the transcription surface by the number of models, and a
// preset carrying the wrong row is worse than no preset at all.
// ---------------------------------------------------------------------------

export interface InstrumentRangePreset {
  /** The range as the manual prints it, e.g. "600.0 mV". */
  label: string;
  /** Nominal full scale in the preset's unit. */
  range: number;
  spec: AccuracySpec;
  /**
   * Required whenever `spec.counts` is set. Handheld manuals print a
   * resolution column per range, so the count size is quoted rather than
   * derived from a display count — a derived figure would not pass the gate.
   */
  countBasis?: CountBasis;
  /** A footnote that changes how the row is used. */
  note?: string;
}

export interface InstrumentPreset {
  id: string;
  vendor: string;
  model: string;
  /** Measurement function the table belongs to. */
  functionName: string;
  /** Unit every range and spec in this preset is expressed in. */
  unit: string;
  /** Calibration interval, temperature window and warm-up, as published. */
  conditions: string;
  /** Document number and revision. Must match a section of the spec file. */
  source: string;
  ranges: readonly InstrumentRangePreset[];
}

export const INSTRUMENT_PRESETS: readonly InstrumentPreset[] = [
  {
    id: "keysight-34461a-dcv",
    vendor: "Keysight",
    model: "34461A",
    functionName: "DC voltage",
    unit: "V",
    conditions: "1 year, TCAL ± 5 °C, 60-minute warm-up, 10 or 100 NPLC, auto zero on",
    source: "spec/instrument-accuracy.md — Keysight 5991-1983EN, June 20, 2022",
    ranges: [
      { label: "100 mV", range: 0.1, spec: { percentOfReading: 0.005, percentOfRange: 0.0035 } },
      { label: "1 V", range: 1, spec: { percentOfReading: 0.004, percentOfRange: 0.0007 } },
      { label: "10 V", range: 10, spec: { percentOfReading: 0.0035, percentOfRange: 0.0005 } },
      { label: "100 V", range: 100, spec: { percentOfReading: 0.0045, percentOfRange: 0.0006 } },
      { label: "1000 V", range: 1000, spec: { percentOfReading: 0.0045, percentOfRange: 0.001 } },
    ],
  },
  {
    // Identical DC volts figures to the 34461A. That is what both documents
    // print — Keysight sells the 34461A as a drop-in 34401A replacement.
    id: "keysight-34401a-dcv",
    vendor: "Keysight / Agilent",
    model: "34401A",
    functionName: "DC voltage",
    unit: "V",
    conditions: "1 year, 23 ± 5 °C, 1-hour warm-up, 6½ digits",
    source: "spec/instrument-accuracy.md — Keysight 5968-0162EN, July 8, 2022",
    ranges: [
      { label: "100.0000 mV", range: 0.1, spec: { percentOfReading: 0.005, percentOfRange: 0.0035 } },
      { label: "1.000000 V", range: 1, spec: { percentOfReading: 0.004, percentOfRange: 0.0007 } },
      { label: "10.00000 V", range: 10, spec: { percentOfReading: 0.0035, percentOfRange: 0.0005 } },
      { label: "100.0000 V", range: 100, spec: { percentOfReading: 0.0045, percentOfRange: 0.0006 } },
      { label: "1000.000 V", range: 1000, spec: { percentOfReading: 0.0045, percentOfRange: 0.001 } },
    ],
  },
  {
    id: "keithley-dmm6500-dcv",
    vendor: "Keithley",
    model: "DMM6500",
    functionName: "DC voltage",
    unit: "V",
    conditions: "1 year, TCAL ± 5 °C, autozero enabled",
    source: "spec/instrument-accuracy.md — Keithley SPEC-DMM6500 Rev. A, April 2018",
    ranges: [
      { label: "100 mV", range: 0.1, spec: { percentOfReading: 0.003, percentOfRange: 0.0035 } },
      { label: "1 V", range: 1, spec: { percentOfReading: 0.0025, percentOfRange: 0.0006 } },
      { label: "10 V", range: 10, spec: { percentOfReading: 0.0025, percentOfRange: 0.0005 } },
      { label: "100 V", range: 100, spec: { percentOfReading: 0.004, percentOfRange: 0.0006 } },
      { label: "1000 V", range: 1000, spec: { percentOfReading: 0.004, percentOfRange: 0.0006 } },
    ],
  },
  {
    id: "siglent-sdm3055-dcv",
    vendor: "Siglent",
    model: "SDM3055",
    functionName: "DC voltage",
    unit: "V",
    conditions: "1 year, 23 °C ± 5 °C, 0.5-hour warm-up, 'Slow' measurement rate",
    source: "spec/instrument-accuracy.md — Siglent SDM3055 DataSheet-2021.05",
    ranges: [
      { label: "200 mV", range: 0.2, spec: { percentOfReading: 0.015, percentOfRange: 0.004 } },
      { label: "2 V", range: 2, spec: { percentOfReading: 0.015, percentOfRange: 0.003 } },
      // The datasheet really does print 0.004 on this row and 0.003 on both
      // its neighbours. Transcribed as printed; not "corrected".
      { label: "20 V", range: 20, spec: { percentOfReading: 0.015, percentOfRange: 0.004 } },
      { label: "200 V", range: 200, spec: { percentOfReading: 0.015, percentOfRange: 0.003 } },
      {
        label: "1000 V",
        range: 1000,
        spec: { percentOfReading: 0.015, percentOfRange: 0.003 },
        note: "Datasheet adds 0.02 mV per volt beyond ±500 V DC — not included; add it as a fixed offset.",
      },
    ],
  },
  {
    // 80 Series V manual, "Model 87" column. The "Model 83" column sits
    // immediately to its left and is twice as loose on most ranges.
    id: "fluke-87v-dcv",
    vendor: "Fluke",
    model: "87V",
    functionName: "DC voltage",
    unit: "V",
    conditions: "1 year after calibration, 18 °C to 28 °C, ≤ 90 % RH, 6000-count display",
    source: "spec/instrument-accuracy.md — Fluke 80 Series V Users Manual, May 2004 Rev.2, 11/08",
    ranges: [
      {
        label: "600.0 mV",
        range: 0.6,
        spec: { percentOfReading: 0.1, counts: 1 },
        countBasis: { kind: "resolution", resolution: 0.0001 },
      },
      {
        label: "6.000 V",
        range: 6,
        spec: { percentOfReading: 0.05, counts: 1 },
        countBasis: { kind: "resolution", resolution: 0.001 },
      },
      {
        label: "60.00 V",
        range: 60,
        spec: { percentOfReading: 0.05, counts: 1 },
        countBasis: { kind: "resolution", resolution: 0.01 },
      },
      {
        label: "600.0 V",
        range: 600,
        spec: { percentOfReading: 0.05, counts: 1 },
        countBasis: { kind: "resolution", resolution: 0.1 },
      },
      {
        label: "1000 V",
        range: 1000,
        spec: { percentOfReading: 0.05, counts: 1 },
        countBasis: { kind: "resolution", resolution: 1 },
      },
    ],
  },
  {
    // The 287/289 manual prints no display count anywhere, so count size comes
    // from the printed Resolution column rather than a derived 50 000 counts.
    id: "fluke-289-dcv",
    vendor: "Fluke",
    model: "289",
    functionName: "DC voltage",
    unit: "V",
    conditions:
      "1 year after calibration, 18 °C to 28 °C, ≤ 90 % RH, ambient stable to ± 1 °C (2 h after a ± 5 °C change)",
    source: "spec/instrument-accuracy.md — Fluke 287/289 Users Manual, June 2007 Rev. 2, 3/09",
    ranges: [
      {
        label: "50 mV",
        range: 0.05,
        spec: { percentOfReading: 0.05, counts: 20 },
        countBasis: { kind: "resolution", resolution: 0.000001 },
        note: "Manual footnote: when using relative mode (REL) to compensate for offsets.",
      },
      {
        label: "500 mV",
        range: 0.5,
        spec: { percentOfReading: 0.025, counts: 2 },
        countBasis: { kind: "resolution", resolution: 0.00001 },
      },
      {
        label: "5 V",
        range: 5,
        spec: { percentOfReading: 0.025, counts: 2 },
        countBasis: { kind: "resolution", resolution: 0.0001 },
      },
      {
        label: "50 V",
        range: 50,
        spec: { percentOfReading: 0.025, counts: 2 },
        countBasis: { kind: "resolution", resolution: 0.001 },
      },
      {
        label: "500 V",
        range: 500,
        spec: { percentOfReading: 0.03, counts: 2 },
        countBasis: { kind: "resolution", resolution: 0.01 },
      },
      {
        label: "1000 V",
        range: 1000,
        spec: { percentOfReading: 0.03, counts: 2 },
        countBasis: { kind: "resolution", resolution: 0.1 },
      },
    ],
  },
];

/** A preset by id, or null. */
export function instrumentPreset(id: string): InstrumentPreset | null {
  return INSTRUMENT_PRESETS.find((p) => p.id === id) ?? null;
}
