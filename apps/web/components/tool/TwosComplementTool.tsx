"use client";

import { useState } from "react";
import { fromSigned, toSigned } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

type Width = 8 | 16 | 32;

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function TwosComplementTool() {
  const t = useToolText();
  const [width, setWidth] = useState<Width>(16);
  const [decText, setDecText] = useState("-10");
  const [hexText, setHexText] = useState("FFF6");
  const [lastEdit, setLastEdit] = useState<"dec" | "hex">("dec");
  const [error, setError] = useState<string | null>(null);

  function syncFromDec(text: string, w: Width) {
    const v = parseInt(text.trim(), 10);
    const half = Math.pow(2, w - 1);
    if (text.trim() === "" || Number.isNaN(v)) return setError(t("Enter a decimal integer."));
    if (v < -half || v > half - 1)
      return setError(
        t("Out of range for {w}-bit: {min} … {max}.")
          .replace("{w}", String(w))
          .replace("{min}", String(-half))
          .replace("{max}", String(half - 1)),
      );
    setError(null);
    setHexText(fromSigned(v, w).toString(16).toUpperCase().padStart(w / 4, "0"));
  }

  function syncFromHex(text: string, w: Width) {
    const hex = text.trim().replace(/^0x/i, "");
    if (!new RegExp(`^[0-9a-fA-F]{1,${w / 4}}$`).test(hex))
      return setError(t("Enter up to {n} hex digits.").replace("{n}", String(w / 4)));
    setError(null);
    setDecText(String(toSigned(parseInt(hex, 16), w)));
  }

  function onWidth(w: Width) {
    setWidth(w);
    if (lastEdit === "dec") syncFromDec(decText, w);
    else syncFromHex(hexText, w);
  }

  const raw = parseInt(hexText.replace(/^0x/i, ""), 16);
  const ok = !error && !Number.isNaN(raw);
  const signed = ok ? toSigned(raw, width) : 0;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Width")}>
        {([8, 16, 32] as const).map((w) => (
          <button
            key={w}
            type="button"
            role="tab"
            aria-selected={width === w}
            onClick={() => onWidth(w)}
            className={`flex-1 rounded-[6px] px-3 py-1.5 font-mono text-sm transition-colors ${
              width === w ? "bg-elevated text-ink" : "text-mute hover:text-body"
            }`}
          >
            {w}-bit
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label htmlFor="tc-dec" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Signed decimal")}</label>
            <input id="tc-dec" value={decText} spellCheck={false}
              onChange={(e) => {
                setDecText(e.target.value);
                setLastEdit("dec");
                syncFromDec(e.target.value, width);
              }}
              className={`${fieldCls} ${error && lastEdit === "dec" ? "border-err" : "border-line-strong"}`} />
          </div>
          <div>
            <label htmlFor="tc-hex" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Hex (two's complement)")}</label>
            <input id="tc-hex" value={hexText} spellCheck={false}
              onChange={(e) => {
                setHexText(e.target.value);
                setLastEdit("hex");
                syncFromHex(e.target.value, width);
              }}
              className={`${fieldCls} ${error && lastEdit === "hex" ? "border-err" : "border-line-strong"}`} />
          </div>
          {error && <p className="font-mono text-xs text-err" role="alert">{error}</p>}
        </div>

        <div className="space-y-2.5">
          {ok && (
            <>
              <ResultCard label={t("Signed")} value={String(signed)} size="lg" />
              <ResultCard label={t("Unsigned")} value={String(raw)} />
              <ResultCard label={t("Hex")} value={"0x" + raw.toString(16).toUpperCase().padStart(width / 4, "0")} />
              <ResultCard label={t("Binary")} value={raw.toString(2).padStart(width, "0")} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
