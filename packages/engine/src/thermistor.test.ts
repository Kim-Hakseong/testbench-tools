import { describe, expect, it } from "vitest";
import {
  ABSOLUTE_ZERO_C,
  NTC_REFERENCE_CURVES,
  ntcBetaFromTwoPoints,
  ntcBetaLabel,
  ntcBetaResistance,
  ntcBetaTemperature,
  ntcCheckAgainstTable,
  ntcDividerReading,
  ntcFitSteinhartHart,
  ntcModelDeviation,
  ntcSteinhartResistance,
  ntcSteinhartTemperature,
  ntcSweepTemperatures,
  type NtcBetaParams,
  type SteinhartHartCoefficients,
} from "./thermistor";
import vectors from "../vectors/thermistor.json";

const CURVE = NTC_REFERENCE_CURVES[0]!;

function ohmsOf(r: ReturnType<typeof ntcBetaResistance>): number {
  if (!r.ok) throw new Error(r.error);
  return r.ohms;
}

function celsiusOf(r: ReturnType<typeof ntcBetaTemperature>): number {
  if (!r.ok) throw new Error(r.error);
  return r.celsius;
}

function relative(got: number, want: number): number {
  return Math.abs(got - want) / Math.abs(want);
}

/** The coefficient set every Steinhart-Hart assertion below is built on. */
function fittedCoefficients(): SteinhartHartCoefficients {
  const points = vectors.steinhartFit.points.map((p) => ({ ohms: p.ohms, celsius: p.celsius }));
  const fit = ntcFitSteinhartHart(points);
  if (!fit.ok) throw new Error(fit.error);
  return fit.coefficients;
}

