"use client";

import { useEffect, useMemo, useState } from "react";
import {
  parseToggles,
  simulateTimer,
  type TimerModel,
  type TimerSample,
  type TimerSimResult,
} from "@testbench/bench-core";
import { TimingDiagram, type Trace as TraceOf } from "@/components/tool/TimingDiagram";
import { useToolText } from "@/components/tool/useToolText";

type Trace = TraceOf<TimerSample>;

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

type Pair = "on" | "off" | "ret" | "pulse";

interface Form {
  pair: Pair;
  pre: string;
  scan: string;
  dur: string;
  ins: string;
  res: string;
}

/** Each comparison: the IEC block, its Logix counterpart (none for TP), and a starting scenario. */
const PAIRS: Record<Pair, { label: string; iec: TimerModel; ab: TimerModel | null; start: Omit<Form, "pair"> }> = {
  on: { label: "On-delay — TON vs TON", iec: "iec-ton", ab: "ab-ton", start: { pre: "100", scan: "30", dur: "400", ins: "30 330", res: "" } },
  off: { label: "Off-delay — TOF vs TOF", iec: "iec-tof", ab: "ab-tof", start: { pre: "100", scan: "10", dur: "400", ins: "20 200", res: "" } },
  ret: { label: "Retentive — Siemens TONR vs RTO + RES", iec: "s7-tonr", ab: "ab-rto", start: { pre: "100", scan: "10", dur: "400", ins: "0 50 100 200", res: "300 320" } },
  pulse: { label: "Pulse — IEC TP (no Logix instruction)", iec: "iec-tp", ab: null, start: { pre: "100", scan: "10", dur: "500", ins: "20 50 60 400", res: "" } },
};

const DEFAULT: Form = { pair: "on", ...PAIRS.on.start };

function readHash(): Form | null {
  if (typeof window === "undefined" || window.location.hash.length < 2) return null;
  const p = new URLSearchParams(window.location.hash.slice(1));
  const pair = p.get("pair") as Pair | null;
  if (!pair || !(pair in PAIRS)) return null;
  return { pair, pre: p.get("pre") ?? "", scan: p.get("scan") ?? "", dur: p.get("dur") ?? "", ins: p.get("in") ?? "", res: p.get("res") ?? "" };
}

function writeHash(f: Form) {
  const p = new URLSearchParams({ pair: f.pair, pre: f.pre, scan: f.scan, dur: f.dur, in: f.ins });
  if (f.pair === "ret") p.set("res", f.res);
  history.replaceState(null, "", `#${p.toString()}`);
}

function int(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || !Number.isInteger(v) ? null : v;
}

function iecTraces(model: TimerModel): Trace[] {
  const t: Trace[] = [{ kind: "bit", label: "IN", get: (s) => s.in }];
  if (model === "s7-tonr") t.push({ kind: "bit", label: "R", get: (s) => s.reset });
  t.push({ kind: "bit", label: "Q", get: (s) => !!s.q });
  t.push({ kind: "ramp", label: "ET", get: (s) => s.et ?? 0 });
  return t;
}

function abTraces(model: TimerModel): Trace[] {
  const t: Trace[] = [{ kind: "bit", label: "rung", get: (s) => s.in }];
  if (model === "ab-rto") t.push({ kind: "bit", label: "RES", get: (s) => s.reset });
  t.push({ kind: "bit", label: ".EN", get: (s) => !!s.en });
  t.push({ kind: "bit", label: ".TT", get: (s) => !!s.tt });
  t.push({ kind: "bit", label: ".DN", get: (s) => !!s.dn });
  t.push({ kind: "ramp", label: ".ACC", get: (s) => s.acc ?? 0 });
  return t;
}

// --- Findings: what actually differs in this run ---------------------------------

function findings(pair: Pair, pre: number, iec: TimerSimResult, ab: TimerSimResult | null, t: (s: string) => string): string[] {
  if (!iec.ok) return [];
  const out: string[] = [];
  const qOn = iec.events.filter((e) => e.signal === "Q" && e.to).map((e) => e.t);
  if (ab && ab.ok) {
    const dnOn = ab.events.filter((e) => e.signal === "DN" && e.to).map((e) => e.t);
    const accMax = Math.max(...ab.samples.map((s) => s.acc ?? 0));
    if (pair === "on" || pair === "ret") {
      if (qOn.length || dnOn.length) {
        out.push(
          t("Output on — IEC Q: {a} · Logix .DN: {b}")
            .replace("{a}", qOn.length ? qOn.map((v) => `${v} ms`).join(", ") : "—")
            .replace("{b}", dnOn.length ? dnOn.map((v) => `${v} ms`).join(", ") : "—"),
        );
      }
      if (accMax > pre) {
        out.push(t("Logix .ACC reached {acc} ms against a {pre} ms preset — {over} ms past it, because .ACC is not clamped and the scan time does not divide the preset. IEC ET stops at {pre}.").replaceAll("{acc}", String(accMax)).replaceAll("{pre}", String(pre)).replace("{over}", String(accMax - pre)));
      } else if (dnOn.length) {
        out.push(t("Here the scan time divides the preset, so .ACC lands exactly on {pre}. Change the scan time to see the overshoot.").replace("{pre}", String(pre)));
      }
    }
    if (pair === "off") {
      const first = ab.samples[0]!;
      out.push(t("At power-up the Logix TOF reads .ACC = {acc} with .DN FALSE — the prescan leaves it in the expired state. The IEC TOF starts with Q FALSE and ET 0 until IN has been TRUE once.").replace("{acc}", String(first.acc)));
      const qOff = iec.events.filter((e) => e.signal === "Q" && !e.to).map((e) => e.t);
      const dnOff = ab.events.filter((e) => e.signal === "DN" && !e.to).map((e) => e.t);
      out.push(
        t("Output off — IEC Q: {a} · Logix .DN: {b}")
          .replace("{a}", qOff.length ? qOff.map((v) => `${v} ms`).join(", ") : "—")
          .replace("{b}", dnOff.length ? dnOff.map((v) => `${v} ms`).join(", ") : "—"),
      );
    }
  }
  if (pair === "pulse") {
    out.push(t("Logix 5000 has no pulse timer: the timers in its instruction reference are TON, TOF and RTO (plus TONR, TOFR and RTOR in function blocks). The IEC TP keeps Q TRUE for the full PT whatever IN does."));
    if (qOn.length) out.push(t("Pulses started at: {a}").replace("{a}", qOn.map((v) => `${v} ms`).join(", ")));
  }
  return out;
}

