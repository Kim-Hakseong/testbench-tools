import { describe, expect, it } from "vitest";
import { simulateEdge, unseenPulses, type EdgeModel } from "./plcedge";
import vectors from "../vectors/plcedge.json";

describe("plc edge goldens (hand-worked from spec/plc-edge-semantics.md)", () => {
  for (const c of vectors.cases) {
    describe(c.name, () => {
      for (const [key, want] of Object.entries(c.expect)) {
        it(key, () => {
          const [model, opt] = key.split("|") as [EdgeModel, string | undefined];
          const r = simulateEdge({ model, ...c.input, memoryInit: opt === "memInit=true" });
          if (!r.ok) throw new Error(r.error);
          expect(r.pulses).toEqual(want);
        });
      }
    });
  }

  it("OSR passes the rung through; ONS's rung-out is the pulse", () => {
    const input = vectors.cases[0]!.input;
    const osr = simulateEdge({ model: "ab-osr", ...input });
    const ons = simulateEdge({ model: "ab-ons", ...input });
    if (!osr.ok || !ons.ok) throw new Error("sim");
    expect(osr.samples.filter((s) => s.rungOut).map((s) => s.t)).toEqual(vectors.rungOut["ab-osr"]);
    expect(ons.samples.filter((s) => s.pulse).map((s) => s.t)).toEqual(vectors.rungOut["ab-ons"]);
  });
});

describe("rules that hold for any input", () => {
  const input = { scanMs: 7, durationMs: 700, inToggles: [0, 15, 16, 40, 90, 91, 300, 301, 302, 500] };

  it("a pulse never lasts two scans", () => {
    for (const m of ["iec-rising", "iec-falling", "ab-ons", "ab-osr", "ab-osf"] as const) {
      const r = simulateEdge({ model: m, ...input });
      if (!r.ok) throw new Error(r.error);
      for (let i = 1; i < r.samples.length; i++) expect(r.samples[i]!.pulse && r.samples[i - 1]!.pulse).toBe(false);
    }
  });

  it("after the first scan, ONS, OSR and IEC rising agree", () => {
    const a = simulateEdge({ model: "iec-rising", ...input, memoryInit: true });
    const b = simulateEdge({ model: "ab-ons", ...input });
    const c = simulateEdge({ model: "ab-osr", ...input });
    if (!a.ok || !b.ok || !c.ok) throw new Error("sim");
    expect(b.pulses).toEqual(a.pulses);
    expect(c.pulses).toEqual(a.pulses);
  });

  it("OSF and IEC falling agree when the memory starts FALSE", () => {
    const a = simulateEdge({ model: "iec-falling", ...input, memoryInit: false });
    const b = simulateEdge({ model: "ab-osf", ...input });
    if (!a.ok || !b.ok) throw new Error("sim");
    expect(b.pulses).toEqual(a.pulses);
  });

  it("rejects bad parameters", () => {
    expect(simulateEdge({ model: "ab-ons", scanMs: 0, durationMs: 10, inToggles: [] }).ok).toBe(false);
    expect(simulateEdge({ model: "ab-ons", scanMs: 10, durationMs: 5, inToggles: [] }).ok).toBe(false);
  });
});

describe("unseenPulses", () => {
  it("finds TRUE pulses and FALSE gaps that fall between scans", () => {
    // TRUE 12–18 sits between scans 10 and 20; TRUE 30–45 is seen at 30 and 40.
    expect(unseenPulses([12, 18, 30, 45], 10, true)).toEqual([12]);
    // FALSE 45–48 is between scans 40 and 50; a pulse starting on a scan is seen.
    expect(unseenPulses([0, 45, 48], 10, false)).toEqual([45]);
    expect(unseenPulses([20, 21], 10, true)).toEqual([]);
  });
});
