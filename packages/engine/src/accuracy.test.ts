import { describe, expect, it } from "vitest";
import {
  countSize,
  formatSpec,
  halfDigitMaxCounts,
  instrumentPreset,
  INSTRUMENT_PRESETS,
  measurementAccuracy,
  percentToPpm,
  ppmToPercent,
  rssCombine,
  type AccuracyInput,
  type AccuracyResult,
  type AccuracySpec,
  type CountBasis,
} from "./accuracy";
import vectors from "../vectors/accuracy.json";

const TOL = vectors.tolerance;

/** Run a vector and fail loudly instead of narrowing a union at every call. */
function ok(input: AccuracyInput): AccuracyResult {
  const r = measurementAccuracy(input);
  if (!r.ok) throw new Error(r.error);
  return r;
}

function term(r: AccuracyResult, id: string): number {
  return r.terms.find((t) => t.id === id)?.value ?? 0;
}

describe("§ % of reading + % of range — the bench DMM shape", () => {
  const v = vectors.percentOfReadingPlusPercentOfRange;
  const r = ok({ reading: v.reading, range: v.range, spec: v.spec });

  it("splits the budget into the two published terms", () => {
    expect(term(r, "reading")).toBeCloseTo(v.readingTerm, 12);
    expect(term(r, "range")).toBeCloseTo(v.rangeTerm, 12);
    // The whole premise: the total is the sum of the terms, nothing else.
    expect(term(r, "reading") + term(r, "range")).toBeCloseTo(r.uncertainty, 12);
    expect(r.terms).toHaveLength(2);
  });

  it("gives the absolute uncertainty and the interval it implies", () => {
    expect(r.uncertainty).toBeCloseTo(v.uncertainty, 12);
    expect(r.min).toBeCloseTo(v.min, 10);
    expect(r.max).toBeCloseTo(v.max, 10);
    expect(r.max - r.min).toBeCloseTo(2 * v.uncertainty, 12);
  });

  it("restates the uncertainty against reading and against range", () => {
    expect(r.percentOfReading!).toBeCloseTo(v.percentOfReading, 12);
    expect(r.ppmOfReading!).toBeCloseTo(v.ppmOfReading, 8);
    expect(r.percentOfRange).toBeCloseTo(v.percentOfRange, 12);
    expect(r.readingPercentOfRange).toBeCloseTo(v.readingPercentOfRange, 10);
  });

  it("names the reading term as dominant here, and says the range term is not", () => {
    expect(r.dominant!.id).toBe(v.dominantId);
    expect(r.fixedExceedsReading).toBe(v.fixedExceedsReading);
    // Fractions are shares of one budget, so they must close.
    expect(r.terms.reduce((a, t) => a + t.fraction, 0)).toBeCloseTo(1, 12);
  });

  it("reports the reading at which the two terms swap places", () => {
    expect(r.crossoverReading!).toBeCloseTo(v.crossoverReading, 10);
    // Verify it really is the crossing point rather than a stored constant.
    const at = ok({ reading: r.crossoverReading!, range: v.range, spec: v.spec });
    expect(term(at, "reading")).toBeCloseTo(term(at, "range"), 12);
  });
});

describe("§ the small-value-on-a-large-range trap", () => {
  const v = vectors.smallValueOnLargeRange;
  const r = ok({ reading: v.reading, range: v.range, spec: v.spec });

  it("keeps the range term the same size while the reading term collapses", () => {
    expect(term(r, "range")).toBeCloseTo(v.rangeTerm, 12);
    expect(term(r, "reading")).toBeCloseTo(v.readingTerm, 12);
    expect(r.uncertainty).toBeCloseTo(v.uncertainty, 12);
  });

  it("says outright that the fixed part now dominates", () => {
    expect(r.fixedExceedsReading).toBe(true);
    expect(r.dominant!.id).toBe(v.dominantId);
    expect(r.dominant!.fixed).toBe(true);
    expect(term(r, "range") / r.uncertainty).toBeCloseTo(v.rangeTermFraction, 12);
  });

  it("costs an order of magnitude in error as a percentage of reading", () => {
    expect(r.percentOfReading!).toBeCloseTo(v.percentOfReading, 12);
    const good = vectors.percentOfReadingPlusPercentOfRange.percentOfReading;
    expect(r.percentOfReading!).toBeGreaterThan(good * 10);
  });

  it("sits below the crossover, which is exactly why it is a trap", () => {
    expect(r.readingPercentOfRange).toBeCloseTo(v.readingPercentOfRange, 12);
    expect(v.reading).toBeLessThan(r.crossoverReading!);
    expect(r.crossoverReading!).toBeCloseTo(v.crossoverReading, 10);
  });
});