export function PlcTimerTool() {
  const t = useToolText();
  const [form, setForm] = useState<Form>(DEFAULT);
  const [d, setD] = useState<Form>(DEFAULT);

  useEffect(() => {
    const h = readHash();
    if (h) { setForm(h); setD(h); }
  }, []);

  useEffect(() => {
    const h = setTimeout(() => { setD(form); writeHash(form); }, 150);
    return () => clearTimeout(h);
  }, [form]);

  const pair = PAIRS[d.pair];
  const pre = int(d.pre);
  const scan = int(d.scan);
  const dur = int(d.dur);
  const ins = parseToggles(d.ins);
  const res = parseToggles(d.pair === "ret" ? d.res : "");

  const run = useMemo(() => {
    if (pre === null || scan === null || dur === null) return { error: t("Preset, scan time and duration must be whole milliseconds") };
    if (!ins.ok) return { error: `IN: ${ins.error}` };
    if (!res.ok) return { error: `R / RES: ${res.error}` };
    const base = { presetMs: pre, scanMs: scan, durationMs: dur, inToggles: ins.value, resetToggles: res.value };
    const iec = simulateTimer({ model: pair.iec, ...base });
    if (!iec.ok) return { error: t(iec.error) };
    const ab = pair.ab ? simulateTimer({ model: pair.ab, ...base }) : null;
    if (ab && !ab.ok) return { error: t(ab.error) };
    return { iec, ab };
  }, [pre, scan, dur, ins, res, pair, t]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const pickPair = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = e.target.value as Pair;
    setForm({ pair: p, ...PAIRS[p].start });
  };

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <label htmlFor="pt-pair" className="font-mono text-xs text-mute">{t("Compare")}</label>
      <select id="pt-pair" value={form.pair} onChange={pickPair} className={`${fieldCls} border-line-strong`}>
        {(Object.keys(PAIRS) as Pair[]).map((p) => <option key={p} value={p}>{t(PAIRS[p].label)}</option>)}
      </select>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="pt-pre" className="font-mono text-xs text-mute">PT / .PRE (ms)</label>
          <input id="pt-pre" value={form.pre} onChange={set("pre")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${pre === null || pre < 0 ? "border-err" : "border-line-strong"}`} />
        </div>
        <div>
          <label htmlFor="pt-scan" className="font-mono text-xs text-mute">{t("Scan time")} (ms)</label>
          <input id="pt-scan" value={form.scan} onChange={set("scan")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${scan === null || scan < 1 ? "border-err" : "border-line-strong"}`} />
        </div>
        <div>
          <label htmlFor="pt-dur" className="font-mono text-xs text-mute">{t("Duration")} (ms)</label>
          <input id="pt-dur" value={form.dur} onChange={set("dur")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${dur === null ? "border-err" : "border-line-strong"}`} />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="pt-in" className="font-mono text-xs text-mute">{t("IN / rung toggles at (ms) — starts FALSE")}</label>
        <input id="pt-in" value={form.ins} onChange={set("ins")} spellCheck={false} className={`${fieldCls} ${ins.ok ? "border-line-strong" : "border-err"}`} />
      </div>
      {form.pair === "ret" && (
        <div className="mt-3">
          <label htmlFor="pt-res" className="font-mono text-xs text-mute">{t("R / RES toggles at (ms) — starts FALSE")}</label>
          <input id="pt-res" value={form.res} onChange={set("res")} spellCheck={false} className={`${fieldCls} ${res.ok ? "border-line-strong" : "border-err"}`} />
        </div>
      )}

      <div className="mt-4">
        {"error" in run ? (
          <p className="text-sm text-err">{run.error}</p>
        ) : (
          <>
            <ul className="space-y-1.5 text-sm text-body">
              {findings(d.pair, pre!, run.iec, run.ab, t).map((f) => (
                <li key={f} className="rounded-btn border border-line-soft bg-elevated px-3 py-2">{f}</li>
              ))}
            </ul>
            <TimingDiagram
              samples={run.iec.ok ? run.iec.samples : []}
              traces={iecTraces(pair.iec)}
              preset={pre!}
              duration={dur!}
              title={d.pair === "ret" ? t("Siemens TONR (IEC-style, S7-1200)") : t("IEC 61131-3 {fb} (Beckhoff, CODESYS, Siemens)").replace("{fb}", pair.iec.slice(4).toUpperCase())}
            />
            {run.ab && run.ab.ok && (
              <TimingDiagram
                samples={run.ab.samples}
                traces={abTraces(pair.ab!)}
                preset={pre!}
                duration={dur!}
                title={t("Allen-Bradley Logix 5000 {ins}").replace("{ins}", pair.ab === "ab-rto" ? "RTO + RES" : pair.ab!.slice(3).toUpperCase())}
              />
            )}
            <p className="mt-2 text-xs text-mute">
              {t("Each instruction runs once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
