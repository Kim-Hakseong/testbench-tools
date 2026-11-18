import { describe, expect, it } from "vitest";
import { levelAt, parseToggles, simulateTimer, type TimerModel } from "./plctimer";
import vectors from "../vectors/plctimer.json";

describe("plc timer goldens (hand-worked from spec/plc-timer-semantics.md)", () => {
  for (const c of vectors.cases) {
    describe(c.name, () => {
      for (const [model, want] of Object.entries(c.models)) {
        it(model, () => {
          const r = simulateTimer({ model: model as TimerModel, ...c.input });
          if (!r.ok) throw new Error(r.error);
          expect(r.events.map((e) => [e.t, e.signal, e.to, e.value])).toEqual(want.events);
          for (const [t, field, value] of want.checks as [number, string, number][]) {
            const s = r.samples.find((x) => x.t === t);
            expect(s, `scan at ${t} ms`).toBeDefined();
            expect((s as unknown as Record<string, unknown>)[field], `${field} at ${t} ms`).toBe(value);
          }
        });
      }
    });
  }
});

describe("rules that hold for any input", () => {
  const input = { presetMs: 70, scanMs: 15, durationMs: 1200, inToggles: [10, 400, 430, 900], resetToggles: [1000, 1030] };
  const models: TimerModel[] = ["iec-ton", "iec-tof", "iec-tp", "s7-tonr", "ab-ton", "ab-tof", "ab-rto"];

  it("IEC ET never exceeds PT (Siemens: clamped at the preset value)", () => {
    for (const m of ["iec-ton", "iec-tof", "iec-tp", "s7-tonr"] as const) {
      const r = simulateTimer({ model: m, ...input });
      if (!r.ok) throw new Error(r.error);
      expect(Math.max(...r.samples.map((s) => s.et!))).toBeLessThanOrEqual(70);
    }
  });

  it("outputs only change on a scan", () => {
    for (const m of models) {
      const r = simulateTimer({ model: m, ...input });
      if (!r.ok) throw new Error(r.error);
      for (const e of r.events) expect(e.t % 15).toBe(0);
    }
  });

  it("Logix TON: TT and DN are never TRUE together, and EN follows the rung", () => {
    const r = simulateTimer({ model: "ab-ton", ...input });
    if (!r.ok) throw new Error(r.error);
    for (const s of r.samples) {
      expect(s.tt && s.dn).toBe(false);
      expect(s.en).toBe(s.in);
    }
  });

  it("IEC TON and Logix TON agree on when the output turns on", () => {
    const a = simulateTimer({ model: "iec-ton", ...input });
    const b = simulateTimer({ model: "ab-ton", ...input });
    if (!a.ok || !b.ok) throw new Error("sim");
    expect(a.samples.map((s) => s.q)).toEqual(b.samples.map((s) => s.dn));
  });

  it("IEC TOF Q and Logix TOF DN agree after the first rising edge", () => {
    const a = simulateTimer({ model: "iec-tof", ...input });
    const b = simulateTimer({ model: "ab-tof", ...input });
    if (!a.ok || !b.ok) throw new Error("sim");
    expect(a.samples.map((s) => s.q)).toEqual(b.samples.map((s) => s.dn));
  });

  it("zero preset: IEC TON turns on in the rising scan, Logix TON one scan later", () => {
    const a = simulateTimer({ model: "iec-ton", presetMs: 0, scanMs: 10, durationMs: 50, inToggles: [10] });
    const b = simulateTimer({ model: "ab-ton", presetMs: 0, scanMs: 10, durationMs: 50, inToggles: [10] });
    if (!a.ok || !b.ok) throw new Error("sim");
    expect(a.events[0]).toMatchObject({ t: 10, signal: "Q", to: true });
    expect(b.events.find((e) => e.signal === "DN")).toMatchObject({ t: 20, to: true });
  });
});

describe("inputs", () => {
  it("levelAt flips at each toggle, inclusive", () => {
    expect([0, 99, 100, 199, 200].map((t) => levelAt([100, 200], t))).toEqual([false, false, true, true, false]);
  });

  it("parseToggles accepts commas, spaces and an ms suffix", () => {
    expect(parseToggles("400, 100 250ms")).toEqual({ ok: true, value: [100, 250, 400] });
    expect(parseToggles("")).toEqual({ ok: true, value: [] });
    expect(parseToggles("1.5").ok).toBe(false);
    expect(parseToggles("-3").ok).toBe(false);
  });

  it("rejects bad parameters instead of guessing", () => {
    const base = { model: "iec-ton" as const, presetMs: 100, scanMs: 10, durationMs: 100, inToggles: [] };
    expect(simulateTimer({ ...base, scanMs: 0 }).ok).toBe(false);
    expect(simulateTimer({ ...base, presetMs: -1 }).ok).toBe(false);
    expect(simulateTimer({ ...base, durationMs: 5 }).ok).toBe(false);
    expect(simulateTimer({ ...base, scanMs: 1, durationMs: 100000 }).ok).toBe(false);
  });
});
