"use client";

import { useEffect, useMemo, useState } from "react";
import {
  lostRisingEdges,
  parseToggles,
  PULSE_PROGRAMS,
  PULSE_SIGNALS,
  pulseOn,
  simulatePulse,
  unseenPulses,
  type PulseSample,
  type PulseScenario,
  type PulseVendor,
} from "@testbench/bench-core";
import { TimingDiagram } from "@/components/tool/TimingDiagram";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

interface Form {
  sc: PulseScenario;
  vendor: PulseVendor;
  scan: string;
  dur: string;
  x: string;
  j: string;
  mem: "0" | "1";
}

const SCENARIOS: Record<PulseScenario, { label: string; start: Pick<Form, "scan" | "dur" | "x" | "j"> }> = {
  "pulse-basics": { label: "Pulse contact vs pulse coil", start: { scan: "10", dur: "100", x: "20 50", j: "" } },
  "jumped-pulse": { label: "Pulse coil skipped by a jump", start: { scan: "10", dur: "150", x: "20 60 80", j: "30 100" } },
};

const VENDORS: Record<PulseVendor, { label: string; contact: string; coil: string; jump: string }> = {
  mitsubishi: { label: "Mitsubishi (FX5 / iQ-F)", contact: "LDP", coil: "PLS", jump: "CJ" },
  ls: { label: "LS ELECTRIC (XGK / XGB)", contact: "LOADP", coil: "OUTP", jump: "JMP" },
};

const DEFAULT: Form = { sc: "pulse-basics", vendor: "mitsubishi", mem: "0", ...SCENARIOS["pulse-basics"].start };

function int(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || !Number.isInteger(v) ? null : v;
}

/** "20–90 ms" from a sorted list of scan times. */
function spans(ts: number[], scan: number): string {
  if (!ts.length) return "—";
  const out: string[] = [];
  let a = ts[0]!, b = a;
  for (const t of ts.slice(1)) {
    if (t === b + scan) { b = t; continue; }
    out.push(a === b ? `${a}` : `${a}–${b}`);
    a = b = t;
  }
  out.push(a === b ? `${a}` : `${a}–${b}`);
  return `${out.join(", ")} ms`;
}

const fill = (s: string, m: Record<string, string>) => s.replace(/\{(\w+)\}/g, (k, n: string) => m[n] ?? k);

