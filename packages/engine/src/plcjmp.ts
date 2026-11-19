// JMP-skipped logic against MCR zones, scan by scan, on Logix rules.
//
// A tiny rung interpreter: each scan starts with the MCR override bit FALSE
// ("automatically reset at the end of the routine"), runs the rungs top to
// bottom, forces every rung's condition FALSE while the override is set, lets
// an MCR whose condition is FALSE toggle the override, and lets a TRUE JMP
// continue at the rung holding its LBL. Every rule is quoted in
// spec/plc-jmp-mcr-semantics.md; section marks (§, J1, M3 …) point there.

import { levelAt, logixTimer, MAX_SCANS } from "./plctimer";

export type ZoneScenario = "jmp-zone" | "mcr-zone" | "mcr-open-end" | "jmp-into-mcr";

type In = "A" | "E" | "X";
type Ins =
  | { op: "OTE"; tag: string }
  | { op: "TON" | "TOF" | "RTO"; tag: string }
  | { op: "MCR" }
  | { op: "JMP"; to: string }
  | { op: "NOP" };

interface Rung {
  /** Rung text for display. */
  text: string;
  /** LBL at the start of the rung, if any. */
  label?: string;
  /** Rung-condition-in before the MCR override. */
  when: (i: Record<In, boolean>) => boolean;
  out: Ins;
}

const always = () => true;

const ZONE_BODY: Rung[] = [
  { text: "XIC(A)  OTE(Y)", when: (i) => i.A, out: { op: "OTE", tag: "Y" } },
  { text: "XIC(A)  TON(T1)", when: (i) => i.A, out: { op: "TON", tag: "T1" } },
  { text: "XIC(A)  TOF(T2)", when: (i) => i.A, out: { op: "TOF", tag: "T2" } },
  { text: "XIC(A)  RTO(T3)", when: (i) => i.A, out: { op: "RTO", tag: "T3" } },
];

const PROGRAMS: Record<ZoneScenario, Rung[]> = {
  // §1. E FALSE jumps over the four rungs.
  "jmp-zone": [
    { text: "XIO(E)  JMP(SKIP)", when: (i) => !i.E, out: { op: "JMP", to: "SKIP" } },
    ...ZONE_BODY,
    { text: "LBL(SKIP)", label: "SKIP", when: always, out: { op: "NOP" } },
  ],
  // §2. E FALSE disables the same four rungs.
  "mcr-zone": [
    { text: "XIC(E)  MCR", when: (i) => i.E, out: { op: "MCR" } },
    ...ZONE_BODY,
    { text: "MCR", when: always, out: { op: "MCR" } },
  ],
  // §2 M5. The terminating MCR has a condition (X).
  "mcr-open-end": [
    { text: "XIC(E)  MCR", when: (i) => i.E, out: { op: "MCR" } },
    { text: "XIC(A)  OTE(Y1)", when: (i) => i.A, out: { op: "OTE", tag: "Y1" } },
    { text: "XIC(X)  MCR            ← should be unconditional", when: (i) => i.X, out: { op: "MCR" } },
    { text: "XIC(A)  OTE(Y2)        outside the zone", when: (i) => i.A, out: { op: "OTE", tag: "Y2" } },
  ],
  // §2 M6. X jumps past the starting MCR into the zone.
  "jmp-into-mcr": [
    { text: "XIC(X)  JMP(IN)", when: (i) => i.X, out: { op: "JMP", to: "IN" } },
    { text: "XIC(E)  MCR", when: (i) => i.E, out: { op: "MCR" } },
    { text: "XIC(A)  OTE(Y1)", when: (i) => i.A, out: { op: "OTE", tag: "Y1" } },
    { text: "LBL(IN)  XIC(A)  OTE(Y2)", label: "IN", when: (i) => i.A, out: { op: "OTE", tag: "Y2" } },
    { text: "MCR", when: always, out: { op: "MCR" } },
  ],
};

/** The rungs of each scenario, numbered, for display. */
export const ZONE_PROGRAMS: Record<ZoneScenario, string[]> = Object.fromEntries(
  (Object.keys(PROGRAMS) as ZoneScenario[]).map((s) => [s, PROGRAMS[s].map((r, i) => `${i + 1}  ${r.text}`)]),
) as Record<ZoneScenario, string[]>;

/** Signals each scenario reports, in display order. ".ACC" signals are numbers. */
export const ZONE_SIGNALS: Record<ZoneScenario, string[]> = {
  "jmp-zone": ["A", "E", "Y", "T1.ACC", "T1.DN", "T2.DN", "T3.ACC"],
  "mcr-zone": ["A", "E", "Y", "T1.ACC", "T1.DN", "T2.DN", "T3.ACC"],
  "mcr-open-end": ["A", "E", "X", "Y1", "Y2"],
  "jmp-into-mcr": ["A", "E", "X", "Y1", "Y2"],
};

