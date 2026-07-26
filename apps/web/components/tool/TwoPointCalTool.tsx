"use client";

import { useEffect, useMemo, useState } from "react";
import { applyCal, invertCal, twoPointCal } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

export function TwoPointCalTool() {
  const [t, setT] = useState({ x1: "4", y1: "0", x2: "20", y2: "200", test: "12" });
  const [d, setD] = useState(t);

  useEffect(() => {
    const h = setTimeout(() => setD(t), 150);
    return () => clearTimeout(h);
  }, [t]);

  const vals = {
    x1: num(d.x1), y1: num(d.y1), x2: num(d.x2), y2: num(d.y2), test: num(d.test),
  };

  const cal = useMemo(() => {
    if (vals.x1 === null || vals.y1 === null || vals.x2 === null || vals.y2 === null) return null;
    return twoPointCal(vals.x1, vals.y1, vals.x2, vals.y2);
  }, [vals.x1, vals.y1, vals.x2, vals.y2]);

  const set = (k: keyof typeof t) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setT((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-mute">Reference points</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tp-x1" className="font-mono text-xs text-mute">x₁ (input)</label>
              <input id="tp-x1" value={t.x1} onChange={set("x1")} spellCheck={false} className={`${fieldCls} ${vals.x1 === null ? "border-err" : "border-line-strong"}`} />
            </div>
            <div>
              <label htmlFor="tp-y1" className="font-mono text-xs text-mute">y₁ (output)</label>
              <input id="tp-y1" value={t.y1} onChange={set("y1")} spellCheck={false} className={`${fieldCls} ${vals.y1 === null ? "border-err" : "border-line-strong"}`} />
            </div>
            <div>
              <label htmlFor="tp-x2" className="font-mono text-xs text-mute">x₂ (input)</label>
              <input id="tp-x2" value={t.x2} onChange={set("x2")} spellCheck={false} className={`${fieldCls} ${vals.x2 === null || cal === null ? "border-err" : "border-line-strong"}`} />
            </div>
            <div>
              <label htmlFor="tp-y2" className="font-mono text-xs text-mute">y₂ (output)</label>
              <input id="tp-y2" value={t.y2} onChange={set("y2")} spellCheck={false} className={`${fieldCls} ${vals.y2 === null ? "border-err" : "border-line-strong"}`} />
            </div>
          </div>
          {cal === null && vals.x1 !== null && vals.x2 !== null && (
            <p className="mt-2 font-mono text-xs text-err" role="alert">x₁ and x₂ must differ.</p>
          )}
          <div className="mt-4">
            <label htmlFor="tp-test" className="text-xs font-medium uppercase tracking-wide text-mute">Apply to input x</label>
            <input id="tp-test" value={t.test} onChange={set("test")} spellCheck={false} className={`${fieldCls} border-line-strong`} />
          </div>
        </div>

        <div className="space-y-2.5">
          {cal && (
            <>
              <ResultCard label="Slope (gain)" value={cal.slope.toPrecision(8).replace(/\.?0+$/, "")} size="lg" />
              <ResultCard label="Offset" value={cal.offset.toPrecision(8).replace(/\.?0+$/, "")} />
              <ResultCard label="Equation" value={`y = ${cal.slope.toPrecision(6)}·x ${cal.offset >= 0 ? "+" : "−"} ${Math.abs(cal.offset).toPrecision(6)}`} />
              {vals.test !== null && (
                <>
                  <ResultCard label={`y at x = ${vals.test}`} value={applyCal(cal, vals.test).toPrecision(8).replace(/\.?0+$/, "")} />
                  {invertCal(cal, vals.test) !== null && (
                    <ResultCard label={`x at y = ${vals.test}`} value={invertCal(cal, vals.test)!.toPrecision(8).replace(/\.?0+$/, "")} />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
