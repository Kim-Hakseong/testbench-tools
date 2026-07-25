"use client";

import { useEffect, useMemo, useState } from "react";
import { bcdToDecimal, decimalToBcd } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function BcdTool() {
  const [direction, setDirection] = useState<"toDec" | "toBcd">("toDec");
  const [bcdText, setBcdText] = useState("1234");
  const [decText, setDecText] = useState("5678");
  const [d, setD] = useState({ bcdText, decText });

  useEffect(() => {
    const t = setTimeout(() => setD({ bcdText, decText }), 150);
    return () => clearTimeout(t);
  }, [bcdText, decText]);

  const result = useMemo(() => {
    if (direction === "toDec") {
      const t = d.bcdText.trim().replace(/^0x/i, "");
      if (!/^[0-9a-fA-F]{1,8}$/.test(t)) return { error: "Enter a hex word, e.g. 1234." };
      const word = parseInt(t, 16) >>> 0;
      const r = bcdToDecimal(word, t.length);
      if (!r.ok) {
        return {
          error: `Invalid BCD: nibble ${r.error.nibbleIndex} (from the most significant) is 0x${r.error.nibbleValue.toString(16).toUpperCase()} — BCD nibbles must be 0–9.`,
          nibbleIndex: r.error.nibbleIndex,
          digits: t.toUpperCase(),
        };
      }
      return { dec: r.value, word, digits: t.toUpperCase() };
    }
    const t = d.decText.trim();
    if (!/^\d{1,8}$/.test(t)) return { error: "Enter a decimal integer (0–99999999)." };
    const value = parseInt(t, 10);
    const word = decimalToBcd(value);
    return { bcd: word, value, digits: t };
  }, [direction, d]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Direction">
        {(
          [
            ["toDec", "BCD → Decimal"],
            ["toBcd", "Decimal → BCD"],
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
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          {direction === "toDec" ? (
            <>
              <label htmlFor="bcd-in" className="text-xs font-medium uppercase tracking-wide text-mute">BCD word (hex)</label>
              <input id="bcd-in" value={bcdText} onChange={(e) => setBcdText(e.target.value)} spellCheck={false}
                placeholder="1234"
                className={`${fieldCls} ${"error" in result ? "border-err" : "border-line-strong"}`} />
            </>
          ) : (
            <>
              <label htmlFor="dec-in" className="text-xs font-medium uppercase tracking-wide text-mute">Decimal value</label>
              <input id="dec-in" value={decText} onChange={(e) => setDecText(e.target.value)} spellCheck={false}
                placeholder="5678"
                className={`${fieldCls} ${"error" in result ? "border-err" : "border-line-strong"}`} />
            </>
          )}
          {"error" in result && result.error && (
            <p className="mt-1.5 font-mono text-xs text-err" role="alert">
              {result.error}
            </p>
          )}
          {"nibbleIndex" in result && result.digits && (
            <p className="mt-1.5 font-mono text-sm">
              {result.digits.split("").map((ch, i) => (
                <span key={i} className={i === result.nibbleIndex ? "text-err underline decoration-err underline-offset-4" : "text-mute"}>
                  {ch}
                </span>
              ))}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {"dec" in result && result.dec !== undefined ? (
            <>
              <ResultCard label="Decimal" value={String(result.dec)} size="lg" />
              <ResultCard label="BCD word" value={"0x" + result.digits} />
            </>
          ) : "bcd" in result && result.bcd !== undefined ? (
            <>
              <ResultCard label="BCD word" value={"0x" + result.bcd.toString(16).toUpperCase()} size="lg" />
              <ResultCard label="Binary" value={result.bcd.toString(2).padStart(Math.max(4, result.digits.length * 4), "0")} />
            </>
          ) : (
            <p className="text-sm text-mute">Fix the input to see results.</p>
          )}
        </div>
      </div>
    </div>
  );
}