describe("§ choosing the range is the whole point", () => {
  const v = vectors.rangeChoiceComparison;

  it("shows the same reading measured better on the narrower range", () => {
    const wide = ok({ reading: v.reading, range: v.wideRange.range, spec: v.spec });
    const narrow = ok({ reading: v.reading, range: v.narrowRange.range, spec: v.spec });

    expect(wide.uncertainty).toBeCloseTo(v.wideRange.uncertainty, 12);
    expect(narrow.uncertainty).toBeCloseTo(v.narrowRange.uncertainty, 12);
    expect(wide.percentOfReading!).toBeCloseTo(v.wideRange.percentOfReading, 12);
    expect(narrow.percentOfReading!).toBeCloseTo(v.narrowRange.percentOfReading, 12);
    expect(wide.uncertainty / narrow.uncertainty).toBeCloseTo(v.improvementFactor, 10);

    // Only the fixed half changed — the reading term is identical.
    expect(term(wide, "reading")).toBeCloseTo(term(narrow, "reading"), 12);
  });

  it("makes the range term shrink exactly in proportion to the range", () => {
    for (const range of [0.1, 1, 10, 100, 1000]) {
      const r = ok({ reading: 0.05, range, spec: { percentOfRange: 0.0005 } });
      expect(r.uncertainty).toBeCloseTo((0.0005 / 100) * range, 14);
      // With no reading term there is nothing to cross over.
      expect(r.crossoverReading).toBeNull();
    }
  });
});

describe("§ % + counts — the handheld shape", () => {
  const v = vectors.percentPlusCounts;
  const basis = v.countBasis as CountBasis;
  const r = ok({ reading: v.reading, range: v.range, spec: v.spec, countBasis: basis });

  it("converts counts to absolute units through the range and display count", () => {
    expect(r.countSize).toBeCloseTo(v.countSize, 14);
    expect(term(r, "counts")).toBeCloseTo(v.countsTerm, 12);
    expect(term(r, "reading")).toBeCloseTo(v.readingTerm, 12);
    expect(r.uncertainty).toBeCloseTo(v.uncertainty, 12);
    expect(r.min).toBeCloseTo(v.min, 10);
    expect(r.max).toBeCloseTo(v.max, 10);
  });

  it("finds the counts term dominant even at 78 % of full scale", () => {
    expect(r.dominant!.id).toBe(v.dominantId);
    expect(r.fixedExceedsReading).toBe(v.fixedExceedsReading);
    expect(r.percentOfReading!).toBeCloseTo(v.percentOfReading, 12);
  });

  it("puts the crossover at full scale, so counts dominate over the whole range", () => {
    expect(r.crossoverReading!).toBeCloseTo(v.crossoverReading, 10);
    expect(r.crossoverReading!).toBeCloseTo(v.range, 10);
    const atFs = ok({ reading: v.range, range: v.range, spec: v.spec, countBasis: basis });
    expect(term(atFs, "reading")).toBeCloseTo(term(atFs, "counts"), 12);
  });

  it("refuses a counts term with no way to size a count", () => {
    const r2 = measurementAccuracy({ reading: 4.7, range: 6, spec: { counts: 3 } });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toContain("resolution");
  });

  it("needs no basis when the spec has no counts term", () => {
    expect(measurementAccuracy({ reading: 4.7, range: 6, spec: { percentOfReading: 0.05 } }).ok).toBe(
      true,
    );
  });
});

