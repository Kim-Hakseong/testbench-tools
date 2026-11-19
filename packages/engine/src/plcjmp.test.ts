import { describe, expect, it } from "vitest";
import { simulateZone, ZONE_PROGRAMS, ZONE_SIGNALS, zoneOn, type ZoneScenario } from "./plcjmp";
import vectors from "../vectors/plcjmp.json";

describe("plc JMP/MCR goldens (hand-worked from spec/plc-jmp-mcr-semantics.md)", () => {
  for (const c of vectors.cases) {
    describe(c.name, () => {
      const r = simulateZone({ ...c.input, scenario: c.input.scenario as ZoneScenario });
      const at = (t: string) => {
        if (!r.ok) throw new Error(r.error);
        const s = r.samples.find((x) => x.t === Number(t));
        if (!s) throw new Error(`no scan at ${t}`);
        return s;
      };
      for (const [signal, want] of Object.entries(c.on)) {
        it(`${signal} TRUE scans`, () => {
          if (!r.ok) throw new Error(r.error);
          expect(zoneOn(r.samples, signal)).toEqual(want);
        });
      }
      for (const [signal, byT] of Object.entries(c.at as Record<string, Record<string, number>>)) {
        it(`${signal} values`, () => {
          for (const [t, want] of Object.entries(byT)) expect([t, at(t).v[signal]]).toEqual([t, want]);
        });
      }
      for (const [t, want] of Object.entries(c.skipped as Record<string, number[]>)) {
        it(`rungs skipped at ${t} ms`, () => expect(at(t).skipped).toEqual(want));
      }
    });
  }
});

describe("rules that hold for any input", () => {
  const base = { scanMs: 7, durationMs: 900, presetMs: 60, aToggles: [0, 33, 34, 120, 300, 301, 520], eToggles: [5, 90, 200, 410, 411, 600], xToggles: [14, 250, 251, 700] };
  const run = (scenario: ZoneScenario) => {
    const r = simulateZone({ scenario, ...base });
    if (!r.ok) throw new Error(r.error);
    return r.samples;
  };

  it("every scenario reports exactly its declared signals, and lists its rungs", () => {
    for (const s of Object.keys(ZONE_SIGNALS) as ZoneScenario[]) {
      for (const smp of run(s)) expect(Object.keys(smp.v)).toEqual(ZONE_SIGNALS[s]);
      expect(ZONE_PROGRAMS[s].length).toBeGreaterThan(2);
    }
  });

  it("JMP: on a skipped scan nothing inside the zone changes (J1, J2)", () => {
    const s = run("jmp-zone");
    for (let i = 1; i < s.length; i++) {
      if (s[i]!.skipped.length === 0) continue;
      for (const k of ["Y", "T1.ACC", "T1.DN", "T2.DN", "T3.ACC"]) expect(s[i]!.v[k]).toBe(s[i - 1]!.v[k]);
    }
  });

  it("MCR: while E is FALSE, Y is FALSE and the TON is cleared (M1, M2)", () => {
    for (const smp of run("mcr-zone")) {
      if (smp.v.E) continue;
      expect(smp.v.Y).toBe(false);
      expect(smp.v["T1.ACC"]).toBe(0);
      expect(smp.skipped).toEqual([]);
    }
  });

  it("MCR: RTO ACC never drops while the zone is disabled (M4)", () => {
    const s = run("mcr-zone");
    for (let i = 1; i < s.length; i++) if (!s[i]!.v.E) expect(s[i]!.v["T3.ACC"]).toBe(s[i - 1]!.v["T3.ACC"]);
  });

  it("conditional end MCR: Y2 = A AND (NOT E OR X) (M5)", () => {
    for (const smp of run("mcr-open-end")) expect(smp.v.Y2).toBe(smp.v.A && (!smp.v.E || smp.v.X));
  });

  it("jump into the zone: Y2 = A AND (E OR X) (M6)", () => {
    for (const smp of run("jmp-into-mcr")) expect(smp.v.Y2).toBe(smp.v.A && (smp.v.E || smp.v.X));
  });

  it("rejects bad parameters", () => {
    expect(simulateZone({ scenario: "jmp-zone", scanMs: 0, durationMs: 10, aToggles: [], eToggles: [] }).ok).toBe(false);
    expect(simulateZone({ scenario: "jmp-zone", scanMs: 10, durationMs: 100, presetMs: -1, aToggles: [], eToggles: [] }).ok).toBe(false);
  });
});
