"use client";

import { useEffect, useMemo, useState } from "react";
import { loopBudget } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

export function LoopBurdenTool() {
  const t = useToolText();
  const [form, setForm] = useState({ supply: "24", minV: "12", sense: "250", wire: "50", other: "0" });
  const [d, setD] = useState(form);

  useEffect(() => {
    const h = setTimeout(() => setD(form), 150);
    return () => clearTimeout(h);
  }, [form]);

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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="lb-supply" className="font-mono text-xs text-mute">{t("Loop supply (V)")}</label>
            <input id="lb-supply" value={form.supply} onChange={set("supply")} spellCheck={false} className={`${fieldCls} ${v.supply === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div>
            <label htmlFor="lb-minv" className="font-mono text-xs text-mute">{t("Transmitter min V (datasheet)")}</label>
            <input id="lb-minv" value={form.minV} onChange={set("minV")} spellCheck={false} className={`${fieldCls} ${v.minV === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div>
            <label htmlFor="lb-sense" className="font-mono text-xs text-mute">{t("Sense resistor (Ω)")}</label>
            <input id="lb-sense" value={form.sense} onChange={set("sense")} spellCheck={false} className={`${fieldCls} ${v.sense === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div>
            <label htmlFor="lb-wire" className="font-mono text-xs text-mute">{t("Wire resistance (Ω)")}</label>
            <input id="lb-wire" value={form.wire} onChange={set("wire")} spellCheck={false} className={`${fieldCls} ${v.wire === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div className="col-span-2">
            <label htmlFor="lb-other" className="font-mono text-xs text-mute">{t("Other series drops as resistance (Ω) — barriers, indicators")}</label>
            <input id="lb-other" value={form.other} onChange={set("other")} spellCheck={false} className={`${fieldCls} ${v.other === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <p className="col-span-2 font-mono text-xs text-mute">{t("evaluated at 20 mA full scale")}</p>
        </div>

        <div className="space-y-2.5">
          {result && (
            <>
              <p className={`rounded-btn border px-3 py-2 font-mono text-sm ${result.ok ? "border-ok/40 text-ok" : "border-err/40 text-err"}`}>
                {result.ok
                  ? t("OK — {margin} V margin at full scale").replace("{margin}", result.margin.toFixed(2))
                  : t("INSUFFICIENT — {short} V short at full scale").replace("{short}", (-result.margin).toFixed(2))}
              </p>
              <ResultCard label={t("Voltage at transmitter @ 20 mA")} value={`${result.vAtTransmitter.toFixed(2)} V`} size="lg" />
              <ResultCard label={t("Drop across loop resistance")} value={`${result.vDrop.toFixed(2)} V (${totalR} Ω)`} />
              <ResultCard label={t("Max loop resistance for this budget")} value={`${result.maxResistance.toFixed(0)} Ω`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
