"use client";

import { useEffect, useMemo, useState } from "react";
import { parseToggles, simulateEdge, unseenPulses, type EdgeSample } from "@testbench/bench-core";
import { TimingDiagram, type Trace } from "@/components/tool/TimingDiagram";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

type Dir = "rise" | "fall";

interface Form {
  dir: Dir;
  scan: string;
  dur: string;
  ins: string;
  mem: "0" | "1";
}

const START: Record<Dir, Omit<Form, "dir">> = {
  rise: { scan: "10", dur: "100", ins: "0 30 50 52 70 82 88", mem: "0" },
  fall: { scan: "10", dur: "100", ins: "40", mem: "1" },
};

const DEFAULT: Form = { dir: "rise", ...START.rise };

function readHash(): Form | null {
  if (typeof window === "undefined" || window.location.hash.length < 2) return null;
  const p = new URLSearchParams(window.location.hash.slice(1));
  const dir = p.get("dir");
  if (dir !== "rise" && dir !== "fall") return null;
  return { dir, scan: p.get("scan") ?? "", dur: p.get("dur") ?? "", ins: p.get("in") ?? "", mem: p.get("mem") === "1" ? "1" : "0" };
}

function int(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || !Number.isInteger(v) ? null : v;
}

const ms = (xs: number[]) => (xs.length ? xs.map((v) => `${v} ms`).join(", ") : "—");

