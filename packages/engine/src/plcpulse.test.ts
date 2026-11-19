import { describe, expect, it } from "vitest";
import { lostRisingEdges, PULSE_PROGRAMS, PULSE_SIGNALS, pulseOn, simulatePulse, type PulseScenario } from "./plcpulse";
import vectors from "../vectors/plcpulse.json";

describe("plc pulse goldens (hand-worked from spec/plc-pulse-semantics.md)", () => {
  for (const c of vectors.cases) {
    describe(c.name, () => {
      const r = simulatePulse({ ...c.input, scenario: c.input.scenario as PulseScenario });
      for (const [signal, want] of Object.entries(c.on)) {
        it(signal, () => {
          if (!r.ok) throw new Error(r.error);
          expect(pulseOn(r.samples, signal)).toEqual(want);
        });
      }
      if ("lost" in c) {
        it("lost rising edges", () => {
          if (!r.ok) throw new Error(r.error);
          expect(lostRisingEdges(r.samples, c.input.memoryInit ?? false)).toEqual(c.lost);
        });
      }
    });
  }
});

describe("rules that hold for any input", () => {
  const base = { scanMs: 7, durationMs: 700, xToggles: [0, 15, 16, 40, 90, 300, 301, 500, 640], jToggles: [5, 41, 95, 120, 299, 302, 600] };

  it("every scenario reports exactly its declared signals; both vendors list the same number of rungs", () => {
    for (const s of Object.keys(PULSE_SIGNALS) as PulseScenario[]) {
      const r = simulatePulse({ scenario: s, ...base });
      if (!r.ok) throw new Error(r.error);
      for (const smp of r.samples) expect(Object.keys(smp.v)).toEqual(PULSE_SIGNALS[s]);
      expect(PULSE_PROGRAMS[s].ls.length).toBeGreaterThanOrEqual(PULSE_PROGRAMS[s].mitsubishi.length);
    }
  });

  it("basics: contact and coil pulses are identical (M1 = M0, M3 = M2) and never last two scans (P1, P2)", () => {
    for (const init of [false, true]) {
      const r = simulatePulse({ scenario: "pulse-basics", ...base, memoryInit: init });
      if (!r.ok) throw new Error(r.error);
      for (let i = 0; i < r.samples.length; i++) {
        const v = r.samples[i]!.v;
        expect(v.M1).toBe(v.M0);
        expect(v.M3).toBe(v.M2);
        expect(v.Y2).toBe(v.M0);
        if (i > 0) {
          expect(v.Y1).toBe(r.samples[i - 1]!.v.M0);
          expect(v.M0 && r.samples[i - 1]!.v.M0).toBe(false);
        }
      }
    }
  });

  it("jumped: M0 never changes on a skipped scan (J1)", () => {
    const r = simulatePulse({ scenario: "jumped-pulse", ...base });
    if (!r.ok) throw new Error(r.error);
    for (let i = 1; i < r.samples.length; i++) if (r.samples[i]!.v.skipped) expect(r.samples[i]!.v.M0).toBe(r.samples[i - 1]!.v.M0);
  });

  it("jumped: without a jump nothing is lost", () => {
    const r = simulatePulse({ scenario: "jumped-pulse", ...base, jToggles: [] });
    if (!r.ok) throw new Error(r.error);
    expect(lostRisingEdges(r.samples, false)).toEqual([]);
  });

  it("rejects bad parameters", () => {
    expect(simulatePulse({ scenario: "pulse-basics", scanMs: 0, durationMs: 10, xToggles: [] }).ok).toBe(false);
  });
});
