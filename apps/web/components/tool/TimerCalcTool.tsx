"use client";

import { useEffect, useMemo, useState } from "react";
import { timerSolutions } from "@testbench/engine";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) || v <= 0 ? null : v;
}

export function TimerCalcTool() {
  const [t, setT] = useState({ fclk: "72000000", target: "1000" });
  const [d, setD] = useState(t);

  useEffect(() => {
    const h = setTimeout(() => setD(t), 150);
    return () => clearTimeout(h);
  }, [t]);

  const fclk = num(d.fclk);
  const target = num(d.target);

  const options = useMemo(() => {
    if (fclk === null || target === null || target > fclk) return [];
    return timerSolutions(fclk, target);
  }, [fclk, target]);

  const set = (k: keyof typeof t) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setT((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tm-fclk" className="font-mono text-xs text-mute">Timer clock (Hz)</label>
          <input id="tm-fclk" value={t.fclk} onChange={set("fclk")} spellCheck={false} className={`${fieldCls} ${fclk === null ? "border-err" : "border-line-strong"}`} />
        </div>
        <div>
          <label htmlFor="tm-target" className="font-mono text-xs text-mute">Target frequency (Hz)</label>
          <input id="tm-target" value={t.target} onChange={set("target")} spellCheck={false} className={`${fieldCls} ${target === null ? "border-err" : "border-line-strong"}`} />
        </div>
      </div>

      <div className="mt-4">
        {options.length === 0 ? (
          <p className="text-sm text-mute">No 16-bit PSC/ARR pair reaches this frequency — check the inputs.</p>
        ) : (
          <div className="overflow-x-auto rounded-btn border border-line-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                  <th className="px-3 py-2 font-medium">PSC</th>
                  <th className="px-3 py-2 font-medium">ARR</th>
                  <th className="px-3 py-2 font-medium">Actual (Hz)</th>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {options.map((o, i) => (
                  <tr key={`${o.psc}-${o.arr}`} className={`border-b border-line-soft font-mono text-[13px] last:border-0 ${i === 0 ? "bg-elevated" : ""}`}>
                    <td className="px-3 py-2 text-ink">{o.psc}</td>
                    <td className="px-3 py-2 text-ink">{o.arr}</td>
                    <td className="px-3 py-2 text-body">{o.actual.toFixed(3).replace(/\.?0+$/, "")}</td>
                    <td className="px-3 py-2 text-body">{(1 / o.actual * 1000).toPrecision(6)} ms</td>
                    <td className={`px-3 py-2 ${o.error === 0 ? "text-ok" : "text-warn"}`}>
                      {(o.error * 100).toFixed(4)} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 font-mono text-xs text-mute">
          f = f_clk / ((PSC+1) · (ARR+1)) · 16-bit registers · best row highlighted
        </p>
      </div>
    </div>
  );
}
