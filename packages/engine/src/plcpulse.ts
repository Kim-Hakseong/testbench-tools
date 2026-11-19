// Mitsubishi PLS/PLF and LDP/LDF, LS OUTP/OUTN and LOADP/LOADN, scan by scan.
//
// The two vendors document the same behaviour (spec/plc-pulse-semantics.md
// §5), so the vendor only changes the mnemonics shown. Each pulse instruction
// keeps its own previous state and updates it only when it executes
// (assumption E1); the first scan's previous state is a user input (E2).

import { levelAt, MAX_SCANS } from "./plctimer";

export type PulseScenario = "pulse-basics" | "jumped-pulse";
export type PulseVendor = "mitsubishi" | "ls";

/** Rungs in execution order, per vendor, for display. */
export const PULSE_PROGRAMS: Record<PulseScenario, Record<PulseVendor, string[]>> = {
  "pulse-basics": {
    mitsubishi: [
      "1  LD   M0   OUT Y1     reads M0 above the PLS",
      "2  LDP  X    OUT M1     pulse contact",
      "3  LD   X    PLS M0     pulse coil",
      "4  LDF  X    OUT M3",
      "5  LD   X    PLF M2",
      "6  LD   M0   OUT Y2     reads M0 below the PLS",
    ],
    ls: [
      "1  LOAD   M0   OUT  Y1    reads M0 above the OUTP",
      "2  LOADP  X    OUT  M1    pulse contact",
      "3  LOAD   X    OUTP M0    pulse coil",
      "4  LOADN  X    OUT  M3",
      "5  LOAD   X    OUTN M2",
      "6  LOAD   M0   OUT  Y2    reads M0 below the OUTP",
    ],
  },
  "jumped-pulse": {
    mitsubishi: ["1  LD  J    CJ  P0", "2  LD  X    PLS M0", "3  P0  (label)"],
    ls: ["1  LOAD J    JMP  L0", "2  LOAD X    OUTP M0", "3  LABEL L0"],
  },
};

/** Signals each scenario reports, in display order. */
export const PULSE_SIGNALS: Record<PulseScenario, string[]> = {
  "pulse-basics": ["X", "M1", "M0", "M3", "M2", "Y1", "Y2"],
  "jumped-pulse": ["X", "J", "skipped", "M0"],
};

export interface PulseSimInput {
  scenario: PulseScenario;
  scanMs: number;
  durationMs: number;
  xToggles: number[];
  jToggles?: number[];
  /** Previous state every pulse instruction assumes on the first scan (E2). */
  memoryInit?: boolean;
}

export interface PulseSample {
  t: number;
  v: Record<string, boolean>;
  /** jumped-pulse only: the PLS/OUTP executed this scan and found an edge. */
  fired?: boolean;
}

export type PulseSimResult = { ok: true; samples: PulseSample[] } | { ok: false; error: string };

/** One pulse instruction with its own previous-state memory (E1). */
function edge(rising: boolean, init: boolean) {
  let prev = init;
  return (now: boolean) => {
    const hit = rising ? !prev && now : prev && !now;
    prev = now;
    return hit;
  };
}

export function simulatePulse(input: PulseSimInput): PulseSimResult {
  const { scenario, scanMs, durationMs } = input;
  const init = input.memoryInit ?? false;
  const xT = [...input.xToggles].sort((a, b) => a - b);
  const jT = [...(input.jToggles ?? [])].sort((a, b) => a - b);
  if (!Number.isInteger(scanMs) || scanMs < 1) return { ok: false, error: "Scan time must be a whole number of milliseconds, 1 or more" };
  if (!Number.isInteger(durationMs) || durationMs < scanMs) return { ok: false, error: "Duration must be at least one scan" };
  if (Math.floor(durationMs / scanMs) + 1 > MAX_SCANS) return { ok: false, error: `Too many scans — keep duration ÷ scan time under ${MAX_SCANS}` };
  for (const x of [...xT, ...jT]) if (!Number.isFinite(x) || x < 0) return { ok: false, error: "Toggle times must be 0 ms or later" };

  const samples: PulseSample[] = [];
  if (scenario === "pulse-basics") {
    const ldp = edge(true, init), pls = edge(true, init), ldf = edge(false, init), plf = edge(false, init);
    let m0 = false, m2 = false; // device bits start OFF
    for (let t = 0; t <= durationMs; t += scanMs) {
      const x = levelAt(xT, t);
      const y1 = m0; // rung 1 runs before the PLS (P1)
      const m1 = ldp(x); // rung 2: the contact is the rung result
      m0 = pls(x); // rung 3: ON for one scan, OFF "in other cases"
      const m3 = ldf(x); // rung 4
      m2 = plf(x); // rung 5
      const y2 = m0; // rung 6
      samples.push({ t, v: { X: x, M1: m1, M0: m0, M3: m3, M2: m2, Y1: y1, Y2: y2 } });
    }
  } else {
    const pls = edge(true, init);
    let m0 = false;
    for (let t = 0; t <= durationMs; t += scanMs) {
      const x = levelAt(xT, t);
      const j = levelAt(jT, t);
      // §3: a true CJ/JMP skips rung 2; the skipped PLS writes nothing and
      // does not update its memory (J1, E1).
      let fired = false;
      if (!j) m0 = fired = pls(x);
      samples.push({ t, v: { X: x, J: j, skipped: j, M0: m0 }, fired });
    }
  }
  return { ok: true, samples };
}

/** Scan times at which a signal is TRUE. */
export function pulseOn(samples: PulseSample[], signal: string): number[] {
  return samples.filter((s) => s.v[signal]).map((s) => s.t);
}

/**
 * jumped-pulse: scans where the sampled input rose but the PLS/OUTP never
 * fired for it — it next ran with the input still TRUE and its memory TRUE
 * (J2), or never ran again before the input fell.
 */
export function lostRisingEdges(samples: PulseSample[], init: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    const before = i > 0 ? samples[i - 1]!.v.X : init;
    if (before || !samples[i]!.v.X) continue;
    let k = i;
    while (k < samples.length && samples[k]!.v.skipped && samples[k]!.v.X) k++;
    if (k < samples.length && samples[k]!.v.X && !samples[k]!.fired) out.push(samples[i]!.t);
    else if (k < samples.length && !samples[k]!.v.X) out.push(samples[i]!.t);
  }
  return out;
}