describe("§ digits, counts and resolution all size one count", () => {
  it("matches the hand-computed count size for every basis", () => {
    for (const c of vectors.countSizeCases) {
      expect(countSize(c.range, c.basis as CountBasis), JSON.stringify(c.basis)).toBeCloseTo(
        c.size,
        14,
      );
    }
  });

  it("reads n½ digits as 10^n steps over the nominal range", () => {
    const v = vectors.digitsBasis;
    const r = ok({
      reading: v.reading,
      range: v.range,
      spec: v.spec,
      countBasis: v.countBasis as CountBasis,
    });
    expect(r.countSize).toBeCloseTo(v.countSize, 14);
    expect(term(r, "counts")).toBeCloseTo(v.countsTerm, 12);
    expect(r.uncertainty).toBeCloseTo(v.uncertainty, 12);
    expect(r.crossoverReading!).toBeCloseTo(v.crossoverReading, 10);
    expect(r.fixedExceedsReading).toBe(v.fixedExceedsReading);
    expect(halfDigitMaxCounts(v.countBasis.digits)).toBe(v.maxCounts);
  });

  it("reports the over-range ceiling separately from the step size", () => {
    for (const c of vectors.halfDigitCounts) {
      expect(halfDigitMaxCounts(c.digits), `${c.digits} digits`).toBe(c.maxCounts);
    }
    // The ceiling is display capability, not resolution — a 5½-digit meter on
    // the 10 V range still steps by 100 µV, it just keeps counting to 19.9999.
    expect(countSize(10, { kind: "digits", digits: 5.5 })).toBeCloseTo(1e-4, 14);
  });

  it("refuses digit counts that are not n or n½", () => {
    for (const digits of [5.25, 0.5, 0, -3, Number.NaN, 99]) {
      expect(countSize(10, { kind: "digits", digits }), `${digits}`).toBeNull();
      expect(halfDigitMaxCounts(digits), `${digits}`).toBeNull();
    }
  });

  it("refuses a non-positive resolution or count", () => {
    expect(countSize(10, { kind: "resolution", resolution: 0 })).toBeNull();
    expect(countSize(10, { kind: "resolution", resolution: -0.001 })).toBeNull();
    expect(countSize(10, { kind: "countsFullScale", countsFullScale: 0 })).toBeNull();
    const bad = measurementAccuracy({
      reading: 1,
      range: 10,
      spec: { counts: 2 },
      countBasis: { kind: "digits", digits: 5.25 },
    });
    expect(bad.ok).toBe(false);
  });
});

describe("§ ppm and % are the same specification", () => {
  const v = vectors.ppmEqualsPercent;

  it("converts 1 ppm to 1e-4 % in both directions", () => {
    expect(ppmToPercent(35)).toBeCloseTo(0.0035, 14);
    expect(percentToPpm(0.0005)).toBeCloseTo(5, 12);
    for (const p of [0, 1, 35, 1e4, 1e6]) expect(percentToPpm(ppmToPercent(p))).toBeCloseTo(p, 8);
  });

  it("gives an identical result whichever way the spec is entered", () => {
    const asPpm = ok({ reading: v.reading, range: v.range, spec: v.spec });
    const asPercent = ok({
      reading: v.reading,
      range: v.range,
      spec: v.equivalentPercent as AccuracySpec,
    });
    expect(asPpm.uncertainty).toBeCloseTo(v.uncertainty, 12);
    expect(asPpm.uncertainty).toBeCloseTo(asPercent.uncertainty, 14);
    expect(term(asPpm, "reading")).toBeCloseTo(term(asPercent, "reading"), 14);
    expect(term(asPpm, "range")).toBeCloseTo(term(asPercent, "range"), 14);
  });

  it("adds ppm and % of the same kind rather than letting one win", () => {
    const r = ok({
      reading: 4.7,
      range: 10,
      spec: { percentOfReading: 0.0035, ppmOfReading: 35 },
    });
    expect(term(r, "reading")).toBeCloseTo(2 * 0.0001645, 12);
  });

  it("labels a pure-ppm term in ppm", () => {
    const r = ok({ reading: 4.7, range: 10, spec: { ppmOfReading: 35, ppmOfRange: 5 } });
    expect(r.terms.find((t) => t.id === "reading")!.label).toBe("35 ppm of reading");
    expect(r.terms.find((t) => t.id === "range")!.label).toBe("5 ppm of range");
  });
});

