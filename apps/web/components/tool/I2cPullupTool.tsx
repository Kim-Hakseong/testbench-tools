"use client";

import { useEffect, useMemo, useState } from "react";
import { i2cPullup, nearestValue, type I2cMode } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) || v <= 0 ? null : v;
}

export function I2cPullupTool() {
  const [mode, setMode] = useState<I2cMode>("fast");
  const [t, setT] = useState({ vdd: "3.3", cap: "150" });
  const [d, setD] = useState(t);

  useEffect(() => {
    const h = setTimeout(() => setD(t), 150);
    return () => clearTimeout(h);
  }, [t]);

  const vdd = num(d.vdd);
  const cap = num(d.cap);

  const result = useMemo(() => {
    if (vdd === null || cap === null) return null;
    return i2cPullup(vdd, cap * 1e-12, mode);
  }, [vdd, cap, mode]);

  const set = (k: keyof typeof t) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setT((p) => ({ ...p, [k]: e.target.value }));

  const mid = result && result.ok ? Math.sqrt(result.rMin * result.rMax) : null;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Mode">
            {([["standard", "100 kHz"], ["fast", "400 kHz"], ["fast-plus", "1 MHz"]] as const).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k}
                onClick={() => setMode(k)}
                className={`flex-1 rounded-[6px] px-2 py-1.5 font-mono text-sm transition-colors ${mode === k ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="i2c-vdd" className="font-mono text-xs text-mute">VDD (V)</label>
              <input id="i2c-vdd" value={t.vdd} onChange={set("vdd")} spellCheck={false} className={`${fieldCls} ${vdd === null ? "border-err" : "border-line-strong"}`} />
            </div>
            <div>
              <label htmlFor="i2c-cap" className="font-mono text-xs text-mute">Bus capacitance (pF)</label>
              <input id="i2c-cap" value={t.cap} onChange={set("cap")} spellCheck={false} className={`${fieldCls} ${cap === null ? "border-err" : "border-line-strong"}`} />
            </div>
          </div>
          <p className="font-mono text-xs text-mute">
            R_max = t_r / (0.8473 · C_b) · R_min = (VDD − 0.4 V) / I_OL
            <br />spec I_OL: 3 mA (Std/Fast) · 20 mA (Fast-mode+)
          </p>
        </div>

        <div className="space-y-2.5">
          {result &&
            (result.ok ? (
              <>
                <ResultCard label="Valid pull-up range" value={`${result.rMin.toFixed(0)} Ω … ${(result.rMax / 1000).toFixed(2)} kΩ`} size="lg" />
                {mid !== null && (
                  <ResultCard label="Suggested (geometric mid, nearest E24)" value={`${(nearestValue(mid, "E24") / 1000).toFixed(2).replace(/\.?0+$/, "")} kΩ`} />
                )}
                <ResultCard label="R min (sink current limit)" value={`${result.rMin.toFixed(0)} Ω`} />
                <ResultCard label="R max (rise time limit)" value={`${result.rMax.toFixed(0)} Ω`} />
              </>
            ) : (
              <p className="rounded-btn border border-err/40 px-3 py-2 font-mono text-sm text-err">
                No valid resistor: rise-time limit ({result.rMax.toFixed(0)} Ω) is below the sink-current
                limit ({result.rMin.toFixed(0)} Ω). Reduce bus capacitance, lower the speed mode, or use
                a bus accelerator.
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}