export function PlcPulseTool() {
  const t = useToolText();
  const [form, setForm] = useState<Form>(DEFAULT);
  const [d, setD] = useState<Form>(DEFAULT);

  useEffect(() => {
    if (window.location.hash.length < 2) return;
    const p = new URLSearchParams(window.location.hash.slice(1));
    const sc = p.get("sc") as PulseScenario | null;
    if (!sc || !(sc in SCENARIOS)) return;
    const st = SCENARIOS[sc].start; // a link may carry only some settings
    const vendor = p.get("vendor") === "ls" ? "ls" : "mitsubishi";
    const f: Form = { sc, vendor, mem: p.get("mem") === "1" ? "1" : "0", scan: p.get("scan") ?? st.scan, dur: p.get("dur") ?? st.dur, x: p.get("x") ?? st.x, j: p.get("j") ?? st.j };
    setForm(f);
    setD(f);
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      setD(form);
      history.replaceState(null, "", `#${new URLSearchParams({ ...form }).toString()}`);
    }, 150);
    return () => clearTimeout(h);
  }, [form]);

  const jumped = d.sc === "jumped-pulse";
  const scan = int(d.scan);
  const dur = int(d.dur);
  const xT = parseToggles(d.x);
  const jT = parseToggles(jumped ? d.j : "");
  const mem = d.mem === "1";

  const run = useMemo<{ error: string } | { samples: PulseSample[] }>(() => {
    if (scan === null || dur === null) return { error: t("Scan time and duration must be whole milliseconds") };
    if (!xT.ok) return { error: `X: ${xT.error}` };
    if (!jT.ok) return { error: `J: ${jT.error}` };
    const r = simulatePulse({ scenario: d.sc, scanMs: scan, durationMs: dur, xToggles: xT.value, jToggles: jT.value, memoryInit: mem });
    return r.ok ? { samples: r.samples } : { error: t(r.error) };
  }, [scan, dur, xT, jT, mem, d.sc, t]);

  const set = (k: "scan" | "dur" | "x" | "j") => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const pick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value as PulseScenario;
    setForm((p) => ({ ...p, sc: s, ...SCENARIOS[s].start }));
  };

  const v = VENDORS[d.vendor];
  const names = { contact: v.contact, coil: v.coil, jump: v.jump };
  const notes: string[] = [];
  if ("samples" in run && scan !== null && xT.ok) {
    const s = run.samples;
    if (!jumped) {
      const rise = pulseOn(s, "M0");
      notes.push(
        rise.length
          ? fill(t("{contact} (M1) and {coil} (M0) both pulse at {t} — the same single scan, as Mitsubishi documents. The rung above the {coil} reads M0 at {above}, one scan late; the rung below reads it at {below}."), { ...names, t: spans(rise, scan), above: spans(pulseOn(s, "Y1"), scan), below: spans(pulseOn(s, "Y2"), scan) })
          : t("X never rises at a scan here, so no rising pulse fires."),
      );
      const missed = [...unseenPulses(xT.value, scan, true), ...unseenPulses(xT.value, scan, false)].sort((a, b) => a - b);
      if (missed.length) notes.push(fill(t("X changes at {t} and changes back before the next scan starts, so no pulse instruction sees it."), { t: missed.map((x) => `${x} ms`).join(", ") }));
    } else {
      const m0 = pulseOn(s, "M0");
      const longest = m0.reduce<{ run: number; best: number }>((acc, x, i) => {
        const run = i > 0 && x === m0[i - 1]! + scan ? acc.run + 1 : 1;
        return { run, best: Math.max(acc.best, run) };
      }, { run: 0, best: 0 }).best;
      if (longest > 1) notes.push(fill(t("M0 is ON at {t} — up to {n} scans in a row instead of one: the {jump} skipped the {coil} that would have turned it off. Mitsubishi warns the device \"sometimes turns ON for one scan or more\"."), { ...names, t: spans(m0, scan), n: String(longest) }));
      else notes.push(fill(t("M0 pulses for single scans at {t}. Start the jump right after X rises to see it stick."), { ...names, t: spans(m0, scan) }));
      const lost = lostRisingEdges(s, mem);
      if (lost.length) notes.push(fill(t("X rises at {t} but the {coil} never fires for it: when it runs again X is still ON and its memory still says ON from before the jump."), { ...names, t: lost.map((x) => `${x} ms`).join(", ") }));
    }
  }

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="pp-vendor" className="font-mono text-xs text-mute">{t("Vendor")}</label>
          <select id="pp-vendor" value={form.vendor} onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value as PulseVendor }))} className={`${fieldCls} border-line-strong`}>
            {(Object.keys(VENDORS) as PulseVendor[]).map((k) => <option key={k} value={k}>{VENDORS[k].label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pp-sc" className="font-mono text-xs text-mute">{t("Program")}</label>
          <select id="pp-sc" value={form.sc} onChange={pick} className={`${fieldCls} border-line-strong`}>
            {(Object.keys(SCENARIOS) as PulseScenario[]).map((k) => <option key={k} value={k}>{t(SCENARIOS[k].label)}</option>)}
          </select>
        </div>
      </div>

      <pre className="mt-3 overflow-x-auto rounded-btn border border-line-soft bg-well px-3 py-2 font-mono text-xs leading-relaxed text-body">
        {PULSE_PROGRAMS[form.sc][form.vendor].join("\n")}
      </pre>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pp-scan" className="font-mono text-xs text-mute">{t("Scan time")} (ms)</label>
          <input id="pp-scan" value={form.scan} onChange={set("scan")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${scan === null || scan < 1 ? "border-err" : "border-line-strong"}`} />
        </div>
        <div>
          <label htmlFor="pp-dur" className="font-mono text-xs text-mute">{t("Duration")} (ms)</label>
          <input id="pp-dur" value={form.dur} onChange={set("dur")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${dur === null ? "border-err" : "border-line-strong"}`} />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="pp-x" className="font-mono text-xs text-mute">{t("X toggles at (ms) — starts FALSE")}</label>
        <input id="pp-x" value={form.x} onChange={set("x")} spellCheck={false} className={`${fieldCls} ${xT.ok ? "border-line-strong" : "border-err"}`} />
      </div>
      {form.sc === "jumped-pulse" && (
        <div className="mt-3">
          <label htmlFor="pp-j" className="font-mono text-xs text-mute">{t("J (jump) toggles at (ms) — starts FALSE")}</label>
          <input id="pp-j" value={form.j} onChange={set("j")} spellCheck={false} className={`${fieldCls} ${jT.ok ? "border-line-strong" : "border-err"}`} />
        </div>
      )}
      <div className="mt-3">
        <label htmlFor="pp-mem" className="font-mono text-xs text-mute">{t("Edge memory on the first scan (not documented — assumption E2)")}</label>
        <select id="pp-mem" value={form.mem} onChange={(e) => setForm((p) => ({ ...p, mem: e.target.value as "0" | "1" }))} className={`${fieldCls} border-line-strong`}>
          <option value="0">{t("OFF — an input already ON fires a rising pulse on scan 0")}</option>
          <option value="1">{t("ON — an input already OFF fires a falling pulse on scan 0")}</option>
        </select>
      </div>

      <div className="mt-4">
        {"error" in run ? (
          <p className="text-sm text-err">{run.error}</p>
        ) : (
          <>
            <ul className="space-y-1.5 text-sm text-body">
              {notes.map((n) => <li key={n} className="rounded-btn border border-line-soft bg-elevated px-3 py-2">{n}</li>)}
            </ul>
            <TimingDiagram<PulseSample>
              samples={run.samples}
              traces={PULSE_SIGNALS[d.sc].filter((sig) => sig !== "skipped" /* same as J here */).map((sig) => ({ kind: "bit" as const, label: sig, get: (x: PulseSample) => x.v[sig]! }))}
              duration={dur!}
              title={t("Each row is sampled once per scan, at the end of the scan")}
            />
            <p className="mt-2 text-xs text-mute">
              {t("Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
