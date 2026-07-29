import { describe, expect, it } from "vitest";
import {
  K_EXPONENTIAL,
  THERMOCOUPLE_TYPES,
  THERMOCOUPLE_TYPE_IDS,
  tcTemperature,
  tcVoltage,
  tcWithColdJunction,
  thermocoupleInfo,
  type ThermocoupleType,
} from "./thermocouple";
import vectors from "../vectors/thermocouple.json";

const uv = (mv: number) => mv * 1000;

function voltageUv(type: string, celsius: number): number {
  const r = tcVoltage(type, celsius);
  if (!r.ok) throw new Error(`${type} @ ${celsius} °C: ${r.error}`);
  return uv(r.millivolts);
}

describe("§ T → V against the NIST Monograph 175 reference tables", () => {
  const { toleranceUv, types } = vectors.directTables;

  for (const [id, spec] of Object.entries(types)) {
    it(`type ${id} matches table ${spec.table} at every quoted point`, () => {
      for (const point of spec.points) {
        const celsius = point[0]!;
        const expectedUv = point[1]!;
        const got = voltageUv(id, celsius);
        expect(Math.abs(got - expectedUv), `${id} @ ${celsius} °C → ${got} µV`).toBeLessThanOrEqual(
          toleranceUv,
        );
      }
    });
  }

  // Asserted separately because the type J table drops the decimal above 760 °C.
  it("type J matches the microvolt-rounded part of table 6.3.3", () => {
    const coarse = types.J.pointsRoundedToMicrovolt;
    for (const point of coarse.points) {
      expect(Math.abs(voltageUv("J", point[0]!) - point[1]!)).toBeLessThanOrEqual(
        coarse.toleranceUv,
      );
    }
  });

  it("0 °C produces exactly 0 mV for every type that reaches it", () => {
    for (const info of THERMOCOUPLE_TYPES) {
      if (info.minC > 0) continue;
      const r = tcVoltage(info.id, 0);
      expect(r.ok).toBe(true);
      // Only type K has a non-zero constant term, cancelled by the exponential.
      if (r.ok) expect(uv(r.millivolts)).toBeCloseTo(0, 3);
    }
  });
});

describe("§ type K exponential term above 0 °C", () => {
  const k = vectors.typeKExponential;

  it("carries NIST's a0, a1 and a2", () => {
    expect(K_EXPONENTIAL.a0).toBe(k.a0Mv);
    expect(K_EXPONENTIAL.a1).toBe(k.a1);
    expect(K_EXPONENTIAL.a2).toBe(k.a2);
  });

  it("is attached to the 0…1372 °C subrange only", () => {
    const info = thermocoupleInfo("K")!;
    expect(info.direct[0]!.exponential).toBeUndefined();
    expect(info.direct[1]!.exponential).toBe(K_EXPONENTIAL);
    // Every other type is a plain polynomial — a wrong copy-paste would show here.
    for (const other of THERMOCOUPLE_TYPES) {
      if (other.id === "K") continue;
      for (const sub of other.direct) expect(sub.exponential).toBeUndefined();
    }
  });

  it("contributes ~108.8 µV at 100 °C, which is what makes the table value come out", () => {
    const info = thermocoupleInfo("K")!;
    const above = info.direct[1]!;
    // Horner over the polynomial alone — i.e. the same module with the
    // exponential deliberately left out.
    let polyOnly = 0;
    for (let i = above.coefficients.length - 1; i >= 0; i--) {
      polyOnly = polyOnly * 100 + above.coefficients[i]!;
    }
    expect(uv(polyOnly)).toBeCloseTo(k.polynomialOnlyAt100C_uv, 1);

    const withTerm = voltageUv("K", 100);
    expect(withTerm - uv(polyOnly)).toBeCloseTo(k.contributionAt100C_uv, 1);

    // The polynomial alone is a plausible-looking number that is ~2.7 °C low.
    const quotedAt100 = vectors.directTables.types.K.points.find((p) => p[0] === 100)![1]!;
    expect(Math.abs(uv(polyOnly) - quotedAt100)).toBeGreaterThan(100);
    expect(Math.abs(withTerm - quotedAt100)).toBeLessThanOrEqual(vectors.directTables.toleranceUv);
  });

  it("contributes exactly a0 at t = a2", () => {
    const info = thermocoupleInfo("K")!;
    const above = info.direct[1]!;
    let polyOnly = 0;
    for (let i = above.coefficients.length - 1; i >= 0; i--) {
      polyOnly = polyOnly * K_EXPONENTIAL.a2 + above.coefficients[i]!;
    }
    expect(voltageUv("K", K_EXPONENTIAL.a2) - uv(polyOnly)).toBeCloseTo(uv(K_EXPONENTIAL.a0), 6);
  });
});