describe("§ fixed offset, zero, negative and over-range readings", () => {
  it("handles a bare absolute floor with no crossover", () => {
    const v = vectors.offsetOnly;
    const r = ok({ reading: v.reading, range: v.range, spec: v.spec });
    expect(r.uncertainty).toBeCloseTo(v.uncertainty, 14);
    expect(r.min).toBeCloseTo(v.min, 12);
    expect(r.max).toBeCloseTo(v.max, 12);
    expect(r.percentOfReading!).toBeCloseTo(v.percentOfReading, 12);
    expect(r.percentOfRange).toBeCloseTo(v.percentOfRange, 12);
    expect(r.crossoverReading).toBeNull();
    expect(r.dominant!.id).toBe(v.dominantId);
  });

  it("brackets a negative reading without flipping the interval", () => {
    const v = vectors.negativeReading;
    const r = ok({ reading: v.reading, range: v.range, spec: v.spec });
    expect(r.uncertainty).toBeCloseTo(v.uncertainty, 12);
    expect(r.min).toBeCloseTo(v.min, 10);
    expect(r.max).toBeCloseTo(v.max, 10);
    expect(r.min).toBeLessThan(r.max);
    expect(r.percentOfReading!).toBeCloseTo(v.percentOfReading, 12);
    expect(r.readingPercentOfRange).toBeCloseTo(v.readingPercentOfRange, 10);
    // Sign of the reading must not change the size of the band.
    const positive = ok({ reading: -v.reading, range: v.range, spec: v.spec });
    expect(positive.uncertainty).toBeCloseTo(r.uncertainty, 14);
  });

  it("leaves 'percent of reading' undefined at exactly zero instead of returning Infinity", () => {
    const v = vectors.zeroReading;
    const r = ok({ reading: v.reading, range: v.range, spec: v.spec });
    expect(r.uncertainty).toBeCloseTo(v.uncertainty, 14);
    expect(r.min).toBeCloseTo(v.min, 12);
    expect(r.max).toBeCloseTo(v.max, 12);
    expect(r.percentOfReading).toBeNull();
    expect(r.ppmOfReading).toBeNull();
    expect(r.readingPercentOfRange).toBe(v.readingPercentOfRange);
    expect(r.dominant!.id).toBe(v.dominantId);
    expect(r.fixedExceedsReading).toBe(true);
  });

  it("flags a reading past full scale rather than pretending the spec still holds", () => {
    const v = vectors.overRange;
    const r = ok({ reading: v.reading, range: v.range, spec: v.spec });
    expect(r.readingExceedsRange).toBe(true);
    expect(r.uncertainty).toBeCloseTo(v.uncertainty, 12);
    expect(r.readingPercentOfRange).toBeCloseTo(v.readingPercentOfRange, 10);
    // At and below full scale it must stay quiet.
    expect(ok({ reading: 10, range: 10, spec: v.spec }).readingExceedsRange).toBe(false);
    expect(ok({ reading: -10, range: 10, spec: v.spec }).readingExceedsRange).toBe(false);
    expect(ok({ reading: -12, range: 10, spec: v.spec }).readingExceedsRange).toBe(true);
  });

  it("returns a zero band, flagged, for an empty spec", () => {
    const r = ok({ reading: 4.7, range: 10, spec: {} });
    expect(r.uncertainty).toBe(0);
    expect(r.specEmpty).toBe(true);
    expect(r.terms).toHaveLength(0);
    expect(r.dominant).toBeNull();
    expect(r.min).toBe(r.max);
    expect(r.percentOfReading).toBe(0);
  });
});

describe("§ the terms are summed, never root-sum-squared", () => {
  const v = vectors.sumNotRss;

  it("takes the linear sum, which is the larger and the guaranteed one", () => {
    const r = ok({
      reading: vectors.percentOfReadingPlusPercentOfRange.reading,
      range: vectors.percentOfReadingPlusPercentOfRange.range,
      spec: vectors.percentOfReadingPlusPercentOfRange.spec,
    });
    expect(r.uncertainty).toBeCloseTo(v.linearSum, 12);
    expect(rssCombine([v.readingTerm, v.rangeTerm])).toBeCloseTo(v.rss, 12);
    // RSS understates a published limit of error — that is why it is not used.
    expect(v.rss).toBeLessThan(v.linearSum);
    expect(r.uncertainty).toBeGreaterThan(rssCombine([v.readingTerm, v.rangeTerm]));
  });

  it("offers RSS separately for combining independent sources", () => {
    expect(rssCombine([])).toBe(0);
    expect(rssCombine([3, 4])).toBeCloseTo(5, 14);
    expect(rssCombine([1])).toBeCloseTo(1, 14);
    // Order must not matter and a zero source must not change anything.
    expect(rssCombine([4, 3, 0])).toBeCloseTo(rssCombine([0, 3, 4]), 14);
  });
});

