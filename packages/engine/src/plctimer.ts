// PLC timer behaviour, scan by scan: IEC 61131-3 function blocks (TON, TOF,
// TP as documented by Beckhoff, CODESYS and Siemens; Siemens TONR) next to
// Allen-Bradley Logix 5000 instructions (TON, TOF, RTO with RES).
//
// Every rule below is taken from spec/plc-timer-semantics.md, which quotes the
// vendor manuals. Where a manual is silent the spec says so and names the
// assumption; the comments here point at those spec sections (§n).
//
// The model is a cyclic scan: inputs are sampled at t = 0, scan, 2·scan, …
// and each instruction executes once per scan. Timing in both families is
// measured between executions (Logix: "ACC = ACC + (current_time −
// last_time_scanned)", RM003 p.105), so a timer can only change state on a
// scan — which is the first thing this tool exists to show.

export type TimerModel =
  | "iec-ton"
  | "iec-tof"
  | "iec-tp"
  | "s7-tonr"
  | "ab-ton"
  | "ab-tof"
  | "ab-rto";

export const TIMER_MODELS: { id: TimerModel; family: "iec" | "ab"; label: string }[] = [
  { id: "iec-ton", family: "iec", label: "IEC TON" },
  { id: "iec-tof", family: "iec", label: "IEC TOF" },
  { id: "iec-tp", family: "iec", label: "IEC TP" },
  { id: "s7-tonr", family: "iec", label: "Siemens TONR" },
  { id: "ab-ton", family: "ab", label: "Logix TON" },
  { id: "ab-tof", family: "ab", label: "Logix TOF" },
  { id: "ab-rto", family: "ab", label: "Logix RTO + RES" },
];

/** Largest DINT; Logix sets ACC to this on overflow (RM003 TON flow chart, p.122). */
const DINT_MAX = 2147483647;

export interface TimerSimInput {
  model: TimerModel;
  /** PT (IEC) or .PRE (Logix), milliseconds. */
  presetMs: number;
  /** Scan period, milliseconds. */
  scanMs: number;
  /** Simulated span, milliseconds. */
  durationMs: number;
  /** Times (ms) at which IN / rung-condition-in toggles. It starts FALSE. */
  inToggles: number[];
  /** Times (ms) at which R (TONR) / the RES rung toggles. It starts FALSE. */
  resetToggles?: number[];
}

/** One scan. IEC models fill q/et; Logix models fill en/tt/dn/acc. */
export interface TimerSample {
  t: number;
  in: boolean;
  reset: boolean;
  q?: boolean;
  et?: number;
  en?: boolean;
  tt?: boolean;
  dn?: boolean;
  acc?: number;
}

export interface TimerEvent {
  t: number;
  signal: string;
  to: boolean;
  /** ET or ACC at that scan. */
  value: number;
}

export type TimerSimResult =
  | { ok: true; samples: TimerSample[]; events: TimerEvent[] }
  | { ok: false; error: string };

/** Level of a toggle list at time t: toggles at or before t flip it. */
export function levelAt(toggles: number[], t: number): boolean {
  let n = 0;
  for (const x of toggles) if (x <= t) n++;
  return n % 2 === 1;
}

/** Hard ceiling on scans so a 1 ms scan over an hour cannot hang a tab. */
export const MAX_SCANS = 20000;

