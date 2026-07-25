"use client";

import { useEffect, useMemo, useState } from "react";
import { scale, scaleCurrent, type LoopStatus } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const STATUS_LABEL: Record<LoopStatus, { text: string; cls: string }> = {
  "open-loop": { text: "OPEN LOOP — check wiring / transmitter", cls: "border-err/40 text-err" },
  "under-range": { text: "Under-range (3.8–4 mA)", cls: "border-warn/40 text-warn" },
  ok: { text: "In range", cls: "border-ok/40 text-ok" },
  "over-range": { text: "Over-range (> 20.5 mA)", cls: "border-warn/40 text-warn" },
};

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function FourTwentyTool() {
  const [direction, setDirection] = useState<"toPv" | "toMa">("toPv");
  const [maText, setMaText] = useState("12");
  const [pvText, setPvText] = useState("100");
  const [loText, setLoText] = useState("0");
  const [hiText, setHiText] = useState("200");
  const [unit, setUnit] = useState("°C");
  const [d, setD] = useState({ maText, pvText, loText, hiText });

  useEffect(() => {
    const t = setTimeout(() => setD({ maText, pvText, loText, hiText }), 150);
    return () => clearTimeout(t);
  }, [maText, pvText, loText, hiText]);

  const lo = num(d.loText);
  const hi = num(d.hiText);
  const ma = num(d.maText);
  const pv = num(d.pvText);
  const rangeOk = lo !== null && hi !== null && hi !== lo;

  const result = useMemo(() => {
    if (!rangeOk) return null;
    if (direction === "toPv") {
      if (ma === null) return null;
      return { kind: "pv" as const, ...scaleCurrent(ma, lo!, hi!) };
    }
    if (pv === null) return null;
    const mAv = scale(pv, lo!, hi!, 4, 20);
    return { kind: "ma" as const, mA: mAv, percentOfSpan: scale(pv, lo!, hi!, 0, 100) };
  }, [rangeOk, direction, ma, pv, lo, hi]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Direction">
        {(
          [
            ["toPv", "mA → Value"],
            ["toMa", "Value → mA"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={direction === key}
            onClick={() => setDirection(key)}
            className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${
              direction === key ? "bg-elevated text-ink" : "text-mute hover:text-body"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          {direction === "toPv" ? (
            <div className="col-span-2">
              <label htmlFor="ft-ma" className="text-xs font-medium uppercase tracking-wide text-mute">Loop current (mA)</label>
              <input id="ft-ma" value={maText} onChange={(e) => setMaText(e.target.value)} spellCheck={false}
                className={`${fieldCls} ${ma === null ? "border-err" : "border-line-strong"}`} />
            </div>
          ) : (
            <div className="col-span-2">
              <label htmlFor="ft-pv" className="text-xs font-medium uppercase tracking-wide text-mute">Process value ({unit || "unit"})</label>
              <input id="ft-pv" value={pvText} onChange={(e) => setPvText(e.target.value)} spellCheck={false}
                className={`${fieldCls} ${pv === null ? "border-err" : "border-line-strong"}`} />
            </div>
          )}
          <div>
            <label htmlFor="ft-lo" className="text-xs font-medium uppercase tracking-wide text-mute">Range low (= 4 mA)</label>
            <input id="ft-lo" value={loText} onChange={(e) => setLoText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${lo === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div>
            <label htmlFor="ft-hi" className="text-xs font-medium uppercase tracking-wide text-mute">Range high (= 20 mA)</label>
            <input id="ft-hi" value={hiText} onChange={(e) => setHiText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${hi === null || hi === lo ? "border-err" : "border-line-strong"}`} />
          </div>
          <div className="col-span-2">
            <label htmlFor="ft-unit" className="text-xs font-medium uppercase tracking-wide text-mute">Unit label</label>
            <input id="ft-unit" value={unit} onChange={(e) => setUnit(e.target.value)} spellCheck={false}
              className={`${fieldCls} border-line-strong`} />
          </div>
        </div>

        <div className="space-y-2.5">
          {result === null ? (
            <p className="text-sm text-mute">Fix the highlighted inputs to see results.</p>
          ) : result.kind === "pv" ? (
            <>
              <p className={`rounded-btn border px-3 py-2 font-mono text-sm ${STATUS_LABEL[result.status].cls}`}>
                {STATUS_LABEL[result.status].text}
              </p>
              <ResultCard label={`Process value (${unit || "unit"})`} value={result.value.toFixed(4).replace(/\.?0+$/, "") || "0"} size="lg" />
              <ResultCard label="Percent of span" value={`${result.percentOfSpan.toFixed(2)} %`} />
            </>
          ) : (
            <>
              <ResultCard label="Loop current" value={`${result.mA.toFixed(4).replace(/\.?0+$/, "")} mA`} size="lg" />
              <ResultCard label="Percent of span" value={`${result.percentOfSpan.toFixed(2)} %`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