/** Whether the scenario has timers (and so a preset) and uses input X. */
export const ZONE_USES: Record<ZoneScenario, { timers: boolean; x: boolean }> = {
  "jmp-zone": { timers: true, x: false },
  "mcr-zone": { timers: true, x: false },
  "mcr-open-end": { timers: false, x: true },
  "jmp-into-mcr": { timers: false, x: true },
};

export interface ZoneSimInput {
  scenario: ZoneScenario;
  scanMs: number;
  durationMs: number;
  /** Timer .PRE, ms (timer scenarios only). */
  presetMs?: number;
  aToggles: number[];
  eToggles: number[];
  xToggles?: number[];
}

export interface ZoneSample {
  t: number;
  v: Record<string, boolean | number>;
  /** Rung numbers (1-based) that did not execute this scan. */
  skipped: number[];
}

export type ZoneSimResult = { ok: true; samples: ZoneSample[] } | { ok: false; error: string };

export function simulateZone(input: ZoneSimInput): ZoneSimResult {
  const { scenario, scanMs, durationMs } = input;
  const pre = input.presetMs ?? 0;
  const aT = [...input.aToggles].sort((x, y) => x - y);
  const eT = [...input.eToggles].sort((x, y) => x - y);
  const xT = [...(input.xToggles ?? [])].sort((x, y) => x - y);
  if (!Number.isInteger(scanMs) || scanMs < 1) return { ok: false, error: "Scan time must be a whole number of milliseconds, 1 or more" };
  if (!Number.isInteger(durationMs) || durationMs < scanMs) return { ok: false, error: "Duration must be at least one scan" };
  if (Math.floor(durationMs / scanMs) + 1 > MAX_SCANS) return { ok: false, error: `Too many scans — keep duration ÷ scan time under ${MAX_SCANS}` };
  if (!Number.isInteger(pre) || pre < 0) return { ok: false, error: "Preset must be a whole number of milliseconds, 0 or more" };
  for (const x of [...aT, ...eT, ...xT]) if (!Number.isFinite(x) || x < 0) return { ok: false, error: "Toggle times must be 0 ms or later" };

  const rungs = PROGRAMS[scenario];
  const labels = new Map(rungs.flatMap((r, i) => (r.label ? [[r.label, i] as const] : [])));
  // Bits start FALSE: OTE prescan clears the data bit (S6 p.77). Timers start
  // from their prescan state inside logixTimer.
  const bits: Record<string, boolean> = {};
  const timers: Record<string, (t: number, rung: boolean) => { acc?: number; dn?: boolean }> = {};
  const tstate: Record<string, { acc: number; dn: boolean }> = {};
  for (const r of rungs) {
    if (r.out.op === "OTE") bits[r.out.tag] = false;
    if (r.out.op === "TON" || r.out.op === "TOF" || r.out.op === "RTO") {
      const model = r.out.op === "TON" ? "ab-ton" : r.out.op === "TOF" ? "ab-tof" : "ab-rto";
      timers[r.out.tag] = logixTimer(model, pre);
      // TOF prescan: ACC = PRE, DN FALSE (plc-timer-semantics.md §3.3).
      tstate[r.out.tag] = { acc: r.out.op === "TOF" ? pre : 0, dn: false };
    }
  }

  const samples: ZoneSample[] = [];
  for (let t = 0; t <= durationMs; t += scanMs) {
    const io: Record<In, boolean> = { A: levelAt(aT, t), E: levelAt(eT, t), X: levelAt(xT, t) };
    const ran = new Set<number>();
    let override = false; // §2: reset at the end of every routine pass
    let i = 0;
    while (i < rungs.length) {
      const r = rungs[i]!;
      ran.add(i);
      const rung = r.when(io) && !override;
      const o = r.out;
      if (o.op === "OTE") bits[o.tag] = rung;
      else if (o.op === "TON" || o.op === "TOF" || o.op === "RTO") {
        const s = timers[o.tag]!(t, rung);
        tstate[o.tag] = { acc: s.acc!, dn: s.dn! };
      } else if (o.op === "MCR") {
        if (!rung) override = !override;
      } else if (o.op === "JMP" && rung) {
        const to = labels.get(o.to)!;
        if (to <= i) throw new Error("backward jumps are outside this model (assumption D3)");
        i = to;
        continue;
      }
      i++;
    }
    const v: Record<string, boolean | number> = { ...io };
    for (const sig of ZONE_SIGNALS[scenario]) {
      if (sig in v) continue;
      const [tag, field] = sig.split(".");
      v[sig] = field === "ACC" ? tstate[tag!]!.acc : field === "DN" ? tstate[tag!]!.dn : bits[sig]!;
    }
    const out: Record<string, boolean | number> = {};
    for (const sig of ZONE_SIGNALS[scenario]) out[sig] = v[sig]!;
    samples.push({ t, v: out, skipped: rungs.map((_, k) => k + 1).filter((k) => !ran.has(k - 1)) });
  }
  return { ok: true, samples };
}

/** Scan times at which a boolean signal is TRUE. */
export function zoneOn(samples: ZoneSample[], signal: string): number[] {
  return samples.filter((s) => s.v[signal] === true).map((s) => s.t);
}
