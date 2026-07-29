"use client";

import { useEffect, useMemo, useState } from "react";
import {
  float32ToRegisters,
  registersToFloat32,
  WORD_ORDERS,
  type WordOrder,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

function hexWord(w: number): string {
  return w.toString(16).toUpperCase().padStart(4, "0");
}

function parseWordPair(s: string): [number, number] | null {
  const tokens = s.trim().split(/[\s,;]+/).filter(Boolean);
  if (tokens.length !== 2) return null;
  const words = tokens.map((t) => {
    const clean = t.replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,4}$/.test(clean)) return NaN;
    return parseInt(clean, 16);
  });
  if (words.some(Number.isNaN)) return null;
  return [words[0]!, words[1]!];
}

const ORDER_NOTES: Record<WordOrder, string> = {
  ABCD: "big-endian (high word first)",
  CDAB: "word-swapped",
  BADC: "byte-swapped within words",
  DCBA: "little-endian",
};

export function FloatConverterTool() {
  const t = useToolText();
  const [direction, setDirection] = useState<"toRegs" | "toFloat">("toRegs");
  const [floatText, setFloatText] = useState("3.1415927");
  const [regsText, setRegsText] = useState("4049 0FDB");
  const [debouncedFloat, setDebouncedFloat] = useState(floatText);
  const [debouncedRegs, setDebouncedRegs] = useState(regsText);

  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedFloat(floatText);
      setDebouncedRegs(regsText);
    }, 150);
    return () => clearTimeout(h);
  }, [floatText, regsText]);

  const floatValue = useMemo(() => {
    const v = Number(debouncedFloat.trim());
    return debouncedFloat.trim() === "" || Number.isNaN(v) ? null : v;
  }, [debouncedFloat]);

  const regs = useMemo(() => parseWordPair(debouncedRegs), [debouncedRegs]);

  const stored = floatValue !== null ? registersToFloat32(float32ToRegisters(floatValue, "ABCD"), "ABCD") : null;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Direction")}>
        {(
          [
            ["toRegs", "Float → Registers"],
            ["toFloat", "Registers → Float"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={direction === key}
            onClick={() => setDirection(key)}
            className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${
              direction === key ? "bg-elevated text-ink" : "text-mute hover:text-body"
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {direction === "toRegs" ? (
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="float-in" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Float value")}
            </label>
            <input
              id="float-in"
              value={floatText}
              onChange={(e) => setFloatText(e.target.value)}
              spellCheck={false}
              className={`mt-2 w-full rounded-btn border bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors ${
                floatValue === null ? "border-err" : "border-line-strong focus:border-mute"
              }`}
            />
            {floatValue === null ? (
              <p className="mt-1.5 font-mono text-xs text-err" role="alert">{t("Enter a decimal number.")}</p>
            ) : (
              stored !== null && (
                <p className="mt-1.5 font-mono text-xs text-mute">
                  {t("stored float32")}: {stored} {stored !== floatValue ? t("(nearest representable)") : ""}
                </p>
              )
            )}
          </div>
          <div className="space-y-2.5">
            {floatValue !== null &&
              WORD_ORDERS.map((order) => {
                const [r0, r1] = float32ToRegisters(floatValue, order);
                return (
                  <ResultCard
                    key={order}
                    label={`${order} — ${t(ORDER_NOTES[order])}`}
                    value={`0x${hexWord(r0)} 0x${hexWord(r1)}`}
                  />
                );
              })}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="regs-in" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Two 16-bit registers (hex)")}
            </label>
            <input
              id="regs-in"
              value={regsText}
              onChange={(e) => setRegsText(e.target.value)}
              spellCheck={false}
              placeholder="4049 0FDB"
              className={`mt-2 w-full rounded-btn border bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors ${
                regs === null ? "border-err" : "border-line-strong focus:border-mute"
              }`}
            />
            {regs === null && (
              <p className="mt-1.5 font-mono text-xs text-err" role="alert">
                {t("Enter two hex words, e.g. “4049 0FDB”.")}
              </p>
            )}
          </div>
          <div className="space-y-2.5">
            {regs &&
              WORD_ORDERS.map((order) => (
                <ResultCard
                  key={order}
                  label={`${order} — ${t(ORDER_NOTES[order])}`}
                  value={String(registersToFloat32(regs, order))}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
