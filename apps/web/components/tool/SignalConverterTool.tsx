"use client";

import { useEffect, useMemo, useState } from "react";
import { scale } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

// Conventional instrumentation signal spans
const RANGES = [
  { id: "4-20ma", label: "4–20 mA", lo: 4, hi: 20, unit: "mA" },
  { id: "0-20ma", label: "0–20 mA", lo: 0, hi: 20, unit: "mA" },
  { id: "1-5v", label: "1–5 V", lo: 1, hi: 5, unit: "V" },
  { id: "0-5v", label: "0–5 V", lo: 0, hi: 5, unit: "V" },
  { id: "0-10v", label: "0–10 V", lo: 0, hi: 10, unit: "V" },
  { id: "3-15psi", label: "3–15 psi", lo: 3, hi: 15, unit: "psi" },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function SignalConverterTool() {
  const t = useToolText();
  const [fromId, setFromId] = useState<RangeId>("4-20ma");
  const [toId, setToId] = useState<RangeId>("1-5v");
  const [valText, setValText] = useState("12");
  const [d, setD] = useState(valText);

  useEffect(() => {
    const h = setTimeout(() => setD(valText), 150);
    return () => clearTimeout(h);
  }, [valText]);

  const from = RANGES.find((r) => r.id === fromId)!;
  const to = RANGES.find((r) => r.id === toId)!;
  const value = useMemo(() => {
    const v = Number(d.trim());
    return d.trim() === "" || Number.isNaN(v) ? null : v;
  }, [d]);

  const converted = value !== null ? scale(value, from.lo, from.hi, to.lo, to.hi) : null;
  const percent = value !== null ? scale(value, from.lo, from.hi, 0, 100) : null;
  const under = value !== null && value < from.lo;
  const over = value !== null && value > from.hi;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sc-from" className="text-xs font-medium uppercase tracking-wide text-mute">{t("From")}</label>
              <select id="sc-from" value={fromId} onChange={(e) => setFromId(e.target.value as RangeId)} className={`${fieldCls} border-line-strong`}>
                {RANGES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sc-to" className="text-xs font-medium uppercase tracking-wide text-mute">{t("To")}</label>
              <select id="sc-to" value={toId} onChange={(e) => setToId(e.target.value as RangeId)} className={`${fieldCls} border-line-strong`}>
                {RANGES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="sc-val" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Value")} ({from.unit})
            </label>
            <input id="sc-val" value={valText} onChange={(e) => setValText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${value === null ? "border-err" : "border-line-strong"}`} />
          </div>
          {(under || over) && (
            <p className="rounded-btn border border-warn/40 px-3 py-2 font-mono text-xs text-warn">
              {t("Value is outside the {span} span — converting by linear extrapolation.").replace(
                "{span}",
                from.label,
              )}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {converted !== null && (
            <>
              <ResultCard label={`${to.label} ${t("equivalent")}`} value={`${converted.toFixed(4).replace(/\.?0+$/, "")} ${to.unit}`} size="lg" />
              <ResultCard label={t("Percent of span")} value={`${percent!.toFixed(2)} %`} />
              <ResultCard label={t("Span mapping")} value={`${from.label} → ${to.label}`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
