"use client";

import { useEffect, useMemo, useState } from "react";
import {
  parseToggles,
  simulateZone,
  ZONE_PROGRAMS,
  ZONE_SIGNALS,
  ZONE_USES,
  zoneOn,
  type ZoneSample,
  type ZoneScenario,
} from "@testbench/bench-core";
import { TimingDiagram, type Trace } from "@/components/tool/TimingDiagram";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

interface Form {
  sc: ZoneScenario;
  scan: string;
  pre: string;
  dur: string;
  a: string;
  e: string;
  x: string;
}

const SCENARIOS: Record<ZoneScenario, { label: string; start: Omit<Form, "sc">; eLabel: string; xLabel?: string }> = {
  "jmp-zone": {
    label: "JMP over four rungs (E FALSE skips them)",
    start: { scan: "10", pre: "100", dur: "650", a: "50 200 300 500", e: "0 150 350", x: "" },
    eLabel: "E (zone runs) toggles at (ms) — starts FALSE",
  },
  "mcr-zone": {
    label: "MCR zone around the same four rungs",
    start: { scan: "10", pre: "100", dur: "650", a: "50 200 300 500", e: "0 150 350", x: "" },
    eLabel: "E (zone runs) toggles at (ms) — starts FALSE",
  },
  "mcr-open-end": {
    label: "MCR zone ended by a conditional MCR",
    start: { scan: "10", pre: "100", dur: "400", a: "0", e: "0 200", x: "100 300" },
    eLabel: "E (zone runs) toggles at (ms) — starts FALSE",
    xLabel: "X (end MCR condition) toggles at (ms) — starts FALSE",
  },
  "jmp-into-mcr": {
    label: "JMP into the middle of an MCR zone",
    start: { scan: "10", pre: "100", dur: "300", a: "0", e: "0 50", x: "100 200" },
    eLabel: "E (zone runs) toggles at (ms) — starts FALSE",
    xLabel: "X (jump) toggles at (ms) — starts FALSE",
  },
};

const DEFAULT: Form = { sc: "jmp-zone", ...SCENARIOS["jmp-zone"].start };

function int(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || !Number.isInteger(v) ? null : v;
}

/** "50–140 ms, 350 ms" from a sorted list of scan times. */
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