describe("§ Beta (B-parameter) equation", () => {
  const spec = vectors.betaEquation;
  const params: NtcBetaParams = { r0Ohms: spec.r0Ohms, t0C: spec.t0C, beta: spec.beta };

  it("reproduces R(T) at every independently computed point", () => {
    for (const [celsius, wantOhms] of spec.resistanceAtC) {
      const got = ohmsOf(ntcBetaResistance(params, celsius!));
      expect(relative(got, wantOhms!), `R(${celsius} °C) → ${got} Ω`).toBeLessThanOrEqual(
        spec.resistanceRelativeTolerance,
      );
    }
  });

  it("reproduces T(R) at every independently computed point", () => {
    for (const [ohms, wantC] of spec.temperatureAtOhms) {
      const got = celsiusOf(ntcBetaTemperature(params, ohms!));
      expect(Math.abs(got - wantC!), `T(${ohms} Ω) → ${got} °C`).toBeLessThanOrEqual(
        spec.temperatureToleranceC,
      );
    }
  });

  it("is exact at its own anchor point, in both directions", () => {
    // The Beta equation has one point it cannot be wrong at: R0 at T0.
    expect(ohmsOf(ntcBetaResistance(params, spec.anchorIsExact.celsius))).toBeCloseTo(
      spec.anchorIsExact.ohms,
      9,
    );
    expect(celsiusOf(ntcBetaTemperature(params, spec.anchorIsExact.ohms))).toBeCloseTo(
      spec.anchorIsExact.celsius,
      9,
    );
  });

  it("round-trips T → R → T across the useful span", () => {
    for (let c = -50; c <= 150; c += 5) {
      const r = ohmsOf(ntcBetaResistance(params, c));
      expect(Math.abs(celsiusOf(ntcBetaTemperature(params, r)) - c)).toBeLessThan(1e-9);
    }
  });

  it("uses kelvin internally — a °C-only implementation would miss by this much", () => {
    // Same numbers with T0 and T left in °C instead of kelvin. This is the
    // single most likely way to get the equation wrong, and at 0 °C it does
    // not even produce a plausible resistance.
    const naive = spec.r0Ohms * Math.exp(spec.beta * (1 / 0.5 - 1 / spec.t0C));
    const correct = ohmsOf(ntcBetaResistance(params, 0.5));
    expect(Math.abs(naive - correct)).toBeGreaterThan(correct);
  });

  it("refuses inputs that would produce NaN instead of producing it", () => {
    expect(ntcBetaResistance(params, ABSOLUTE_ZERO_C).ok).toBe(false);
    expect(ntcBetaResistance(params, ABSOLUTE_ZERO_C - 1).ok).toBe(false);
    expect(ntcBetaResistance(params, Number.NaN).ok).toBe(false);
    expect(ntcBetaTemperature(params, 0).ok).toBe(false);
    expect(ntcBetaTemperature(params, -10).ok).toBe(false);
    expect(ntcBetaTemperature(params, Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(ntcBetaResistance({ ...params, r0Ohms: 0 }, 25).ok).toBe(false);
    expect(ntcBetaResistance({ ...params, beta: 0 }, 25).ok).toBe(false);
    expect(ntcBetaResistance({ ...params, beta: -3435 }, 25).ok).toBe(false);
    expect(ntcBetaResistance({ ...params, t0C: ABSOLUTE_ZERO_C }, 25).ok).toBe(false);
    const noTemp = ntcBetaTemperature(params, Number.NaN);
    expect(noTemp.ok).toBe(false);
    if (!noTemp.ok) expect(noTemp.error).toContain("ohms");
  });

  it("refuses a resistance that drives the Beta equation past absolute zero", () => {
    // 1/T0 + ln(R/R0)/B goes negative for a small enough R with a small enough B.
    const r = ntcBetaTemperature({ r0Ohms: 10000, t0C: 25, beta: 100 }, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("absolute zero");
  });
});

describe("§ B is defined between two temperatures, not for a part", () => {
  const spec = vectors.betaFromTwoPoints;

  it("computes B = ln(R1/R2)/(1/T1 − 1/T2) for every quoted pair", () => {
    for (const pair of spec.pairs) {
      const got = ntcBetaFromTwoPoints(
        { ohms: pair.lowOhms, celsius: pair.lowC },
        { ohms: pair.highOhms, celsius: pair.highC },
      );
      expect(got.ok, pair.label).toBe(true);
      if (!got.ok) continue;
      expect(Math.abs(got.beta - pair.beta), `${pair.label} → ${got.beta} K`).toBeLessThanOrEqual(
        spec.toleranceK,
      );
      expect(got.label).toBe(pair.label);
      expect([got.lowC, got.highC]).toEqual([pair.lowC, pair.highC]);
    }
  });

  it("agrees with the B25/85 the datasheet prints for the same part", () => {
    const pair = spec.pairs.find((p) => p.label === "B25/85")!;
    expect(Math.abs(pair.beta - spec.datasheetB2585)).toBeLessThanOrEqual(
      spec.datasheetB2585ToleranceK,
    );
  });

  it("gives materially different answers for different pairs on one thermistor", () => {
    const at = (label: string) => spec.pairs.find((p) => p.label === label)!.beta;
    // ~87 K between B25/50 and B25/125 on the same part: quoting "B = 3977 K"
    // without the pair is not enough information to reproduce a reading.
    expect(at("B25/125") - at("B25/50")).toBeGreaterThan(80);
    expect(at("B25/85") - at("B-40/25")).toBeGreaterThan(200);
  });

  it("is symmetric in its two points and always reports low/high in order", () => {
    const a = { ohms: 10000, celsius: 25 };
    const b = { ohms: 1070, celsius: 85 };
    const forward = ntcBetaFromTwoPoints(a, b);
    const backward = ntcBetaFromTwoPoints(b, a);
    expect(forward.ok && backward.ok).toBe(true);
    if (forward.ok && backward.ok) {
      expect(forward.beta).toBeCloseTo(backward.beta, 9);
      expect(backward.lowC).toBe(25);
      expect(backward.highC).toBe(85);
    }
  });

  it("labels B with its pair, and falls back to plain B when the pair is unknown", () => {
    expect(ntcBetaLabel({ betaLowC: 25, betaHighC: 85 })).toBe("B25/85");
    expect(ntcBetaLabel({ betaLowC: 25, betaHighC: 50 })).toBe("B25/50");
    expect(ntcBetaLabel({})).toBe("B");
    expect(ntcBetaLabel({ betaLowC: 25 })).toBe("B");
  });

  it("refuses degenerate pairs", () => {
    const same = ntcBetaFromTwoPoints({ ohms: 10000, celsius: 25 }, { ohms: 5000, celsius: 25 });
    expect(same.ok).toBe(false);
    if (!same.ok) expect(same.error).toContain("two different temperatures");
    expect(
      ntcBetaFromTwoPoints({ ohms: 10000, celsius: 25 }, { ohms: 10000, celsius: 85 }).ok,
    ).toBe(false);
    expect(ntcBetaFromTwoPoints({ ohms: 0, celsius: 25 }, { ohms: 1070, celsius: 85 }).ok).toBe(
      false,
    );
    expect(
      ntcBetaFromTwoPoints({ ohms: 10000, celsius: ABSOLUTE_ZERO_C }, { ohms: 1070, celsius: 85 })
        .ok,
    ).toBe(false);
  });
});

describe("§ Steinhart-Hart equation", () => {
  const spec = vectors.steinhartValues;
  const co = fittedCoefficients();

  it("reproduces T(R) at every independently computed point", () => {
    for (const [ohms, wantC] of spec.temperatureAtOhms) {
      const got = ntcSteinhartTemperature(co, ohms!);
      expect(got.ok).toBe(true);
      if (!got.ok) continue;
      expect(Math.abs(got.celsius - wantC!), `T(${ohms} Ω) → ${got.celsius} °C`).toBeLessThanOrEqual(
        spec.temperatureToleranceC,
      );
    }
  });

  it("reproduces R(T) through the Cardano inversion at every point", () => {
    for (const [celsius, wantOhms] of spec.resistanceAtC) {
      const got = ntcSteinhartResistance(co, celsius!);
      expect(got.ok).toBe(true);
      if (!got.ok) continue;
      expect(relative(got.ohms, wantOhms!), `R(${celsius} °C) → ${got.ohms} Ω`).toBeLessThanOrEqual(
        spec.resistanceRelativeTolerance,
      );
    }
  });

  it("round-trips both ways across the whole span — the inversion is exact, not iterated", () => {
    for (let c = -55; c <= 155; c += 2.5) {
      const r = ntcSteinhartResistance(co, c);
      expect(r.ok, `${c} °C`).toBe(true);
      if (!r.ok) continue;
      const back = ntcSteinhartTemperature(co, r.ohms);
      expect(back.ok).toBe(true);
      if (back.ok) expect(Math.abs(back.celsius - c)).toBeLessThan(1e-8);
    }
    for (let ohms = 200; ohms <= 400000; ohms *= 1.5) {
      const t = ntcSteinhartTemperature(co, ohms);
      expect(t.ok).toBe(true);
      if (!t.ok) continue;
      const back = ntcSteinhartResistance(co, t.celsius);
      expect(back.ok).toBe(true);
      if (back.ok) {
        expect(relative(back.ohms, ohms)).toBeLessThan(spec.roundTripRelativeTolerance);
      }
    }
  });

  it("degenerates to the two-constant form when C is zero, and still inverts", () => {
    const twoTerm: SteinhartHartCoefficients = { a: 1.1e-3, b: 2.3e-4, c: 0 };
    const r = ntcSteinhartResistance(twoTerm, 25);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const back = ntcSteinhartTemperature(twoTerm, r.ohms);
    expect(back.ok && Math.abs(back.celsius - 25)).toBeLessThan(1e-9);
    expect(ntcSteinhartResistance({ a: 1e-3, b: 0, c: 0 }, 25).ok).toBe(false);
  });

  it("refuses to invert a coefficient set with more than one answer", () => {
    // B and C of opposite signs make the cubic in ln R non-monotonic: three
    // real roots, so several resistances give the same temperature.
    const ambiguous: SteinhartHartCoefficients = { a: 1e-3, b: -1e-3, c: 1e-7 };
    const r = ntcSteinhartResistance(ambiguous, 25);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("more than one resistance");
  });

  it("refuses non-physical inputs and coefficients", () => {
    expect(ntcSteinhartTemperature(co, 0).ok).toBe(false);
    expect(ntcSteinhartTemperature(co, -1).ok).toBe(false);
    expect(ntcSteinhartTemperature(co, Number.NaN).ok).toBe(false);
    expect(ntcSteinhartTemperature({ a: 0, b: 0, c: 0 }, 10000).ok).toBe(false);
    expect(ntcSteinhartTemperature({ a: Number.NaN, b: 1, c: 1 }, 10000).ok).toBe(false);
    expect(ntcSteinhartResistance(co, ABSOLUTE_ZERO_C).ok).toBe(false);
    expect(ntcSteinhartResistance(co, Number.NaN).ok).toBe(false);
    // Negative 1/T means the coefficients place this resistance below 0 K.
    const belowZero = ntcSteinhartTemperature({ a: -1e-3, b: 1e-9, c: 0 }, 10000);
    expect(belowZero.ok).toBe(false);
    if (!belowZero.ok) expect(belowZero.error).toContain("absolute zero");
  });
});

describe("§ fitting A, B and C from three (R, T) points", () => {
  const spec = vectors.steinhartFit;
  const points = spec.points.map((p) => ({ ohms: p.ohms, celsius: p.celsius }));

  it("solves the 3×3 system to the independently computed coefficients", () => {
    const fit = ntcFitSteinhartHart(points);
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    expect(relative(fit.coefficients.a, spec.coefficients.a)).toBeLessThanOrEqual(
      spec.coefficientRelativeTolerance,
    );
    expect(relative(fit.coefficients.b, spec.coefficients.b)).toBeLessThanOrEqual(
      spec.coefficientRelativeTolerance,
    );
    expect(relative(fit.coefficients.c, spec.coefficients.c)).toBeLessThanOrEqual(
      spec.coefficientRelativeTolerance,
    );
  });

  it("passes exactly through all three of its own points", () => {
    const fit = ntcFitSteinhartHart(points);
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    expect(fit.maxResidualC).toBeLessThanOrEqual(spec.maxResidualAtFitPointsC);
    for (const p of points) {
      const back = ntcSteinhartTemperature(fit.coefficients, p.ohms);
      expect(back.ok).toBe(true);
      if (back.ok) expect(Math.abs(back.celsius - p.celsius)).toBeLessThanOrEqual(1e-9);
    }
  });

  it("does not care what order the points arrive in", () => {
    const shuffled = [points[2]!, points[0]!, points[1]!];
    const a = ntcFitSteinhartHart(points);
    const b = ntcFitSteinhartHart(shuffled);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(relative(b.coefficients.a, a.coefficients.a)).toBeLessThan(1e-9);
      expect(relative(b.coefficients.b, a.coefficients.b)).toBeLessThan(1e-9);
      expect(relative(b.coefficients.c, a.coefficients.c)).toBeLessThan(1e-9);
    }
  });

  it("fits three bunched points perfectly and is four times worse away from them", () => {
    // Fitting 20/25/30 °C is the mistake the tool should let you see: the
    // residual at the fit points is zero and the curve is still wrong by
    // several tenths of a degree at the ends. Nothing about the fit itself
    // reports this — only checking against points it did not see does.
    const narrow = vectors.narrowFitCheck;
    const bunched = CURVE.table.filter(([c]) => narrow.fitPointsC.includes(c));
    const fit = ntcFitSteinhartHart(bunched.map(([celsius, ohms]) => ({ celsius, ohms })));
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    expect(fit.maxResidualC).toBeLessThan(1e-6);
    const check = ntcCheckAgainstTable(fit.coefficients, CURVE.table);
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(Math.abs(check.maxAbsC - narrow.maxAbsC)).toBeLessThanOrEqual(narrow.toleranceC);
    expect(check.worstCelsius).toBe(narrow.worstCelsius);
    expect(Math.abs(check.rmsC - narrow.rmsC)).toBeLessThanOrEqual(narrow.toleranceC);
    expect(check.maxAbsC).toBeGreaterThan(3 * vectors.tableCheck.maxAbsC);
  });

  it("refuses degenerate point sets instead of returning NaN", () => {
    const wrongCount = ntcFitSteinhartHart([points[0]!, points[1]!]);
    expect(wrongCount.ok).toBe(false);
    if (!wrongCount.ok) expect(wrongCount.error).toContain("exactly 3");

    const sameTemp = ntcFitSteinhartHart([
      { ohms: 10000, celsius: 25 },
      { ohms: 9000, celsius: 25 },
      { ohms: 1070, celsius: 85 },
    ]);
    expect(sameTemp.ok).toBe(false);
    if (!sameTemp.ok) expect(sameTemp.error).toContain("same temperature");

    const sameOhms = ntcFitSteinhartHart([
      { ohms: 10000, celsius: 25 },
      { ohms: 10000, celsius: 50 },
      { ohms: 1070, celsius: 85 },
    ]);
    expect(sameOhms.ok).toBe(false);
    if (!sameOhms.ok) expect(sameOhms.error).toContain("same resistance");

    expect(
      ntcFitSteinhartHart([
        { ohms: 0, celsius: -40 },
        { ohms: 10000, celsius: 25 },
        { ohms: 338.7, celsius: 125 },
      ]).ok,
    ).toBe(false);
    expect(
      ntcFitSteinhartHart([
        { ohms: 332094, celsius: ABSOLUTE_ZERO_C },
        { ohms: 10000, celsius: 25 },
        { ohms: 338.7, celsius: 125 },
      ]).ok,
    ).toBe(false);
    expect(
      ntcFitSteinhartHart([
        { ohms: 332094, celsius: Number.NaN },
        { ohms: 10000, celsius: 25 },
        { ohms: 338.7, celsius: 125 },
      ]).ok,
    ).toBe(false);
  });

  it("refuses points so close together that the solve is meaningless", () => {
    const fit = ntcFitSteinhartHart([
      { ohms: 10000, celsius: 25 },
      { ohms: 10000 * (1 + 1e-13), celsius: 25 + 1e-11 },
      { ohms: 10000 * (1 + 2e-13), celsius: 25 + 2e-11 },
    ]);
    expect(fit.ok).toBe(false);
  });
});

describe("§ the fit checked against the table rows it never saw", () => {
  const spec = vectors.tableCheck;

  it("tracks all 39 published rows to a tenth of a degree", () => {
    const check = ntcCheckAgainstTable(fittedCoefficients(), CURVE.table);
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.count).toBe(spec.rows);
    expect(Math.abs(check.maxAbsC - spec.maxAbsC)).toBeLessThanOrEqual(spec.toleranceC);
    expect(check.worstCelsius).toBe(spec.worstCelsius);
    expect(Math.abs(check.rmsC - spec.rmsC)).toBeLessThanOrEqual(spec.toleranceC);
    // Stated as a hard ceiling as well, so a coefficient regression is loud.
    expect(check.maxAbsC).toBeLessThan(spec.maxAbsMustBeUnderC);
  });

  it("refuses an empty table rather than reporting a perfect fit", () => {
    expect(ntcCheckAgainstTable(fittedCoefficients(), []).ok).toBe(false);
  });
});

describe("§ what the Beta equation costs — the deviation between the two models", () => {
  const spec = vectors.betaDeviation;
  const beta: NtcBetaParams = {
    r0Ohms: spec.r0Ohms,
    t0C: spec.t0C,
    beta: spec.beta,
    betaLowC: 25,
    betaHighC: 85,
  };
  const co = fittedCoefficients();

  it("matches the independently computed deviation at every temperature", () => {
    const result = ntcModelDeviation(
      beta,
      co,
      spec.rows.map((r) => r.celsius),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(spec.rows.length);
    spec.rows.forEach((want, i) => {
      const got = result.rows[i]!;
      expect(got.celsius).toBe(want.celsius);
      expect(relative(got.ohms, want.ohms)).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(got.betaCelsius - want.betaCelsius)).toBeLessThanOrEqual(spec.toleranceC);
      expect(Math.abs(got.deviationC - want.deviationC)).toBeLessThanOrEqual(spec.toleranceC);
    });
  });

  it("is zero at the anchor and about three degrees at the ends of the span", () => {
    const result = ntcModelDeviation(beta, co, [-40, 25, 150]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [cold, anchor, hot] = result.rows;
    expect(Math.abs(anchor!.deviationC)).toBeLessThan(1e-9);
    expect(cold!.deviationC).toBeGreaterThan(2.9);
    expect(hot!.deviationC).toBeGreaterThan(2.7);
    expect(result.maxAbsDeviationC).toBeGreaterThan(2.9);
    expect(result.worstCelsius).toBe(-40);
  });

  it("nearly vanishes at the second temperature B was measured at", () => {
    // B25/85 was fitted to this curve at 25 and 85 °C, so those are the two
    // temperatures the Beta equation is entitled to be right at.
    const result = ntcModelDeviation(beta, co, [85]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(Math.abs(result.rows[0]!.deviationC)).toBeLessThan(0.1);
  });

  it("refuses an empty sweep and propagates a bad model instead of averaging over it", () => {
    expect(ntcModelDeviation(beta, co, []).ok).toBe(false);
    expect(ntcModelDeviation({ ...beta, beta: 0 }, co, [25]).ok).toBe(false);
    expect(ntcModelDeviation(beta, { a: 0, b: 0, c: 0 }, [25]).ok).toBe(false);
    expect(ntcModelDeviation(beta, co, [ABSOLUTE_ZERO_C]).ok).toBe(false);
  });

  it("builds an inclusive sweep", () => {
    expect(ntcSweepTemperatures(-40, 125, 4)).toEqual([-40, 15, 70, 125]);
    expect(ntcSweepTemperatures(0, 100, 2)).toEqual([0, 100]);
    expect(ntcSweepTemperatures(0, 100, 1)).toEqual([]);
    expect(ntcSweepTemperatures(Number.NaN, 100, 5)).toEqual([]);
  });
});

describe("§ voltage-divider readout", () => {
  const spec = vectors.divider;

  it("matches every computed case, ADC counts included", () => {
    for (const c of spec.cases) {
      const got = ntcDividerReading({
        ohms: c.ohms,
        seriesOhms: c.seriesOhms,
        supplyVolts: c.supplyVolts,
        topology: c.topology as "pulldown" | "pullup",
        adcBits: c.adcBits,
      });
      expect(got.ok, JSON.stringify(c)).toBe(true);
      if (!got.ok) continue;
      expect(Math.abs(got.volts - c.volts)).toBeLessThanOrEqual(spec.voltsToleranceV);
      expect(got.ratio).toBeCloseTo(c.ratio, 9);
      expect(got.counts).toBe(c.counts);
      expect(got.fullScaleCounts).toBe(c.fullScaleCounts);
    }
  });

  it("splits the supply between the two legs", () => {
    const args = { ohms: 3605, seriesOhms: 10000, supplyVolts: 3.3 } as const;
    const low = ntcDividerReading({ ...args, topology: "pulldown" });
    const high = ntcDividerReading({ ...args, topology: "pullup" });
    expect(low.ok && high.ok).toBe(true);
    if (low.ok && high.ok) expect(low.volts + high.volts).toBeCloseTo(3.3, 12);
  });

  it("omits the count when no resolution is given, and clamps to full scale", () => {
    const noAdc = ntcDividerReading({
      ohms: 10000,
      seriesOhms: 10000,
      supplyVolts: 3.3,
      topology: "pulldown",
    });
    expect(noAdc.ok && noAdc.counts).toBeUndefined();
    const clamped = ntcDividerReading({
      ohms: 1e9,
      seriesOhms: 10000,
      supplyVolts: 3.3,
      topology: "pulldown",
      adcBits: 12,
      adcRefVolts: 2.5,
    });
    expect(clamped.ok && clamped.counts).toBe(4095);
  });

  it("refuses impossible dividers", () => {
    const base = { ohms: 10000, seriesOhms: 10000, supplyVolts: 3.3, topology: "pulldown" } as const;
    expect(ntcDividerReading({ ...base, ohms: 0 }).ok).toBe(false);
    expect(ntcDividerReading({ ...base, seriesOhms: -1 }).ok).toBe(false);
    expect(ntcDividerReading({ ...base, supplyVolts: 0 }).ok).toBe(false);
    expect(ntcDividerReading({ ...base, adcBits: 0 }).ok).toBe(false);
    expect(ntcDividerReading({ ...base, adcBits: 12.5 }).ok).toBe(false);
    expect(ntcDividerReading({ ...base, adcBits: 12, adcRefVolts: 0 }).ok).toBe(false);
  });
});

describe("§ reference curve transcription", () => {
  const spec = vectors.referenceCurve;

  it("carries the datasheet table exactly as printed", () => {
    expect(NTC_REFERENCE_CURVES).toHaveLength(1);
    expect(CURVE.id).toBe(spec.id);
    expect(CURVE.r25Ohms).toBe(spec.r25Ohms);
    expect(CURVE.beta2585).toBe(spec.beta2585);
    expect(CURVE.table).toHaveLength(spec.rowCount);
    expect(CURVE.table[0]).toEqual(spec.firstRow);
    expect(CURVE.table[CURVE.table.length - 1]).toEqual(spec.lastRow);
    expect(CURVE.table.find(([c]) => c === 25)).toEqual(spec.row25C);
    const sum = CURVE.table.reduce((acc, [, ohms]) => acc + ohms, 0);
    expect(Math.abs(sum - spec.sumOfResistancesOhms)).toBeLessThan(1e-6);
  });

  it("cites the document and revision the values came from", () => {
    expect(CURVE.source).toContain("29049");
    expect(CURVE.source).toContain("07-May-2025");
  });

  it("is a monotonically falling NTC curve on a 5 °C grid", () => {
    for (let i = 1; i < CURVE.table.length; i++) {
      expect(CURVE.table[i]![0] - CURVE.table[i - 1]![0]).toBe(5);
      expect(CURVE.table[i]![1]).toBeLessThan(CURVE.table[i - 1]![1]);
    }
  });

  it("has a B25/85 consistent with the one the datasheet prints", () => {
    const r25 = CURVE.table.find(([c]) => c === 25)![1];
    const r85 = CURVE.table.find(([c]) => c === 85)![1];
    const b = ntcBetaFromTwoPoints({ ohms: r25, celsius: 25 }, { ohms: r85, celsius: 85 });
    expect(b.ok).toBe(true);
    if (b.ok) expect(Math.abs(b.beta - CURVE.beta2585)).toBeLessThan(1);
  });

  it("suggests fit points that exist in the table and span it", () => {
    for (const c of CURVE.suggestedFitC) {
      expect(CURVE.table.some(([t]) => t === c)).toBe(true);
    }
    expect(CURVE.suggestedFitC[0]).toBe(CURVE.table[0]![0]);
    expect(CURVE.suggestedFitC[2] - CURVE.suggestedFitC[0]).toBeGreaterThan(150);
  });
});
