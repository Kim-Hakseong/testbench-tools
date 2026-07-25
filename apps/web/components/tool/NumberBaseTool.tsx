"use client";

import { useState } from "react";
import { formatInBase, parseInBase, type NumberBase } from "@testbench/engine";
import { CopyButton } from "@/components/CopyButton";

const BASES: { base: NumberBase; label: string; prefix: string }[] = [
  { base: 2, label: "Binary", prefix: "0b" },
  { base: 8, label: "Octal", prefix: "0o" },
  { base: 10, label: "Decimal", prefix: "" },
  { base: 16, label: "Hexadecimal", prefix: "0x" },
];

/** Four synced fields — edit any base, the other three follow. */
export function NumberBaseTool() {
  const [texts, setTexts] = useState<Record<NumberBase, string>>({
    2: "11111111",
    8: "377",
    10: "255",
    16: "FF",
  });
  const [errorBase, setErrorBase] = useState<NumberBase | null>(null);
  const [errorIndex, setErrorIndex] = useState(0);

  function onEdit(base: NumberBase, text: string) {
    const next = { ...texts, [base]: text };
    if (text.trim() === "") {
      setTexts(next);
      setErrorBase(null);
      return;
    }
    const r = parseInBase(text, base);
    if (!r.ok) {
      setTexts(next);
      setErrorBase(base);
      setErrorIndex(r.errorIndex);
      return;
    }
    for (const b of BASES) {
      if (b.base !== base) next[b.base] = formatInBase(r.value, b.base).toUpperCase();
    }
    setTexts(next);
    setErrorBase(null);
  }

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BASES.map(({ base, label, prefix }) => (
          <div key={base}>
            <div className="flex items-center justify-between">
              <label htmlFor={`base-${base}`} className="text-xs font-medium uppercase tracking-wide text-mute">
                {label} {prefix && <span className="font-mono normal-case">({prefix})</span>}
              </label>
              <CopyButton text={texts[base]} />
            </div>
            <input
              id={`base-${base}`}
              value={texts[base]}
              onChange={(e) => onEdit(base, e.target.value)}
              spellCheck={false}
              className={`mt-2 w-full rounded-btn border bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors ${
                errorBase === base ? "border-err" : "border-line-strong focus:border-mute"
              }`}
            />
            {errorBase === base && (
              <p className="mt-1.5 font-mono text-xs text-err" role="alert">
                Invalid digit for base {base} at position {errorIndex}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
