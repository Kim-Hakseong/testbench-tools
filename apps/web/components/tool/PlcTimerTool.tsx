"use client";

import { useEffect, useMemo, useState } from "react";
import {
  parseToggles,
  simulateTimer,
  type TimerModel,
  type TimerSample,
  type TimerSimResult,
} from "@testbench/bench-core";
import { useToolText } from "@/components/tool/useToolText";

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

// --- Timing diagram -----------------------------------------------------------

const W = 640;
const LABEL = 56;
const ROW = 22;
const ANALOG = 64;

type Trace =
  | { kind: "bit"; label: string; get: (s: TimerSample) => boolean }
  | { kind: "ramp"; label: string; get: (s: TimerSample) => number };

function Diagram({ samples, traces, preset, duration, title }: {
  samples: TimerSample[];
  traces: Trace[];
  preset: number;
  duration: number;
  title: string;
}) {
  const x = (t: number) => LABEL + ((W - LABEL - 8) * t) / duration;
  const rampMax = Math.max(preset, ...traces.flatMap((tr) => (tr.kind === "ramp" ? samples.map(tr.get) : [0])), 1);
  let y = 6;
  const rows = traces.map((tr) => {
    const top = y;
    const h = tr.kind === "bit" ? ROW : ANALOG;
    y += h + 8;
    return { tr, top, h };
  });
  const height = y + 14;

  const step = (val: (s: TimerSample) => number) => {
    let d = "";
    samples.forEach((s, i) => {
      const next = i + 1 < samples.length ? samples[i + 1]!.t : duration;
      d += `${i === 0 ? "M" : "L"}${x(s.t).toFixed(1)},${val(s).toFixed(1)}H${x(next).toFixed(1)}`;
    });
    return d;
  };

  return (
    <figure className="mt-3">
      <figcaption className="font-mono text-xs text-mute">{title}</figcaption>
      {/* Below ~560 px the labels would shrink past legibility, so the diagram scrolls inside the card instead. */}
      <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${height}`} style={{ minWidth: 560 }} className="mt-1 w-full text-ink" role="img" aria-label={title}>
        {rows.map(({ tr, top, h }) => (
          <g key={tr.label}>
            <text x={0} y={top + h / 2 + 4} className="fill-current font-mono" fontSize="11">{tr.label}</text>
            <line x1={LABEL} x2={W - 8} y1={top + h} y2={top + h} stroke="currentColor" strokeOpacity="0.15" />
            {tr.kind === "bit" ? (
              <path d={step((s) => (tr.get(s) ? top + 2 : top + h))} fill="none" stroke="currentColor" strokeWidth="1.5" />
            ) : (
              <>
                <line x1={LABEL} x2={W - 8} y1={top + h - (h * preset) / rampMax} y2={top + h - (h * preset) / rampMax} stroke="currentColor" strokeOpacity="0.45" strokeDasharray="4 3" />
                <text x={W - 8} y={top + h - (h * preset) / rampMax + 11} textAnchor="end" className="fill-current font-mono" fontSize="10" opacity="0.6">{preset}</text>
                <path d={step((s) => top + h - (h * tr.get(s)) / rampMax)} fill="none" stroke="currentColor" strokeWidth="1.5" />
              </>
            )}
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={x(duration * f)} y={height - 2} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"} className="fill-current font-mono" fontSize="10" opacity="0.6">
            {Math.round(duration * f)}
          </text>
        ))}
      </svg>
      </div>
    </figure>
  );
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
            <Diagram
              samples={run.iec.ok ? run.iec.samples : []}
              traces={iecTraces(pair.iec)}
              preset={pre!}
              duration={dur!}
              title={d.pair === "ret" ? t("Siemens TONR (IEC-style, S7-1200)") : t("IEC 61131-3 {fb} (Beckhoff, CODESYS, Siemens)").replace("{fb}", pair.iec.slice(4).toUpperCase())}
            />
            {run.ab && run.ab.ok && (
              <Diagram
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