describe("§ inverse subranges match NIST's published bounds", () => {
  for (const [id, spec] of Object.entries(vectors.inverseSubranges.types)) {
    it(`type ${id} declares ${spec.length} subrange(s) with NIST's bounds and error bands`, () => {
      const info = thermocoupleInfo(id)!;
      expect(info.inverse).toHaveLength(spec.length);
      spec.forEach((want, i) => {
        const got = info.inverse[i]!;
        expect([got.minMv, got.maxMv]).toEqual(want.mv);
        expect([got.minC, got.maxC]).toEqual(want.celsius);
        expect([got.errorMinC, got.errorMaxC]).toEqual(want.errorC);
      });
    });
  }
});

describe("§ V → T round-trips inside NIST's stated error band", () => {
  const { steps, slackC } = vectors.inverseRoundTrip;

  for (const info of THERMOCOUPLE_TYPES) {
    it(`type ${info.id} inverse stays within its published band on every subrange`, () => {
      for (const sub of info.inverse) {
        let worstLow = 0;
        let worstHigh = 0;
        let checked = 0;
        for (let i = 0; i <= steps; i++) {
          const t = sub.minC + ((sub.maxC - sub.minC) * i) / steps;
          if (t < info.minC || t > info.maxC) continue;
          const forward = tcVoltage(info.id, t);
          expect(forward.ok).toBe(true);
          if (!forward.ok) continue;
          const back = tcTemperature(info.id, forward.millivolts);
          expect(back.ok).toBe(true);
          if (!back.ok) continue;
          // Overlapping R/S subranges: only score the piece actually selected.
          if (back.subrange !== sub) continue;
          checked++;
          const residual = back.celsius - t;
          worstLow = Math.min(worstLow, residual);
          worstHigh = Math.max(worstHigh, residual);
          // Never assert exact equality — this is a fit, not an inverse.
          expect(residual).toBeGreaterThanOrEqual(sub.errorMinC - slackC);
          expect(residual).toBeLessThanOrEqual(sub.errorMaxC + slackC);
        }
        expect(checked).toBeGreaterThan(0);
        // The band must also be tight: a mis-typed coefficient would either
        // blow the assert above or leave the residual suspiciously flat.
        expect(Math.max(-worstLow, worstHigh)).toBeLessThan(1);
      }
    });
  }

  it("reports the band that belongs to the subrange it used", () => {
    const r = tcTemperature("K", 30);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.subrange.minC).toBe(500);
    expect(r.errorMinC).toBe(-0.05);
    expect(r.errorMaxC).toBe(0.06);
  });

  it("names the subrange used for T → V too", () => {
    const below = tcVoltage("K", -50);
    const above = tcVoltage("K", 50);
    expect(below.ok && below.subrange.maxC).toBe(0);
    expect(above.ok && above.subrange.minC).toBe(0);
  });
});