export function PlcEdgeTool() {
  const t = useToolText();
  const [form, setForm] = useState<Form>(DEFAULT);
  const [d, setD] = useState<Form>(DEFAULT);

  useEffect(() => {
    const h = readHash();
    if (h) { setForm(h); setD(h); }
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      setD(form);
      const p = new URLSearchParams({ dir: form.dir, scan: form.scan, dur: form.dur, in: form.ins, mem: form.mem });
      history.replaceState(null, "", `#${p.toString()}`);
    }, 150);
    return () => clearTimeout(h);
  }, [form]);

  const scan = int(d.scan);
  const dur = int(d.dur);
  const ins = parseToggles(d.ins);

  const run = useMemo(() => {
    if (scan === null || dur === null) return { error: t("Scan time and duration must be whole milliseconds") };
    if (!ins.ok) return { error: `IN: ${ins.error}` };
    const base = { scanMs: scan, durationMs: dur, inToggles: ins.value };
    const iec = simulateEdge({ model: d.dir === "rise" ? "iec-rising" : "iec-falling", ...base, memoryInit: d.mem === "1" });
    if (!iec.ok) return { error: t(iec.error) };
    const ab = d.dir === "rise"
      ? [simulateEdge({ model: "ab-ons", ...base }), simulateEdge({ model: "ab-osr", ...base })]
      : [simulateEdge({ model: "ab-osf", ...base })];
    for (const r of ab) if (!r.ok) return { error: t(r.error) };
    return { iec, ab: ab as Extract<(typeof ab)[number], { ok: true }>[] };
  }, [scan, dur, ins, d.dir, d.mem, t]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const pickDir = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dir = e.target.value as Dir;
    setForm({ dir, ...START[dir] });
  };

  // What actually differs in this run.
  const notes: string[] = [];
  if (!("error" in run)) {
    const iecP = run.iec.pulses;
    if (d.dir === "rise") {
      const [ons, osr] = run.ab;
      notes.push(t("Pulses — IEC R_TRIG / P: {a} · ONS: {b} · OSR: {c}").replace("{a}", ms(iecP)).replace("{b}", ms(ons!.pulses)).replace("{c}", ms(osr!.pulses)));
      if (iecP.includes(0) && !ons!.pulses.includes(0)) {
        notes.push(t("First scan: the input is already TRUE. With the memory bit starting FALSE the IEC/Siemens edge fires at 0 ms; ONS and OSR do not, because the Logix prescan sets their storage bit TRUE."));
      }
      notes.push(t("ONS turns the rest of its rung TRUE for one scan. OSR leaves its rung-condition-out equal to the rung and puts the pulse on a separate output bit — instructions after an OSR on the same rung see the full rung, not the pulse."));
    } else {
      const [osf] = run.ab;
      notes.push(t("Pulses — IEC F_TRIG / N: {a} · OSF: {b}").replace("{a}", ms(iecP)).replace("{b}", ms(osf!.pulses)));
      if (iecP.includes(0) && !osf!.pulses.includes(0)) {
        notes.push(t("First scan: the input is FALSE and the memory bit starts TRUE, so the IEC/Siemens edge reports a falling edge at 0 ms. OSF does not: the Logix prescan clears its storage bit."));
      }
    }
    // A TRUE blip or a FALSE dip between two scans hides an edge in either direction.
    const missed = ins.ok ? [...unseenPulses(ins.value, scan!, true), ...unseenPulses(ins.value, scan!, false)].sort((a, b) => a - b) : [];
    if (missed.length) {
      notes.push(t("The input changed and changed back between two scans at {a} — no instruction sees an edge there.").replace("{a}", ms(missed)));
    }
  }

  const bit = (label: string, get: (s: EdgeSample) => boolean): Trace<EdgeSample> => ({ kind: "bit", label, get });

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pe-dir" className="font-mono text-xs text-mute">{t("Edge")}</label>
          <select id="pe-dir" value={form.dir} onChange={pickDir} className={`${fieldCls} border-line-strong`}>
            <option value="rise">{t("Rising — R_TRIG / P vs ONS, OSR")}</option>
            <option value="fall">{t("Falling — F_TRIG / N vs OSF")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="pe-mem" className="font-mono text-xs text-mute">{t("IEC memory bit at power-up")}</label>
          <select id="pe-mem" value={form.mem} onChange={set("mem")} className={`${fieldCls} border-line-strong`}>
            <option value="0">FALSE</option>
            <option value="1">TRUE</option>
          </select>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pe-scan" className="font-mono text-xs text-mute">{t("Scan time")} (ms)</label>
          <input id="pe-scan" value={form.scan} onChange={set("scan")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${scan === null || scan < 1 ? "border-err" : "border-line-strong"}`} />
        </div>
        <div>
          <label htmlFor="pe-dur" className="font-mono text-xs text-mute">{t("Duration")} (ms)</label>
          <input id="pe-dur" value={form.dur} onChange={set("dur")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${dur === null ? "border-err" : "border-line-strong"}`} />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="pe-in" className="font-mono text-xs text-mute">{t("IN / rung toggles at (ms) — starts FALSE")}</label>
        <input id="pe-in" value={form.ins} onChange={set("ins")} spellCheck={false} className={`${fieldCls} ${ins.ok ? "border-line-strong" : "border-err"}`} />
      </div>

      <div className="mt-4">
        {"error" in run ? (
          <p className="text-sm text-err">{run.error}</p>
        ) : (
          <>
            <ul className="space-y-1.5 text-sm text-body">
              {notes.map((n) => <li key={n} className="rounded-btn border border-line-soft bg-elevated px-3 py-2">{n}</li>)}
            </ul>
            <TimingDiagram
              samples={run.iec.samples}
              traces={[bit("IN", (s) => s.in), bit("M", (s) => s.memory), bit("Q", (s) => s.pulse)]}
              duration={dur!}
              title={d.dir === "rise" ? t("IEC R_TRIG · Siemens P contact / P_TRIG (memory bit M)") : t("IEC F_TRIG · Siemens N contact / N_TRIG (memory bit M)")}
            />
            {d.dir === "rise" ? (
              <>
                <TimingDiagram
                  samples={run.ab[0]!.samples}
                  traces={[bit("rung", (s) => s.in), bit("storage", (s) => s.memory), bit("rung-out", (s) => s.pulse)]}
                  duration={dur!}
                  title={t("Allen-Bradley ONS — the pulse is the rung-condition-out")}
                />
                <TimingDiagram
                  samples={run.ab[1]!.samples}
                  traces={[bit("rung", (s) => s.in), bit("storage", (s) => s.memory), bit("output", (s) => s.pulse), bit("rung-out", (s) => !!s.rungOut)]}
                  duration={dur!}
                  title={t("Allen-Bradley OSR — pulse on the output bit, rung passes through")}
                />
              </>
            ) : (
              <TimingDiagram
                samples={run.ab[0]!.samples}
                traces={[bit("rung", (s) => s.in), bit("storage", (s) => s.memory), bit("output", (s) => s.pulse)]}
                duration={dur!}
                title={t("Allen-Bradley OSF — pulse on the output bit")}
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
