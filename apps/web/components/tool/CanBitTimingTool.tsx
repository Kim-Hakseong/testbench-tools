"use client";

import { useEffect, useMemo, useState } from "react";
import { canBitTiming } from "@testbench/engine";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) || v <= 0 ? null : v;
}

export function CanBitTimingTool() {
  const [t, setT] = useState({ fclk: "8000000", rate: "500000", sp: "87.5" });
  const [d, setD] = useState(t);

  useEffect(() => {
    const h = setTimeout(() => setD(t), 150);
    return () => clearTimeout(h);
  }, [t]);

  const fclk = num(d.fclk);
  const rate = num(d.rate);
  const sp = num(d.sp);

  const options = useMemo(() => {
    if (fclk === null || rate === null || sp === null || sp <= 0 || sp >= 100) return [];
    return canBitTiming(fclk, rate, sp / 100);
  }, [fclk, rate, sp]);

  const set = (k: keyof typeof t) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setT((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="cbt-fclk" className="font-mono text-xs text-mute">CAN clock (Hz)</label>
          <input id="cbt-fclk" value={t.fclk} onChange={set("fclk")} spellCheck={false} className={`${fieldCls} ${fclk === null ? "border-err" : "border-line-strong"}`} />
        </div>
        <div>
          <label htmlFor="cbt-rate" className="font-mono text-xs text-mute">Bitrate (bit/s)</label>
          <input id="cbt-rate" value={t.rate} onChange={set("rate")} spellCheck={false} className={`${fieldCls} ${rate === null ? "border-err" : "border-line-strong"}`} />
        </div>
        <div>
          <label htmlFor="cbt-sp" className="font-mono text-xs text-mute">Target sample point (%)</label>
          <input id="cbt-sp" value={t.sp} onChange={set("sp")} spellCheck={false} className={`${fieldCls} ${sp === null ? "border-err" : "border-line-strong"}`} />
        </div>
      </div>

      <div className="mt-4">
        {options.length === 0 ? (
          <p className="text-sm text-mute">
            No valid configuration (8–25 tq/bit) — try a different clock/bitrate combination.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-btn border border-line-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                  <th className="px-3 py-2 font-medium">Prescaler</th>
                  <th className="px-3 py-2 font-medium">Tq/bit</th>
                  <th className="px-3 py-2 font-medium">Seg1</th>
                  <th className="px-3 py-2 font-medium">Seg2</th>
                  <th className="px-3 py-2 font-medium">Sample point</th>
                  <th className="px-3 py-2 font-medium">Actual rate</th>
                  <th className="px-3 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {options.map((o, i) => (
                  <tr key={`${o.prescaler}-${o.tqPerBit}`} className={`border-b border-line-soft font-mono text-[13px] last:border-0 ${i === 0 ? "bg-elevated" : ""}`}>
                    <td className="px-3 py-2 text-ink">{o.prescaler}</td>
                    <td className="px-3 py-2 text-ink">{o.tqPerBit}</td>
                    <td className="px-3 py-2 text-body">{o.seg1}</td>
                    <td className="px-3 py-2 text-body">{o.seg2}</td>
                    <td className="px-3 py-2 text-body">{(o.samplePoint * 100).toFixed(1)} %</td>
                    <td className="px-3 py-2 text-body">{Math.round(o.actualRate)}</td>
                    <td className={`px-3 py-2 ${o.error === 0 ? "text-ok" : Math.abs(o.error) < 0.005 ? "text-warn" : "text-err"}`}>
                      {(o.error * 100).toFixed(3)} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 font-mono text-xs text-mute">
          bit = SYNC(1) + SEG1 + SEG2 tq · sample after SEG1 · best row highlighted
        </p>
      </div>
    </div>
  );
}