describe("§ spec formatting reads back the way a manual prints it", () => {
  it("renders each shape", () => {
    for (const c of vectors.formatting) {
      expect(formatSpec(c.spec as AccuracySpec)).toBe(c.text);
    }
  });

  it("appends the unit to a bare offset only", () => {
    expect(formatSpec({ offset: 0.002 }, "V")).toBe("±0.002 V");
    expect(formatSpec({ percentOfReading: 0.5, offset: 0.002 }, "V")).toBe(
      "±(0.5 % of reading + 0.002 V)",
    );
  });
});

describe("§ inputs that cannot produce an answer are refused", () => {
  it("requires a finite reading and a positive range", () => {
    const spec = { percentOfReading: 0.1 };
    expect(measurementAccuracy({ reading: Number.NaN, range: 10, spec }).ok).toBe(false);
    expect(measurementAccuracy({ reading: 1, range: Number.NaN, spec }).ok).toBe(false);
    expect(measurementAccuracy({ reading: 1, range: 0, spec }).ok).toBe(false);
    expect(measurementAccuracy({ reading: 1, range: -10, spec }).ok).toBe(false);
    expect(measurementAccuracy({ reading: Number.POSITIVE_INFINITY, range: 10, spec }).ok).toBe(
      false,
    );
  });

  it("refuses a negative spec term instead of treating it as a magnitude", () => {
    for (const spec of [
      { percentOfReading: -0.1 },
      { percentOfRange: -0.1 },
      { ppmOfReading: -1 },
      { ppmOfRange: -1 },
      { counts: -3 },
      { offset: -0.5 },
    ] as AccuracySpec[]) {
      const r = measurementAccuracy({
        reading: 1,
        range: 10,
        spec,
        countBasis: { kind: "resolution", resolution: 0.001 },
      });
      expect(r.ok, JSON.stringify(spec)).toBe(false);
      if (!r.ok) expect(r.error).toContain("negative");
    }
  });

  it("refuses a non-finite spec term", () => {
    const r = measurementAccuracy({
      reading: 1,
      range: 10,
      spec: { percentOfReading: Number.NaN },
    });
    expect(r.ok).toBe(false);
  });
});

