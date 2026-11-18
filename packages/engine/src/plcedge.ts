// PLC edge detection and one-shots, scan by scan: the IEC/Siemens memory-bit
// edge (R_TRIG / F_TRIG, P / N contacts, P_TRIG / N_TRIG) next to the
// Allen-Bradley Logix 5000 one-shots (ONS, OSR, OSF).
//
// Rules: spec/plc-edge-semantics.md (§n below). Same scan model as
// plctimer.ts: inputs sampled at t = 0, scan, 2·scan, …, one execution per
// scan.

import { levelAt, MAX_SCANS } from "./plctimer";

export type EdgeModel = "iec-rising" | "iec-falling" | "ab-ons" | "ab-osr" | "ab-osf";

export interface EdgeSimInput {
  model: EdgeModel;
  scanMs: number;
  durationMs: number;
  /** Times (ms) at which the input / rung-condition-in toggles. It starts FALSE. */
  inToggles: number[];
  /**
   * IEC side only: the memory bit's value before the first execution (§2,
   * assumption B1). Siemens leaves it to the program; Beckhoff and CODESYS do
   * not document it.
   */
  memoryInit?: boolean;
}

/**
 * One scan. `memory` is M / M_BIT (IEC) or the storage bit (Logix) after the
 * instruction ran. `pulse` is Q (IEC), rung-condition-out (ONS) or the output
 * bit (OSR, OSF). `rungOut` is the rung-condition-out of OSR / OSF.
 */
export interface EdgeSample {
  t: number;
  in: boolean;
  memory: boolean;
  pulse: boolean;
  rungOut?: boolean;
}

export type EdgeSimResult =
  | { ok: true; samples: EdgeSample[]; pulses: number[] }
  | { ok: false; error: string };

export function simulateEdge(input: EdgeSimInput): EdgeSimResult {
  const { model, scanMs, durationMs } = input;
  const inT = [...input.inToggles].sort((a, b) => a - b);
  if (!Number.isInteger(scanMs) || scanMs < 1) return { ok: false, error: "Scan time must be a whole number of milliseconds, 1 or more" };
  if (!Number.isInteger(durationMs) || durationMs < scanMs) return { ok: false, error: "Duration must be at least one scan" };
  if (Math.floor(durationMs / scanMs) + 1 > MAX_SCANS) return { ok: false, error: `Too many scans — keep duration ÷ scan time under ${MAX_SCANS}` };
  for (const x of inT) if (!Number.isFinite(x) || x < 0) return { ok: false, error: "Toggle times must be 0 ms or later" };

  const step = STEPPERS[model](input.memoryInit ?? false);
  const samples: EdgeSample[] = [];
  for (let t = 0; t <= durationMs; t += scanMs) samples.push(step(t, levelAt(inT, t)));
  return { ok: true, samples, pulses: samples.filter((s) => s.pulse).map((s) => s.t) };
}

type Stepper = (t: number, inp: boolean) => EdgeSample;

const STEPPERS: Record<EdgeModel, (memInit: boolean) => Stepper> = {
  // §2: compare with the memory bit, then store the input. Q = IN ∧ ¬M.
  "iec-rising": (memInit) => {
    let m = memInit;
    return (t, inp) => {
      const pulse = inp && !m;
      m = inp;
      return { t, in: inp, memory: m, pulse };
    };
  },

  // §2: Q = ¬IN ∧ M.
  "iec-falling": (memInit) => {
    let m = memInit;
    return (t, inp) => {
      const pulse = !inp && m;
      m = inp;
      return { t, in: inp, memory: m, pulse };
    };
  },

  // §3.1 ONS. Prescan sets storage TRUE. Rung false: storage FALSE, rung-out
  // FALSE. Rung true: storage 0 → set, rung-out TRUE; storage 1 → rung-out
  // FALSE. The pulse IS the rung-condition-out.
  "ab-ons": () => {
    let sb = true;
    return (t, inp) => {
      let out = false;
      if (!inp) sb = false;
      else if (!sb) { sb = true; out = true; }
      return { t, in: inp, memory: sb, pulse: out };
    };
  },

  // §3.2 OSR. Prescan: storage TRUE, output FALSE. Rung false: both FALSE.
  // Rung true: storage 0 → storage and output set; storage 1 → output
  // cleared. Rung-condition-out follows rung-condition-in throughout.
  "ab-osr": () => {
    let sb = true;
    return (t, inp) => {
      let ob = false;
      if (!inp) sb = false;
      else if (!sb) { sb = true; ob = true; }
      return { t, in: inp, memory: sb, pulse: ob, rungOut: inp };
    };
  },

  // §3.3 OSF. Prescan: storage FALSE, output FALSE. Rung true: storage TRUE,
  // output FALSE. Rung false: storage 1 → storage cleared, output set;
  // storage 0 → output cleared. Rung-condition-out follows rung-condition-in.
  "ab-osf": () => {
    let sb = false;
    return (t, inp) => {
      let ob = false;
      if (inp) sb = true;
      else if (sb) { sb = false; ob = true; }
      return { t, in: inp, memory: sb, pulse: ob, rungOut: inp };
    };
  },
};

/**
 * Input pulses no scan can see: intervals at `level` (TRUE pulses or FALSE
 * gaps) that end before the first scan at or after they start (§4). Returns
 * their start times.
 */
export function unseenPulses(toggles: number[], scanMs: number, level: boolean): number[] {
  const ts = [...toggles].sort((a, b) => a - b);
  const out: number[] = [];
  // Toggle i leaves the input TRUE when i is even (it starts FALSE).
  for (let i = 0; i + 1 < ts.length; i++) {
    if ((i % 2 === 0) !== level) continue;
    const start = ts[i]!, end = ts[i + 1]!;
    if (Math.ceil(start / scanMs) * scanMs >= end) out.push(start);
  }
  return out;
}