export function simulateTimer(input: TimerSimInput): TimerSimResult {
  const { model, presetMs, scanMs, durationMs } = input;
  const inT = [...input.inToggles].sort((a, b) => a - b);
  const rT = [...(input.resetToggles ?? [])].sort((a, b) => a - b);

  if (!Number.isInteger(presetMs) || presetMs < 0) return { ok: false, error: "Preset must be a whole number of milliseconds, 0 or more" };
  if (!Number.isInteger(scanMs) || scanMs < 1) return { ok: false, error: "Scan time must be a whole number of milliseconds, 1 or more" };
  if (!Number.isInteger(durationMs) || durationMs < scanMs) return { ok: false, error: "Duration must be at least one scan" };
  if (Math.floor(durationMs / scanMs) + 1 > MAX_SCANS) return { ok: false, error: `Too many scans — keep duration ÷ scan time under ${MAX_SCANS}` };
  for (const x of [...inT, ...rT]) {
    if (!Number.isFinite(x) || x < 0) return { ok: false, error: "Toggle times must be 0 ms or later" };
  }

  const step = STEPPERS[model](presetMs);
  const samples: TimerSample[] = [];
  for (let t = 0; t <= durationMs; t += scanMs) {
    const s = step(t, levelAt(inT, t), levelAt(rT, t));
    samples.push(s);
  }
  return { ok: true, samples, events: eventsOf(samples) };
}

function eventsOf(samples: TimerSample[]): TimerEvent[] {
  const out: TimerEvent[] = [];
  const bools = ["q", "en", "tt", "dn"] as const;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    const p = i > 0 ? samples[i - 1]! : undefined;
    for (const k of bools) {
      const v = s[k];
      if (v === undefined) continue;
      const before = p ? p[k] : false;
      if (v !== before) out.push({ t: s.t, signal: k.toUpperCase(), to: v, value: (s.et ?? s.acc)! });
    }
  }
  return out;
}

type Stepper = (t: number, inp: boolean, reset: boolean) => TimerSample;

