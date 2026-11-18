import { describe, expect, it } from "vitest";
import { onScans, SCAN_SIGNALS, simulateScan, type ScanScenario } from "./plcscan";
import vectors from "../vectors/plcscan.json";

describe("plc scan-order goldens (hand-worked from spec/plc-scan-order-semantics.md)", () => {
  for (const c of vectors.cases) {
    describe(c.name, () => {
      const r = simulateScan({ ...c.input, scenario: c.input.scenario as ScanScenario });
      for (const [signal, want] of Object.entries(c.on)) {
        it(signal, () => {
          if (!r.ok) throw new Error(r.error);
          expect(onScans(r.samples, signal)).toEqual(want);
        });
      }
    });
  }
});

describe("rules that hold for any input", () => {
  const input = { scanMs: 7, durationMs: 700, aToggles: [0, 15, 16, 40, 90, 300, 301, 500], bToggles: [5, 41, 95, 120, 299, 302] };

  it("every scenario reports exactly its declared signals", () => {
    for (const s of Object.keys(SCAN_SIGNALS) as ScanScenario[]) {
      const r = simulateScan({ scenario: s, ...input });
      if (!r.ok) throw new Error(r.error);
      for (const smp of r.samples) expect(Object.keys(smp.v)).toEqual(SCAN_SIGNALS[s]);
    }
  });

  it("double coil: the output equals B and Z equals A, whatever A does", () => {
    const r = simulateScan({ scenario: "double-coil", ...input });
    if (!r.ok) throw new Error(r.error);
    for (const s of r.samples) {
      expect(s.v["Y at end of scan"]).toBe(s.v.B);
      expect(s.v.Z).toBe(s.v.A);
    }
  });

  it("one-shot: Above is Below delayed by exactly one scan", () => {
    const r = simulateScan({ scenario: "one-shot-order", ...input });
    if (!r.ok) throw new Error(r.error);
    for (let i = 1; i < r.samples.length; i++) expect(r.samples[i]!.v.Above).toBe(r.samples[i - 1]!.v.Below);
  });

  it("set-reset: RS, unlatch-last and seal-in agree; SR and latch-last agree", () => {
    const r = simulateScan({ scenario: "set-reset", ...input });
    if (!r.ok) throw new Error(r.error);
    for (const s of r.samples) {
      expect(s.v["OTL→OTU"]).toBe(s.v.RS);
      expect(s.v["seal-in"]).toBe(s.v.RS);
      expect(s.v["OTU→OTL"]).toBe(s.v.SR);
    }
  });

  it("rejects bad parameters", () => {
    expect(simulateScan({ scenario: "double-coil", scanMs: 0, durationMs: 10, aToggles: [] }).ok).toBe(false);
  });
});
