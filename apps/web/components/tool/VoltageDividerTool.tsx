"use client";

import { useEffect, useMemo, useState } from "react";
import { dividerOptions, dividerVout, type ESeriesName } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

function fmtR(r: number): string {
  if (r >= 1e6) return `${(r / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (r >= 1e3) return `${(r / 1e3).toFixed(2).replace(/\.?0+$/, "")}k`;
  return `${r.toFixed(1).replace(/\.?0+$/, "")}`;
}

export function VoltageDividerTool() {
  const [mode, setMode] = useState<"find" | "compute">("find");
  const [t, setT] = useState({ vin: "5", vout: "3.3", r1: "10000", r2: "10000" });
  const [series, setSeries] = useState<ESeriesName>("E96");
  const [scaleText, setScaleText] = useState("10000");
  const [d, setD] = useState(t);

  useEffect(() => {
    const h = setTimeout(() => setD(t), 150);
    return () => clearTimeout(h);
  }, [t]);

  const v = { vin: num(d.vin), vout: num(d.vout), r1: num(d.r1), r2: num(d.r2) };
  const set = (k: keyof typeof t) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setT((p) => ({ ...p, [k]: e.target.value }));

  const options = useMemo(() => {
    if (mode !== "find" || v.vin === null || v.vout === null) return [];
    return dividerOptions(v.vin, v.vout, series, Number(scaleText) || 10_000);
  }, [mode, v.vin, v.vout, series, scaleText]);

  const computed =
    mode === "compute" && v.vin !== null && v.r1 !== null && v.r2 !== null && v.r1 + v.r2 > 0
      ? dividerVout(v.vin, v.r1, v.r2)
      : null;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Mode">
        {([["find", "Find resistors"], ["compute", "Compute Vout"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${mode === k ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="vd-vin" className="font-mono text-xs text-mute">Vin (V)</label>
            <input id="vd-vin" value={t.vin} onChange={set("vin")} spellCheck={false} className={`${fieldCls} ${v.vin === null ? "border-err" : "border-line-strong"}`} />
          </div>
          {mode === "find" ? (
            <>
              <div>
                <label htmlFor="vd-vout" className="font-mono text-xs text-mute">Target Vout (V)</label>
                <input id="vd-vout" value={t.vout} onChange={set("vout")} spellCheck={false} className={`${fieldCls} ${v.vout === null ? "border-err" : "border-line-strong"}`} />
              </div>
              <div>
                <label htmlFor="vd-series" className="font-mono text-xs text-mute">Series</label>
                <select id="vd-series" value={series} onChange={(e) => setSeries(e.target.value as ESeriesName)} className={`${fieldCls} border-line-strong`}>
                  <option value="E24">E24 (±5 %)</option>
                  <option value="E96">E96 (±1 %)</option>
                </select>
              </div>
              <div>
                <label htmlFor="vd-scale" className="font-mono text-xs text-mute">R2 magnitude (Ω)</label>
                <select id="vd-scale" value={scaleText} onChange={(e) => setScaleText(e.target.value)} className={`${fieldCls} border-line-strong`}>
                  <option value="1000">~1 k</option>
                  <option value="10000">~10 k</option>
                  <option value="100000">~100 k</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="vd-r1" className="font-mono text-xs text-mute">R1 — top (Ω)</label>
                <input id="vd-r1" value={t.r1} onChange={set("r1")} spellCheck={false} className={`${fieldCls} ${v.r1 === null ? "border-err" : "border-line-strong"}`} />
              </div>
              <div>
                <label htmlFor="vd-r2" className="font-mono text-xs text-mute">R2 — bottom (Ω)</label>
                <input id="vd-r2" value={t.r2} onChange={set("r2")} spellCheck={false} className={`${fieldCls} ${v.r2 === null ? "border-err" : "border-line-strong"}`} />
              </div>
            </>
          )}
          <p className="col-span-2 font-mono text-xs text-mute">Vout = Vin · R2 / (R1 + R2) — unloaded output</p>
        </div>

        <div className="space-y-2.5">
          {mode === "compute" && computed !== null && (
            <ResultCard label="Vout (unloaded)" value={`${computed.toFixed(4)} V`} size="lg" />
          )}
          {mode === "find" &&
            (options.length > 0 ? (
              <div className="overflow-x-auto rounded-btn border border-line-soft">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                      <th className="px-3 py-2 font-medium">R1</th>
                      <th className="px-3 py-2 font-medium">R2</th>
                      <th className="px-3 py-2 font-medium">Vout</th>
                      <th className="px-3 py-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((o) => (
                      <tr key={`${o.r1}-${o.r2}`} className="border-b border-line-soft font-mono text-[13px] last:border-0">
                        <td className="px-3 py-2 text-ink">{fmtR(o.r1)}</td>
                        <td className="px-3 py-2 text-ink">{fmtR(o.r2)}</td>
                        <td className="px-3 py-2 text-body">{o.vout.toFixed(4)} V</td>
                        <td className={`px-3 py-2 ${Math.abs(o.error) < 0.01 ? "text-ok" : "text-warn"}`}>
                          {(o.error * 100).toFixed(2)} %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-mute">Enter Vin and a target Vout below Vin.</p>
            ))}
        </div>
      </div>
    </div>
  );
}