const STEPPERS: Record<TimerModel, (pt: number) => Stepper> = {
  // §2.1 IEC TON. IN FALSE → Q FALSE, ET 0. Rising edge starts; ET counts up
  // until PT is reached and stays there (Siemens: "clamped at the preset
  // value"); Q = IN AND ET = PT.
  "iec-ton": (pt) => {
    let prevIn = false;
    let start = 0;
    return (t, inp, reset) => {
      let q = false;
      let et = 0;
      if (inp) {
        if (!prevIn) start = t;
        et = Math.min(t - start, pt);
        q = et >= pt;
      }
      prevIn = inp;
      return { t, in: inp, reset, q, et };
    };
  },

  // §2.2 IEC TOF. IN TRUE → Q TRUE, ET 0. Falling edge starts; ET counts up to
  // PT; Q FALSE once ET = PT while IN stays FALSE. ET holds at PT after that.
  // Power-up with IN FALSE: no falling edge has happened, so the timer has not
  // started and Q keeps its initial FALSE (§2.2, assumption A1).
  "iec-tof": (pt) => {
    let prevIn = false;
    let started = false;
    let start = 0;
    return (t, inp, reset) => {
      let q: boolean;
      let et: number;
      if (inp) {
        q = true;
        et = 0;
        started = false;
      } else {
        if (prevIn) {
          started = true;
          start = t;
        }
        if (started) {
          et = Math.min(t - start, pt);
          q = et < pt;
        } else {
          et = 0;
          q = false;
        }
      }
      prevIn = inp;
      return { t, in: inp, reset, q, et };
    };
  },

  // §2.3 IEC TP. A rising edge while Q is FALSE starts a pulse of length PT;
  // IN has no effect while it runs. ET counts up to PT, then stays at PT while
  // IN is still TRUE and returns to 0 once IN and Q are both FALSE.
  "iec-tp": (pt) => {
    let prevIn = false;
    let pulsing = false;
    let start = 0;
    let lastEt = 0;
    return (t, inp, reset) => {
      if (!pulsing && inp && !prevIn) {
        pulsing = true;
        start = t;
      }
      let q = false;
      let et: number;
      if (pulsing) {
        et = Math.min(t - start, pt);
        if (et >= pt) pulsing = false;
        else q = true;
      } else {
        et = lastEt;
      }
      if (!q && !inp) et = 0;
      lastEt = et;
      prevIn = inp;
      return { t, in: inp, reset, q, et };
    };
  },

  // §2.4 Siemens TONR. Accumulates while IN is TRUE, holds ET when IN goes
  // FALSE, resumes from the held value. R = 1 resets ET and Q. ET clamps at
  // PT; Q = ET ≥ PT, so Q stays TRUE after IN drops until R.
  "s7-tonr": (pt) => {
    let running = false;
    let last = 0;
    let et = 0;
    return (t, inp, reset) => {
      if (reset) {
        et = 0;
        running = false;
      } else if (inp) {
        if (running) et = Math.min(et + (t - last), pt);
        running = true;
        last = t;
      } else {
        running = false;
      }
      return { t, in: inp, reset, q: !reset && et >= pt, et };
    };
  },

  // §3.2 Logix TON, from the RM003 flow chart (p.122). Rung false: EN, TT, DN
  // cleared, ACC = 0. Rung true: TT set; if DN, clear TT; else if EN was
  // false (first true scan), last_time = now and nothing is added; else ACC +=
  // Δt and, if ACC ≥ PRE, clear TT and set DN. No step clamps ACC to PRE.
  "ab-ton": (pre) => {
    let en = false, tt = false, dn = false, acc = 0, last = 0;
    return (t, inp, reset) => {
      if (!inp) {
        en = false; tt = false; dn = false; acc = 0;
      } else {
        tt = true;
        if (dn) {
          tt = false;
        } else if (!en) {
          last = t;
        } else {
          acc = Math.min(acc + (t - last), DINT_MAX);
          last = t;
          if (acc >= pre) { tt = false; dn = true; }
        }
        en = true;
      }
      return { t, in: inp, reset, en, tt, dn, acc };
    };
  },

  // §3.3 Logix TOF (flow chart p.114). Prescan leaves EN, TT, DN FALSE and
  // ACC = PRE. Rung true: EN, DN TRUE, TT FALSE, ACC = 0. Rung false: TT set;
  // if DN is FALSE, clear TT; else if EN was TRUE (first false scan),
  // last_time = now; else ACC += Δt and, if ACC ≥ PRE, clear TT and DN. EN
  // is cleared.
  "ab-tof": (pre) => {
    let en = false, tt = false, dn = false, acc = pre, last = 0;
    return (t, inp, reset) => {
      if (inp) {
        en = true; tt = false; dn = true; acc = 0;
      } else {
        tt = true;
        if (!dn) {
          tt = false;
        } else if (en) {
          last = t;
        } else {
          acc = Math.min(acc + (t - last), DINT_MAX);
          last = t;
          if (acc >= pre) { tt = false; dn = false; }
        }
        en = false;
      }
      return { t, in: inp, reset, en, tt, dn, acc };
    };
  },

  // §3.4 Logix RTO, then a RES rung on the same timer later in the scan. Rung
  // false: EN, TT cleared, ACC and DN retained. Rung true: the TON accumulate
  // step (assumption A3: RM003's RTO true flow chart is blank). RES true:
  // ACC = 0 and EN, TT, DN FALSE.
  "ab-rto": (pre) => {
    let en = false, tt = false, dn = false, acc = 0, last = 0;
    return (t, inp, reset) => {
      if (!inp) {
        en = false; tt = false;
      } else {
        tt = true;
        if (dn) {
          tt = false;
        } else if (!en) {
          last = t;
        } else {
          acc = Math.min(acc + (t - last), DINT_MAX);
          last = t;
          if (acc >= pre) { tt = false; dn = true; }
        }
        en = true;
      }
      if (reset) {
        acc = 0; en = false; tt = false; dn = false;
      }
      return { t, in: inp, reset, en, tt, dn, acc };
    };
  },
};

/** Parse "100, 400 900" into sorted toggle times. */
export function parseToggles(text: string): { ok: true; value: number[] } | { ok: false; error: string } {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  const out: number[] = [];
  for (const p of parts) {
    const v = Number(p.replace(/ms$/i, ""));
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) return { ok: false, error: `"${p}" is not a whole number of milliseconds` };
    out.push(v);
  }
  return { ok: true, value: out.sort((a, b) => a - b) };
}