export function PlcZoneTool() {
  const t = useToolText();
  const [form, setForm] = useState<Form>(DEFAULT);
  const [d, setD] = useState<Form>(DEFAULT);

  useEffect(() => {
    if (window.location.hash.length < 2) return;
    const p = new URLSearchParams(window.location.hash.slice(1));
    const sc = p.get("sc") as ZoneScenario | null;
    if (!sc || !(sc in SCENARIOS)) return;
    const st = SCENARIOS[sc].start; // a link may carry only some settings
    const f: Form = { sc, scan: p.get("scan") ?? st.scan, pre: p.get("pre") ?? st.pre, dur: p.get("dur") ?? st.dur, a: p.get("a") ?? st.a, e: p.get("e") ?? st.e, x: p.get("x") ?? st.x };
    setForm(f);
    setD(f);
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      setD(form);
      const p = new URLSearchParams({ ...form });
      history.replaceState(null, "", `#${p.toString()}`);
    }, 150);
    return () => clearTimeout(h);
  }, [form]);

  const uses = ZONE_USES[d.sc];
  const scan = int(d.scan);
  const pre = uses.timers ? int(d.pre) : 0;
  const dur = int(d.dur);
  const aT = parseToggles(d.a);
  const eT = parseToggles(d.e);
  const xT = parseToggles(uses.x ? d.x : "");

  const run = useMemo<{ error: string } | { samples: ZoneSample[] }>(() => {
    if (scan === null || dur === null || pre === null) return { error: t("Scan time, preset and duration must be whole milliseconds") };
    if (!aT.ok) return { error: `A: ${aT.error}` };
    if (!eT.ok) return { error: `E: ${eT.error}` };
    if (!xT.ok) return { error: `X: ${xT.error}` };
    const r = simulateZone({ scenario: d.sc, scanMs: scan, durationMs: dur, presetMs: pre, aToggles: aT.value, eToggles: eT.value, xToggles: xT.value });
    return r.ok ? { samples: r.samples } : { error: t(r.error) };
  }, [scan, dur, pre, aT, eT, xT, d.sc, t]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const pick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value as ZoneScenario;
    setForm({ sc: s, ...SCENARIOS[s].start });
  };

  const notes: string[] = [];
  let traces: Trace<ZoneSample>[] = [];
  if ("samples" in run && scan !== null) {
    const s = run.samples;
    const where = (f: (x: ZoneSample) => boolean) => spans(s.filter(f).map((x) => x.t), scan);
    const b = (k: string) => (x: ZoneSample) => x.v[k] === true;

    if (d.sc === "jmp-zone") {
      const skipped = s.filter((x) => x.skipped.length > 0);
      if (skipped.length) {
        notes.push(t("Rungs 2–5 are skipped at {s}. On those scans nothing inside the zone is written: Y keeps its last value whatever A does (Y is TRUE at {y}).").replace("{s}", where((x) => x.skipped.length > 0)).replace("{y}", spans(zoneOn(s, "Y"), scan)));
        for (const tag of ["T1", "T3"]) {
          const k = `${tag}.ACC`;
          const jump = s.findIndex((x, i) => i > 0 && (x.v[k] as number) - (s[i - 1]!.v[k] as number) > scan);
          if (jump > 0) {
            notes.push(t("{tag}.ACC jumps from {from} to {to} at {at} ms: the first scan back adds all the time since the timer last ran, whatever A did in between.").replace("{tag}", tag).replace("{from}", String(s[jump - 1]!.v[k])).replace("{to}", String(s[jump]!.v[k])).replace("{at}", String(s[jump]!.t)));
            break;
          }
        }
      } else {
        notes.push(t("E is TRUE on every scan, so nothing is skipped. Make E FALSE for a while to see the jump."));
      }
    } else if (d.sc === "mcr-zone") {
      const off = s.filter((x) => !x.v.E);
      if (off.length) {
        notes.push(t("The zone is disabled at {s}. Its rungs still run, as false: Y is FALSE and T1 is cleared, but T2.DN is TRUE at {tof} (a false rung starts a TOF) and T3.ACC holds.").replace("{s}", where((x) => !x.v.E)).replace("{tof}", spans(off.filter(b("T2.DN")).map((x) => x.t), scan)));
      } else {
        notes.push(t("E is TRUE on every scan, so the zone is never disabled. Make E FALSE for a while to see the zone run false."));
      }
    } else if (d.sc === "mcr-open-end") {
      const lost = s.filter((x) => x.v.A && !x.v.Y2);
      notes.push(
        lost.length
          ? t("Y2 is outside the zone, yet it is FALSE at {s} while A is TRUE: the zone was enabled and the end MCR's rung was false, so it toggled the override on for every rung after it.").replace("{s}", where((x) => x.v.A === true && !x.v.Y2))
          : t("Y2 follows A on every scan here. Make E TRUE while X is FALSE to see the end MCR switch it off."),
      );
    } else {
      const leak = s.filter((x) => !x.v.E && x.v.Y2);
      notes.push(
        leak.length
          ? t("Y2 is TRUE at {s} although E is FALSE: the jump skipped the starting MCR, so the zone was never disabled. Y1 was skipped and kept its value.").replace("{s}", where((x) => !x.v.E && x.v.Y2 === true))
          : t("The jump never lands while E is FALSE here. Make X TRUE while E is FALSE to see the zone stay enabled."),
      );
    }

    traces = ZONE_SIGNALS[d.sc].map((sig) =>
      sig.endsWith(".ACC")
        ? { kind: "ramp" as const, label: sig, get: (x: ZoneSample) => x.v[sig] as number }
        : { kind: "bit" as const, label: sig, get: (x: ZoneSample) => x.v[sig] === true },
    );
    if (d.sc === "jmp-zone" || d.sc === "jmp-into-mcr") traces.splice(uses.x ? 3 : 2, 0, { kind: "bit", label: "skipped", get: (x) => x.skipped.length > 0 });
  }

  const sc = SCENARIOS[form.sc];
  const formUses = ZONE_USES[form.sc];

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <label htmlFor="pz-sc" className="font-mono text-xs text-mute">{t("Program")}</label>
      <select id="pz-sc" value={form.sc} onChange={pick} className={`${fieldCls} border-line-strong`}>
        {(Object.keys(SCENARIOS) as ZoneScenario[]).map((s) => <option key={s} value={s}>{t(SCENARIOS[s].label)}</option>)}
      </select>

      <pre className="mt-3 overflow-x-auto rounded-btn border border-line-soft bg-well px-3 py-2 font-mono text-xs leading-relaxed text-body">
        {ZONE_PROGRAMS[form.sc].join("\n")}
      </pre>

      <div className={`mt-3 grid gap-3 ${formUses.timers ? "grid-cols-3" : "grid-cols-2"}`}>
        <div>
          <label htmlFor="pz-scan" className="font-mono text-xs text-mute">{t("Scan time")} (ms)</label>
          <input id="pz-scan" value={form.scan} onChange={set("scan")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${scan === null || scan < 1 ? "border-err" : "border-line-strong"}`} />
        </div>
        {formUses.timers && (
          <div>
            <label htmlFor="pz-pre" className="font-mono text-xs text-mute">.PRE (ms)</label>
            <input id="pz-pre" value={form.pre} onChange={set("pre")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${pre === null ? "border-err" : "border-line-strong"}`} />
          </div>
        )}
        <div>
          <label htmlFor="pz-dur" className="font-mono text-xs text-mute">{t("Duration")} (ms)</label>
          <input id="pz-dur" value={form.dur} onChange={set("dur")} inputMode="numeric" spellCheck={false} className={`${fieldCls} ${dur === null ? "border-err" : "border-line-strong"}`} />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="pz-a" className="font-mono text-xs text-mute">{t("A toggles at (ms) — starts FALSE")}</label>
        <input id="pz-a" value={form.a} onChange={set("a")} spellCheck={false} className={`${fieldCls} ${aT.ok ? "border-line-strong" : "border-err"}`} />
      </div>
      <div className="mt-3">
        <label htmlFor="pz-e" className="font-mono text-xs text-mute">{t(sc.eLabel)}</label>
        <input id="pz-e" value={form.e} onChange={set("e")} spellCheck={false} className={`${fieldCls} ${eT.ok ? "border-line-strong" : "border-err"}`} />
      </div>
      {sc.xLabel && (
        <div className="mt-3">
          <label htmlFor="pz-x" className="font-mono text-xs text-mute">{t(sc.xLabel)}</label>
          <input id="pz-x" value={form.x} onChange={set("x")} spellCheck={false} className={`${fieldCls} ${xT.ok ? "border-line-strong" : "border-err"}`} />
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
            <TimingDiagram<ZoneSample>
              samples={run.samples}
              traces={traces}
              preset={uses.timers ? pre! : undefined}
              duration={dur!}
              title={t("Each row is sampled once per scan, at the end of the scan")}
            />
            <p className="mt-2 text-xs text-mute">
              {t("Logix rules (RM003). Rungs run top to bottom once per scan; inputs are read at the start of the scan. Toggle times fall on the first scan at or after them.")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