describe("§ out-of-range inputs are refused, not extrapolated", () => {
  it("refuses temperatures outside each type's reference function", () => {
    for (const c of vectors.outOfRange.voltage) {
      const r = tcVoltage(c.type, c.celsius);
      expect(r.ok, `${c.type} @ ${c.celsius} °C`).toBe(false);
      if (!r.ok) expect(r.error).toContain(`Type ${c.type}`);
    }
  });

  it("refuses voltages outside each type's published inverse", () => {
    for (const c of vectors.outOfRange.temperature) {
      const r = tcTemperature(c.type, c.mv);
      expect(r.ok, `${c.type} @ ${c.mv} mV`).toBe(false);
    }
  });

  it("accepts the exact boundary values it rejects just beyond", () => {
    for (const info of THERMOCOUPLE_TYPES) {
      expect(tcVoltage(info.id, info.minC).ok).toBe(true);
      expect(tcVoltage(info.id, info.maxC).ok).toBe(true);
      expect(tcTemperature(info.id, info.minMv).ok).toBe(true);
      expect(tcTemperature(info.id, info.maxMv).ok).toBe(true);
    }
  });

  it("still answers at a type's rated limit, where NIST's printed bound rounds short", () => {
    const spec = vectors.publishedBoundRounding;
    for (const c of spec.cases) {
      const forward = tcVoltage(c.type, c.celsius);
      expect(forward.ok, `${c.type} @ ${c.celsius} °C`).toBe(true);
      if (!forward.ok) continue;
      // The printed bound really is just this value rounded to 0.001 mV.
      expect(Math.abs(forward.millivolts - c.publishedMv)).toBeLessThanOrEqual(spec.maxGapMv);
      // …so a thermocouple sitting at its rated limit must not be refused.
      const back = tcTemperature(c.type, forward.millivolts);
      expect(back.ok, `${c.type} @ ${forward.millivolts} mV`).toBe(true);
      if (back.ok) expect(Math.abs(back.celsius - c.celsius)).toBeLessThan(0.2);
      // The published bound itself keeps working too.
      expect(tcTemperature(c.type, c.publishedMv).ok).toBe(true);
    }
  });

  it("rejects unknown types and non-finite inputs", () => {
    expect(tcVoltage("Q", 100).ok).toBe(false);
    expect(tcTemperature("Q", 4).ok).toBe(false);
    expect(tcWithColdJunction("Q", 4, 25).ok).toBe(false);
    expect(tcVoltage("K", Number.NaN).ok).toBe(false);
    expect(tcTemperature("K", Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(tcWithColdJunction("K", Number.NaN, 25).ok).toBe(false);
  });
});

describe("§ cold-junction compensation", () => {
  const cj = vectors.coldJunction;

  it("recovers the hot junction from a reading taken against a 25 °C cold junction", () => {
    const r = tcWithColdJunction(cj.type, cj.measuredMv, cj.coldJunctionC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(uv(r.coldJunctionMv)).toBeCloseTo(cj.coldJunctionUv, 0);
    expect(uv(r.totalMv)).toBeCloseTo(cj.hotJunctionUv, 0);
    expect(r.celsius).toBeCloseTo(cj.hotJunctionC, 0);
    expect(Math.abs(r.celsius - cj.hotJunctionC)).toBeLessThanOrEqual(cj.toleranceC);
    expect(r.errorMinC).toBe(-0.05);
    expect(r.errorMaxC).toBe(0.04);
  });

  it("adding the cold-junction temperature instead of its voltage misses by degrees", () => {
    const uncompensated = tcTemperature(cj.type, cj.measuredMv);
    expect(uncompensated.ok).toBe(true);
    if (!uncompensated.ok) return;
    const naive = uncompensated.celsius + cj.coldJunctionC;
    expect(Math.abs(naive - cj.hotJunctionC)).toBeGreaterThan(cj.naiveAddTemperatureMinErrorC);
  });

  it("a cold junction at 0 °C is the same as no compensation", () => {
    const compensated = tcWithColdJunction("K", 20.644, 0);
    const plain = tcTemperature("K", 20.644);
    expect(compensated.ok && plain.ok).toBe(true);
    if (compensated.ok && plain.ok) {
      expect(compensated.coldJunctionMv).toBe(0);
      expect(compensated.celsius).toBe(plain.celsius);
    }
  });

  it("round-trips a swept hot junction through an arbitrary cold junction", () => {
    for (const coldC of [-20, 0, 23, 50, 80]) {
      const cold = tcVoltage("K", coldC);
      expect(cold.ok).toBe(true);
      if (!cold.ok) continue;
      for (const hotC of [-100, 0, 100, 500, 900, 1300]) {
        const hot = tcVoltage("K", hotC);
        if (!hot.ok) continue;
        const measured = hot.millivolts - cold.millivolts;
        const r = tcWithColdJunction("K", measured, coldC);
        expect(r.ok, `hot ${hotC} °C, cold ${coldC} °C`).toBe(true);
        if (r.ok) expect(Math.abs(r.celsius - hotC)).toBeLessThan(0.1);
      }
    }
  });

  it("refuses a cold junction outside the type's range, naming it as the cause", () => {
    const r = tcWithColdJunction("K", 4, -300);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Cold junction");
  });

  it("refuses when compensation pushes the total past the inverse range", () => {
    // 54.886 mV is already type K's ceiling; any positive cold junction overflows.
    const r = tcWithColdJunction("K", 54.886, 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("mV");
  });
});

describe("§ type metadata", () => {
  it("exposes all eight letter-designated types", () => {
    expect(THERMOCOUPLE_TYPES).toHaveLength(8);
    expect([...THERMOCOUPLE_TYPE_IDS].sort()).toEqual(["B", "E", "J", "K", "N", "R", "S", "T"]);
    for (const id of THERMOCOUPLE_TYPE_IDS) expect(thermocoupleInfo(id)!.id).toBe(id);
    expect(thermocoupleInfo("k")).toBeNull();
  });

  it("declares subranges that tile the reference range without gaps", () => {
    for (const info of THERMOCOUPLE_TYPES) {
      expect(info.direct[0]!.minC).toBe(info.minC);
      expect(info.direct[info.direct.length - 1]!.maxC).toBe(info.maxC);
      for (let i = 1; i < info.direct.length; i++) {
        expect(info.direct[i]!.minC).toBe(info.direct[i - 1]!.maxC);
      }
    }
  });

  it("keeps the inverse voltage span consistent with its subranges", () => {
    for (const info of THERMOCOUPLE_TYPES) {
      const lows = info.inverse.map((s) => s.minMv);
      const highs = info.inverse.map((s) => s.maxMv);
      expect(info.minMv).toBe(Math.min(...lows));
      expect(info.maxMv).toBe(Math.max(...highs));
      expect(info.inverseMinC).toBe(Math.min(...info.inverse.map((s) => s.minC)));
      expect(info.inverseMaxC).toBe(Math.max(...info.inverse.map((s) => s.maxC)));
    }
  });

  it("cites Monograph 175 for every type", () => {
    for (const info of THERMOCOUPLE_TYPES) {
      expect(info.source).toContain("Monograph 175");
      expect(info.name.length).toBeGreaterThan(0);
    }
  });

  it("notes that the inverse covers less than the reference function", () => {
    // Type K is the case engineers hit: the table goes to -270 °C, the inverse
    // only to -200 °C, so a reading below -5.891 mV has no published answer.
    const k = thermocoupleInfo("K")!;
    expect(k.minC).toBe(-270);
    expect(k.inverseMinC).toBe(-200);
    expect(tcVoltage("K", -250).ok).toBe(true);
    const belowInverse = tcVoltage("K", -250);
    if (belowInverse.ok) expect(tcTemperature("K", belowInverse.millivolts).ok).toBe(false);
  });
});