describe("§ instrument presets are gated by spec/instrument-accuracy.md", () => {
  it("ships exactly the presets the vector file records, and nothing else", () => {
    const declared = Object.keys(vectors.presets).filter((k) => !k.startsWith("$"));
    expect(INSTRUMENT_PRESETS.map((p) => p.id).sort()).toEqual(declared.sort());
  });

  // The vector file is a second, independent transcription of the same
  // verbatim extract. A single mistyped digit fails here rather than shipping.
  interface PresetRow {
    label: string;
    range: number;
    percentOfReading: number;
    percentOfRange?: number;
    counts?: number;
    resolution?: number;
  }
  const table = vectors.presets as unknown as Record<
    string,
    { document: string; unit: string; rows: PresetRow[] }
  >;
  for (const [id, want] of Object.entries(table)) {
    if (id.startsWith("$")) continue;
    it(`${id} matches its transcription row for row`, () => {
      const preset = instrumentPreset(id)!;
      expect(preset, id).not.toBeNull();
      expect(preset.unit).toBe(want.unit);
      expect(preset.ranges).toHaveLength(want.rows.length);

      want.rows.forEach((row, i) => {
        const got = preset.ranges[i]!;
        expect(got.label, `${id}[${i}] label`).toBe(row.label);
        expect(got.range, `${id}[${i}] range`).toBe(row.range);
        expect(got.spec.percentOfReading, `${id}[${i}] % rdg`).toBe(row.percentOfReading);
        if (row.percentOfRange !== undefined) {
          expect(got.spec.percentOfRange, `${id}[${i}] % rng`).toBe(row.percentOfRange);
          expect(got.spec.counts).toBeUndefined();
        }
        if (row.counts !== undefined) {
          expect(got.spec.counts, `${id}[${i}] counts`).toBe(row.counts);
          // Counts-based rows quote the printed resolution; a display count
          // divided into the range would be a derived value, which the gate
          // does not accept.
          expect(got.countBasis, `${id}[${i}] basis`).toEqual({
            kind: "resolution",
            resolution: row.resolution,
          });
          expect(got.spec.percentOfRange).toBeUndefined();
        }
      });
    });
  }

  it("cites the spec file and a document revision on every preset", () => {
    for (const p of INSTRUMENT_PRESETS) {
      expect(p.source, p.id).toContain("spec/instrument-accuracy.md");
      // A bare model name is not provenance — there must be a document number.
      expect(p.source.length, p.id).toBeGreaterThan(50);
      expect(p.conditions.length, p.id).toBeGreaterThan(20);
      expect(p.vendor.length).toBeGreaterThan(0);
      expect(p.model.length).toBeGreaterThan(0);
      expect(p.functionName).toBe("DC voltage");
      expect(p.ranges.length).toBeGreaterThan(0);
    }
  });

  it("names the document each transcription came from", () => {
    for (const [id, want] of Object.entries(table)) {
      if (id.startsWith("$")) continue;
      expect(want.document.length, id).toBeGreaterThan(20);
    }
  });

  it("every preset range computes without error", () => {
    for (const p of INSTRUMENT_PRESETS) {
      for (const r of p.ranges) {
        // Half of full scale is inside every one of these instruments' spans.
        const out = measurementAccuracy({
          reading: r.range / 2,
          range: r.range,
          spec: r.spec,
          countBasis: r.countBasis,
        });
        expect(out.ok, `${p.id} ${r.label}`).toBe(true);
        if (!out.ok) continue;
        expect(out.uncertainty).toBeGreaterThan(0);
        expect(out.specEmpty).toBe(false);
        expect(out.readingExceedsRange).toBe(false);
      }
    }
  });

  it("lists ranges in ascending order, so a picker reads like the manual", () => {
    for (const p of INSTRUMENT_PRESETS) {
      for (let i = 1; i < p.ranges.length; i++) {
        expect(p.ranges[i]!.range, `${p.id}`).toBeGreaterThan(p.ranges[i - 1]!.range);
      }
    }
  });

  it("computes the hand-checked value for 4.7 V on each instrument", () => {
    const { reading, cases } = vectors.presetWorkedValues;
    for (const c of cases) {
      const preset = instrumentPreset(c.preset)!;
      const row = preset.ranges.find((r) => r.label === c.rangeLabel)!;
      expect(row, `${c.preset} ${c.rangeLabel}`).toBeDefined();
      const r = ok({ reading, range: row.range, spec: row.spec, countBasis: row.countBasis });
      expect(r.uncertainty, `${c.preset}`).toBeCloseTo(c.uncertainty, 12);
      expect(r.percentOfReading!, `${c.preset}`).toBeCloseTo(c.percentOfReading, 12);
    }
  });

  it("spreads the same measurement over more than an order of magnitude", () => {
    const { cases } = vectors.presetWorkedValues;
    const values = cases.map((c) => c.uncertainty);
    expect(Math.max(...values) / Math.min(...values)).toBeGreaterThan(10);
  });

  it("has no duplicate preset ids or duplicate range labels within a preset", () => {
    const ids = INSTRUMENT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of INSTRUMENT_PRESETS) {
      const labels = p.ranges.map((r) => r.label);
      expect(new Set(labels).size, p.id).toBe(labels.length);
    }
  });

  it("returns null for an unknown preset id", () => {
    expect(instrumentPreset("fluke-101-dcv")).toBeNull();
    expect(instrumentPreset("")).toBeNull();
  });
});

