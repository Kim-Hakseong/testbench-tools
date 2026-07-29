"use client";

import { useEffect, useMemo, useState } from "react";
import { rtdResistance, rtdTemperature } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function Pt100Tool() {
  const t = useToolText();
  const [r0, setR0] = useState(100);
  const [direction, setDirection] = useState<"toR" | "toT">("toR");
  const [tempText, setTempText] = useState("100");
  const [resText, setResText] = useState("108.5");
  const [d, setD] = useState({ tempText, resText });

  useEffect(() => {
    const h = setTimeout(() => setD({ tempText, resText }), 150);
    return () => clearTimeout(h);
  }, [tempText, resText]);

  const temp = num(d.tempText);
  const res = num(d.resText);

  const result = useMemo(() => {
    if (direction === "toR") {
      if (temp === null) return { error: t("Enter a temperature.") };
      const r = rtdResistance(temp, r0);
      if (r === null)
        return {
          error: t(
            "Supported range is 0…850 °C (the T < 0 °C branch of IEC 60751 is not implemented here).",
          ),
        };
      return { r };
    }
    if (res === null) return { error: t("Enter a resistance.") };
    const temperature = rtdTemperature(res, r0);
    if (temperature === null)
      return {
        error: t("Supported range is R ≥ R0 ({r0} Ω), i.e. T ≥ 0 °C.").replace("{r0}", String(r0)),
      };
    return { t: temperature };
  }, [direction, temp, res, r0, t]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Sensor type")}>
          {(
            [
              [100, "PT100"],
              [1000, "PT1000"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={r0 === value}
              onClick={() => setR0(value)}
              className={`flex-1 rounded-[6px] px-3 py-1.5 font-mono text-sm transition-colors ${
                r0 === value ? "bg-elevated text-ink" : "text-mute hover:text-body"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Direction")}>
          {(
            [
              ["toR", "°C → Ω"],
              ["toT", "Ω → °C"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={direction === key}
              onClick={() => setDirection(key)}
              className={`flex-1 rounded-[6px] px-3 py-1.5 font-mono text-sm transition-colors ${
                direction === key ? "bg-elevated text-ink" : "text-mute hover:text-body"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          {direction === "toR" ? (
            <>
              <label htmlFor="pt-t" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Temperature")} (°C, 0…850)</label>
              <input id="pt-t" value={tempText} onChange={(e) => setTempText(e.target.value)} spellCheck={false}
                className={`${fieldCls} ${"error" in result ? "border-err" : "border-line-strong"}`} />
            </>
          ) : (
            <>
              <label htmlFor="pt-r" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Resistance")} (Ω, ≥ {r0})</label>
              <input id="pt-r" value={resText} onChange={(e) => setResText(e.target.value)} spellCheck={false}
                className={`${fieldCls} ${"error" in result ? "border-err" : "border-line-strong"}`} />
            </>
          )}
          {"error" in result && (
            <p className="mt-1.5 font-mono text-xs text-err" role="alert">{result.error}</p>
          )}
          <p className="mt-3 font-mono text-xs text-mute">
            R(T) = R0·(1 + A·T + B·T²)
            <br />A = 3.9083×10⁻³ · B = −5.775×10⁻⁷
          </p>
        </div>

        <div className="space-y-2.5">
          {"r" in result && result.r !== undefined ? (
            <ResultCard label={t("Resistance")} value={`${result.r.toFixed(4)} Ω`} size="lg" />
          ) : "t" in result && result.t !== undefined ? (
            <ResultCard label={t("Temperature")} value={`${result.t.toFixed(4)} °C`} size="lg" />
          ) : (
            <p className="text-sm text-mute">{t("Fix the input to see results.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
