"use client";

import { useEffect, useMemo, useState } from "react";
import {
  onScans,
  parseToggles,
  SCAN_PROGRAMS,
  SCAN_SIGNALS,
  simulateScan,
  type ScanSample,
  type ScanScenario,
} from "@testbench/bench-core";
import { TimingDiagram } from "@/components/tool/TimingDiagram";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

interface Form {
  sc: ScanScenario;
  scan: string;
  dur: string;
  a: string;
  b: string;
}

const SCENARIOS: Record<ScanScenario, { label: string; start: Omit<Form, "sc">; aLabel: string; bLabel: string | null }> = {
  "double-coil": { label: "Double coil — one bit, two OTE rungs", start: { scan: "10", dur: "80", a: "10 50", b: "30 70" }, aLabel: "A toggles at (ms) — starts FALSE", bLabel: "B toggles at (ms) — starts FALSE" },
  "one-shot-order": { label: "One-shot bit read above and below the OSR", start: { scan: "10", dur: "60", a: "20", b: "" }, aLabel: "A toggles at (ms) — starts FALSE", bLabel: null },
  "set-reset": { label: "Set and reset at the same time — five latches", start: { scan: "10", dur: "60", a: "10 40", b: "20 30" }, aLabel: "A (set / start) toggles at (ms) — starts FALSE", bLabel: "B (reset / stop) toggles at (ms) — starts FALSE" },
};

const DEFAULT: Form = { sc: "double-coil", ...SCENARIOS["double-coil"].start };

function int(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || !Number.isInteger(v) ? null : v;
}

const ms = (xs: number[]) => (xs.length ? xs.map((v) => `${v} ms`).join(", ") : "—");

export function PlcScanTool() {
  const t = useToolText();
  const [form, setForm] = useState<Form>(DEFAULT);
  const [d, setD] = useState<Form>(DEFAULT);

  useEffect(() => {
    if (window.location.hash.length < 2) return;
    const p = new URLSearchParams(window.location.hash.slice(1));
    const sc = p.get("sc") as ScanScenario | null;
    if (!sc || !(sc in SCENARIOS)) return;
    const f = { sc, scan: p.get("scan") ?? "", dur: p.get("dur") ?? "", a: p.get("a") ?? "", b: p.get("b") ?? "" };
    setForm(f);
    setD(f);
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      setD(form);
      const p = new URLSearchParams({ sc: form.sc, scan: form.scan, dur: form.dur, a: form.a, b: form.b });
      history.replaceState(null, "", `#${p.toString()}`);
    }, 150);
    return () => clearTimeout(h);
  }, [form]);

  const sc = SCENARIOS[d.sc];
  const scan = int(d.scan);
  const dur = int(d.dur);
  const aT = parseToggles(d.a);
  const bT = parseToggles(sc.bLabel ? d.b : "");

  const run = useMemo<{ error: string } | { samples: ScanSample[] }>(() => {
    if (scan === null || dur === null) return { error: t("Scan time and duration must be whole milliseconds") };
    if (!aT.ok) return { error: `A: ${aT.error}` };
    if (!bT.ok) return { error: `B: ${bT.error}` };
    const r = simulateScan({ scenario: d.sc, scanMs: scan, durationMs: dur, aToggles: aT.value, bToggles: bT.value });
    return r.ok ? { samples: r.samples } : { error: t(r.error) };
  }, [scan, dur, aT, bT, d.sc, t]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const pick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value as ScanScenario;
    setForm({ sc: s, ...SCENARIOS[s].start });
  };

  const notes: string[] = [];
  if ("samples" in run) {
    const samples = run.samples;
    const on = (sig: string) => onScans(samples, sig);
    if (d.sc === "double-coil") {
      notes.push(t("Z (rung 2) is TRUE at {a} — it reads the value rung 1 wrote. The output Y is TRUE at {b} — only rung 3's write survives to the end of the scan, so A never reaches the output.").replace("{a}", ms(on("Z"))).replace("{b}", ms(on("Y at end of scan"))));
    } else if (d.sc === "one-shot-order") {
      notes.push(t("P pulses at {p}. The rung below the OSR sees it in the same scan ({below}); the rung above sees it one scan later ({above}). Both see it exactly once.").replace("{p}", ms(on("P"))).replace("{below}", ms(on("Below"))).replace("{above}", ms(on("Above"))));
    } else {
      const both = samples.filter((s) => s.v.A && s.v.B).map((s) => s.t);
      if (both.length) {
        notes.push(t("Set and reset are both TRUE at {a}. SR and the latch-last pair keep the bit on; RS, the unlatch-last pair and the seal-in turn it off.").replace("{a}", ms(both)));
      } else {
        notes.push(t("Set and reset are never TRUE in the same scan here, so all five latches agree. Overlap A and B to see them split."));
      }
    }
  }

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <label htmlFor="ps-sc" className="font-mono text-xs text-mute">{t("Pitfall")}</label>
      <select id="ps-sc" value={form.sc} onChange={pick} className={`${fieldCls} border-line-strong`}>
        {(Object.keys(SCENARIOS) as ScanScenario[]).map((s) => <option key={s} value={s}>{t(SCENARIOS[s].label)}</option>)}
      </select>

      <pre className="mt-3 overflow-x-auto rounded-btn border border-line-soft bg-well px-3 py-2 font-mono text-xs leading-relaxed text-body">
        {SCAN_PROGRAMS[form.sc].join("\n")}
      </pre>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ps-scan" className="font-mono text-xs text-mute">{t("Scan time")} (ms)</label>
          <input id="ps-scan" value={form.scan} onChange={set("scan")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${scan === null || scan < 1 ? "border-err" : "border-line-strong"}`} />
        </div>
        <div>
          <label htmlFor="ps-dur" className="font-mono text-xs text-mute">{t("Duration")} (ms)</label>
          <input id="ps-dur" value={form.dur} onChange={set("dur")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${dur === null ? "border-err" : "border-line-strong"}`} />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="ps-a" className="font-mono text-xs text-mute">{t(SCENARIOS[form.sc].aLabel)}</label>
        <input id="ps-a" value={form.a} onChange={set("a")} spellCheck={false} className={`${fieldCls} ${aT.ok ? "border-line-strong" : "border-err"}`} />
      </div>
      {SCENARIOS[form.sc].bLabel && (
        <div className="mt-3">
          <label htmlFor="ps-b" className="font-mono text-xs text-mute">{t(SCENARIOS[form.sc].bLabel!)}</label>
          <input id="ps-b" value={form.b} onChange={set("b")} spellCheck={false} className={`${fieldCls} ${bT.ok ? "border-line-strong" : "border-err"}`} />
        </div>
      )}

      <div className="mt-4">
        {"error" in run ? (
          <p className="text-sm text-err">{run.error}</p>
        ) : (
          <>
            <ul className="space-y-1.5 text-sm text-body">
              {notes.map((n) => <li key={n} className="rounded-btn border border-line-soft bg-elevated px-3 py-2">{n}</li>)}
            </ul>
            <TimingDiagram<ScanSample>
              samples={run.samples}
              traces={SCAN_SIGNALS[d.sc].map((sig) => ({ kind: "bit" as const, label: sig.length > 8 ? sig.replace("Y after rung 1", "Y@r1").replace("Y at end of scan", "Y out") : sig, get: (s: ScanSample) => s.v[sig]! }))}
              duration={dur!}
              title={t("Each row is the value after that rung ran, sampled once per scan")}
            />
            <p className="mt-2 text-xs text-mute">
              {t("Rungs run top to bottom once per scan; A and B are read at the start of the scan. Toggle times fall on the first scan at or after them.")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
