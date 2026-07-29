"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeQ, encodeQ, qInfo } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

// Q-notation preset labels are pure notation and stay as written.
const PRESETS: { label: string; m: number; n: number }[] = [
  { label: "Q15 (Q0.15, 16-bit)", m: 0, n: 15 },
  { label: "Q31 (Q0.31, 32-bit)", m: 0, n: 31 },
  { label: "Q7 (Q0.7, 8-bit)", m: 0, n: 7 },
  { label: "Q7.8 (16-bit)", m: 7, n: 8 },
  { label: "Q15.16 (32-bit)", m: 15, n: 16 },
];

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function QFormatTool() {
  const t = useToolText();
  const [direction, setDirection] = useState<"toRaw" | "toValue">("toRaw");
  const [m, setM] = useState(0);
  const [n, setN] = useState(15);
  const [valText, setValText] = useState("0.5");
  const [rawText, setRawText] = useState("4000");
  const [d, setD] = useState({ valText, rawText });

  useEffect(() => {
    const h = setTimeout(() => setD({ valText, rawText }), 150);
    return () => clearTimeout(h);
  }, [valText, rawText]);

  const info = qInfo(m, n);
  const bitsOk = info.bits >= 2 && info.bits <= 32;

  const result = useMemo(() => {
    if (!bitsOk) return { error: t("1 + m + n must be between 2 and 32 bits.") };
    if (direction === "toRaw") {
      const v = Number(d.valText.trim());
      if (d.valText.trim() === "" || Number.isNaN(v)) return { error: t("Enter a decimal value.") };
      return { enc: encodeQ(v, m, n), input: v };
    }
    const hex = d.rawText.trim().replace(/^0x/i, "");
    const digits = Math.ceil(info.bits / 4);
    if (!new RegExp(`^[0-9a-fA-F]{1,${digits}}$`).test(hex))
      return { error: t("Enter up to {n} hex digits.").replace("{n}", String(digits)) };
    return { dec: decodeQ(parseInt(hex, 16), m, n) };
  }, [bitsOk, direction, d, m, n, info.bits, t]);

  const hexDigits = Math.ceil(info.bits / 4);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="q-preset" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Format preset")}</label>
          <select id="q-preset" value={`${m}.${n}`}
            onChange={(e) => {
              const p = PRESETS.find((x) => `${x.m}.${x.n}` === e.target.value);
              if (p) { setM(p.m); setN(p.n); }
            }}
            className={`${fieldCls} border-line-strong`}>
            {PRESETS.map((p) => (
              <option key={p.label} value={`${p.m}.${p.n}`}>{p.label}</option>
            ))}
            {!PRESETS.some((p) => p.m === m && p.n === n) && (
              <option value={`${m}.${n}`}>Q{m}.{n} ({t("custom")})</option>
            )}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="q-m" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Integer bits (m)")}</label>
            <input id="q-m" type="number" min={0} max={30} value={m}
              onChange={(e) => setM(Number(e.target.value))}
              className={`${fieldCls} ${bitsOk ? "border-line-strong" : "border-err"}`} />
          </div>
          <div>
            <label htmlFor="q-n" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Fraction bits (n)")}</label>
            <input id="q-n" type="number" min={0} max={31} value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className={`${fieldCls} ${bitsOk ? "border-line-strong" : "border-err"}`} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Direction")}>
        {([["toRaw", "Value → Raw"], ["toValue", "Raw → Value"]] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={direction === key}
            onClick={() => setDirection(key)}
            className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${
              direction === key ? "bg-elevated text-ink" : "text-mute hover:text-body"
            }`}>
            {t(label)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          {direction === "toRaw" ? (
            <>
              <label htmlFor="q-val" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Real value")}</label>
              <input id="q-val" value={valText} spellCheck={false}
                onChange={(e) => setValText(e.target.value)}
                className={`${fieldCls} ${"error" in result ? "border-err" : "border-line-strong"}`} />
            </>
          ) : (
            <>
              <label htmlFor="q-raw" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Raw (hex, two's complement)")}</label>
              <input id="q-raw" value={rawText} spellCheck={false}
                onChange={(e) => setRawText(e.target.value)}
                className={`${fieldCls} ${"error" in result ? "border-err" : "border-line-strong"}`} />
            </>
          )}
          {"error" in result && result.error && (
            <p className="mt-1.5 font-mono text-xs text-err" role="alert">{result.error}</p>
          )}
          {bitsOk && (
            <p className="mt-3 font-mono text-xs text-mute">
              Q{m}.{n} · {info.bits}-bit · {t("range")} {info.min} … {info.max.toPrecision(6)}
              <br />{t("resolution")} 2⁻{n} = {info.resolution.toExponential(4)}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {"enc" in result && result.enc ? (
            <>
              <ResultCard label={t("Raw (hex)")} value={"0x" + result.enc.raw.toString(16).toUpperCase().padStart(hexDigits, "0")} size="lg" />
              <ResultCard label={t("Raw (decimal steps)")} value={String(result.enc.stepCount)} />
              <ResultCard label={t("Stored value")} value={String(result.enc.stored)} />
              <ResultCard label={t("Quantization error")} value={(result.enc.stored - result.input!).toExponential(4)} />
              {result.enc.clamped && (
                <p className="rounded-btn border border-warn/40 px-3 py-2 font-mono text-xs text-warn">
                  {t("Input exceeds the Q{q} range — clamped to the nearest representable value.").replace("{q}", `${m}.${n}`)}
                </p>
              )}
            </>
          ) : "dec" in result ? (
            <ResultCard label={t("Real value")} value={String(result.dec)} size="lg" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