describe("§ invariants that must hold for any spec and reading", () => {
  const specs: { spec: AccuracySpec; basis?: CountBasis }[] = [
    { spec: { percentOfReading: 0.0035, percentOfRange: 0.0005 } },
    { spec: { percentOfReading: 0.05, counts: 3 }, basis: { kind: "countsFullScale", countsFullScale: 6000 } },
    { spec: { ppmOfReading: 35, ppmOfRange: 5 } },
    { spec: { percentOfReading: 0.1, offset: 0.002 } },
    { spec: { percentOfRange: 0.25 } },
    { spec: { offset: 0.01 } },
  ];

  it("keeps the total equal to the sum of the reported terms", () => {
    for (const { spec, basis } of specs) {
      for (const reading of [0, 0.001, 0.1, 1, 4.7, 9.9, 10]) {
        const r = ok({ reading, range: 10, spec, countBasis: basis });
        const sum = r.terms.reduce((a, t) => a + t.value, 0);
        expect(sum, `${JSON.stringify(spec)} @ ${reading}`).toBeCloseTo(r.uncertainty, 12);
        expect(r.readingTermTotal + r.fixedTermTotal).toBeCloseTo(r.uncertainty, 12);
        expect(r.uncertainty).toBeGreaterThanOrEqual(0);
        expect(r.max - r.min).toBeCloseTo(2 * r.uncertainty, 12);
      }
    }
  });

  it("sorts the breakdown largest contribution first", () => {
    for (const { spec, basis } of specs) {
      const r = ok({ reading: 0.3, range: 10, spec, countBasis: basis });
      for (let i = 1; i < r.terms.length; i++) {
        expect(r.terms[i - 1]!.value).toBeGreaterThanOrEqual(r.terms[i]!.value);
      }
      if (r.terms.length > 0) expect(r.dominant).toBe(r.terms[0]);
    }
  });

  it("never lists a term that contributed nothing", () => {
    const r = ok({ reading: 4.7, range: 10, spec: { percentOfReading: 0.0035, percentOfRange: 0 } });
    expect(r.terms.map((t) => t.id)).toEqual(["reading"]);
  });

  it("makes uncertainty rise with the reading and the crossover independent of it", () => {
    const spec = { percentOfReading: 0.0035, percentOfRange: 0.0005 };
    let previous = -1;
    let crossover: number | null = null;
    for (const reading of [0, 0.5, 1, 2, 5, 10]) {
      const r = ok({ reading, range: 10, spec });
      expect(r.uncertainty).toBeGreaterThan(previous);
      previous = r.uncertainty;
      // The crossover is a property of the spec and the range only.
      if (crossover === null) crossover = r.crossoverReading;
      expect(r.crossoverReading!).toBeCloseTo(crossover!, 12);
      // …and the flag must agree with which side of it the reading sits on.
      expect(r.fixedExceedsReading).toBe(Math.abs(reading) < crossover!);
    }
  });

  it("scales linearly: doubling every spec term doubles the uncertainty", () => {
    const base = ok({
      reading: 4.7,
      range: 10,
      spec: { percentOfReading: 0.0035, percentOfRange: 0.0005, offset: 0.001 },
    });
    const doubled = ok({
      reading: 4.7,
      range: 10,
      spec: { percentOfReading: 0.007, percentOfRange: 0.001, offset: 0.002 },
    });
    expect(doubled.uncertainty).toBeCloseTo(2 * base.uncertainty, 12);
    // Shares are unchanged, so the dominant term is too.
    expect(doubled.dominant!.id).toBe(base.dominant!.id);
    expect(doubled.terms[0]!.fraction).toBeCloseTo(base.terms[0]!.fraction, 12);
  });

  it("is unit-agnostic: scaling reading, range and offset together scales the result", () => {
    // mV instead of V — the percentages do not change, the answer scales ×1000.
    const volts = ok({
      reading: 4.7,
      range: 10,
      spec: { percentOfReading: 0.0035, percentOfRange: 0.0005, offset: 0.0001 },
    });
    const millivolts = ok({
      reading: 4700,
      range: 10000,
      spec: { percentOfReading: 0.0035, percentOfRange: 0.0005, offset: 0.1 },
    });
    expect(millivolts.uncertainty).toBeCloseTo(volts.uncertainty * 1000, 9);
    expect(millivolts.percentOfReading!).toBeCloseTo(volts.percentOfReading!, 12);
  });

  it("agrees with the stated tolerance on the headline vector to the last digit", () => {
    const v = vectors.percentOfReadingPlusPercentOfRange;
    const r = ok({ reading: v.reading, range: v.range, spec: v.spec });
    expect(Math.abs(r.uncertainty - v.uncertainty)).toBeLessThanOrEqual(TOL);
  });
});
