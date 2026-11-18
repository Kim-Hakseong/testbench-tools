// PLC scan-order pitfalls, scan by scan. Each scenario is a short ladder
// program run top to bottom once per scan (spec/plc-scan-order-semantics.md
// §1, assumption C1). Inputs A and B are sampled at the start of the scan,
// as in plctimer.ts.

import { levelAt, MAX_SCANS } from "./plctimer";

export type ScanScenario = "double-coil" | "one-shot-order" | "set-reset";

/** The rungs of each scenario, in execution order, for display. */
export const SCAN_PROGRAMS: Record<ScanScenario, string[]> = {
  "double-coil": [
    "1  XIC(A)  OTE(Y)",
    "2  XIC(Y)  OTE(Z)",
    "3  XIC(B)  OTE(Y)",
  ],
  "one-shot-order": [
    "1  XIC(P)  OTE(Above)",
    "2  XIC(A)  OSR(S, P)",
    "3  XIC(P)  OTE(Below)",
  ],
  "set-reset": [
    "SR(SET1 := A, RESET := B)          set dominant",
    "RS(SET := A, RESET1 := B)          reset dominant",
    "1 XIC(A) OTL(L1)   2 XIC(B) OTU(L1)   unlatch rung last",
    "1 XIC(B) OTU(L2)   2 XIC(A) OTL(L2)   latch rung last",
    "[XIC(A) OR XIC(M)] XIO(B) OTE(M)   seal-in, B = stop",
  ],
};

/** Signals each scenario reports, in display order. */
export const SCAN_SIGNALS: Record<ScanScenario, string[]> = {
  "double-coil": ["A", "B", "Y after rung 1", "Z", "Y at end of scan"],
  "one-shot-order": ["A", "P", "Above", "Below"],
  "set-reset": ["A", "B", "SR", "RS", "OTL→OTU", "OTU→OTL", "seal-in"],
};

export interface ScanSimInput {
  scenario: ScanScenario;
  scanMs: number;
  durationMs: number;
  aToggles: number[];
  bToggles?: number[];
}

export interface ScanSample {
  t: number;
  v: Record<string, boolean>;
}

export type ScanSimResult = { ok: true; samples: ScanSample[] } | { ok: false; error: string };

export function simulateScan(input: ScanSimInput): ScanSimResult {
  const { scenario, scanMs, durationMs } = input;
  const aT = [...input.aToggles].sort((x, y) => x - y);
  const bT = [...(input.bToggles ?? [])].sort((x, y) => x - y);
  if (!Number.isInteger(scanMs) || scanMs < 1) return { ok: false, error: "Scan time must be a whole number of milliseconds, 1 or more" };
  if (!Number.isInteger(durationMs) || durationMs < scanMs) return { ok: false, error: "Duration must be at least one scan" };
  if (Math.floor(durationMs / scanMs) + 1 > MAX_SCANS) return { ok: false, error: `Too many scans — keep duration ÷ scan time under ${MAX_SCANS}` };
  for (const x of [...aT, ...bT]) if (!Number.isFinite(x) || x < 0) return { ok: false, error: "Toggle times must be 0 ms or later" };

  const scan = PROGRAMS[scenario]();
  const samples: ScanSample[] = [];
  for (let t = 0; t <= durationMs; t += scanMs) samples.push({ t, v: scan(levelAt(aT, t), levelAt(bT, t)) });
  return { ok: true, samples };
}

type Program = () => (a: boolean, b: boolean) => Record<string, boolean>;

const PROGRAMS: Record<ScanScenario, Program> = {
  // §2–§3. Each OTE overwrites Y; rung 2 reads the value rung 1 left; the
  // process image sends only the end-of-scan value to the output.
  "double-coil": () => {
    let y = false; // OTE prescan clears the data bit (S6 p.77)
    return (a, b) => {
      y = a; // rung 1
      const yMid = y;
      const z = y; // rung 2
      y = b; // rung 3
      return { A: a, B: b, "Y after rung 1": yMid, Z: z, "Y at end of scan": y };
    };
  },

  // §4. OSR prescan: storage TRUE, output FALSE.
  "one-shot-order": () => {
    let sb = true, p = false;
    return (a) => {
      const above = p; // rung 1 reads P before the OSR runs
      if (!a) { sb = false; p = false; } // rung 2
      else if (!sb) { sb = true; p = true; }
      else p = false;
      const below = p; // rung 3
      return { A: a, P: p, Above: above, Below: below };
    };
  },

  // §5. Five ways to build a latch from the same two inputs.
  "set-reset": () => {
    let sr = false, rs = false, l1 = false, l2 = false, m = false;
    return (a, b) => {
      sr = (!b && sr) || a; // Beckhoff SR
      rs = !b && (rs || a); // Beckhoff RS
      if (a) l1 = true; // OTL rung first …
      if (b) l1 = false; // … OTU rung last
      if (b) l2 = false; // OTU rung first …
      if (a) l2 = true; // … OTL rung last
      m = (a || m) && !b; // seal-in
      return { A: a, B: b, SR: sr, RS: rs, "OTL→OTU": l1, "OTU→OTL": l2, "seal-in": m };
    };
  },
};

/** Scan times at which a signal is TRUE. */
export function onScans(samples: ScanSample[], signal: string): number[] {
  return samples.filter((s) => s.v[signal]).map((s) => s.t);
}
