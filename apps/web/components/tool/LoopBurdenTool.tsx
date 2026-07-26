"use client";

import { useEffect, useMemo, useState } from "react";
import { loopBudget } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

export function LoopBurdenTool() {
  const [t, setT] = useState({ supply: "24", minV: "12", sense: "250", wire: "50", other: "0" });
  const [d, setD] = useState(t);

  useEffect(() => {
    const h = setTimeout(() => setD(t), 150);
    return () => clearTimeout(h);
  }, [t]);

  const v = {
    supply: num(d.supply), minV: num(d.minV),
    sense: num(d.sense), wire: num(d.wire), other: num(d.other),
  };
  const ok = Object.values(v).every((x) => x !== null);
  const totalR = ok ? v.sense! + v.wire! + v.other! : 0;

  const result = useMemo(() => {
    if (!ok) return null;
    return loopBudget({ supply: v.supply!, minTransmitterV: v.minV!, loopResistance: totalR });
  }, [ok, v.supply, v.minV, totalR]);

  const set = (k: keyof typeof t) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setT((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="lb-supply" className="font-mono text-xs text-mute">Loop supply (V)</label>
            <input id="lb-supply" value={t.supply} onChange={set("supply")} spellCheck={false} className={`${fieldCls} ${v.supply === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div>
            <label htmlFor="lb-minv" className="font-mono text-xs text-mute">Transmitter min V (datasheet)</label>
            <input id="lb-minv" value={t.minV} onChange={set("minV")} spellCheck={false} className={`${fieldCls} ${v.minV === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div>
            <label htmlFor="lb-sense" className="font-mono text-xs text-mute">Sense resistor (Ω)</label>
            <input id="lb-sense" value={t.sense} onChange={set("sense")} spellCheck={false} className={`${fieldCls} ${v.sense === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div>
            <label htmlFor="lb-wire" className="font-mono text-xs text-mute">Wire resistance (Ω)</label>
            <input id="lb-wire" value={t.wire} onChange={set("wire")} spellCheck={false} className={`${fieldCls} ${v.wire === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div className="col-span-2">
            <label htmlFor="lb-other" className="font-mono text-xs text-mute">Other series drops as resistance (Ω) — barriers, indicators</label>
            <input id="lb-other" value={t.other} onChange={set("other")} spellCheck={false} className={`${fieldCls} ${v.other === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <p className="col-span-2 font-mono text-xs text-mute">evaluated at 20 mA full scale</p>
        </div>

        <div className="space-y-2.5">
          {result && (
            <>
              <p className={`rounded-btn border px-3 py-2 font-mono text-sm ${result.ok ? "border-ok/40 text-ok" : "border-err/40 text-err"}`}>
                {result.ok
                  ? `OK — ${result.margin.toFixed(2)} V margin at full scale`
                  : `INSUFFICIENT — ${(-result.margin).toFixed(2)} V short at full scale`}
              </p>
              <ResultCard label="Voltage at transmitter @ 20 mA" value={`${result.vAtTransmitter.toFixed(2)} V`} size="lg" />
              <ResultCard label="Drop across loop resistance" value={`${result.vDrop.toFixed(2)} V (${totalR} Ω)`} />
              <ResultCard label="Max loop resistance for this budget" value={`${result.maxResistance.toFixed(0)} Ω`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
