"use client";

import type { HexParseError } from "@testbench/engine";
import { useToolText } from "@/components/tool/useToolText";

export type InputMode = "hex" | "ascii";

/**
 * Shared data-input control: textarea (mono) + hex/ASCII mode switch +
 * invalid-character position indicator (PRD §4).
 */
export function HexInput({
  value,
  onChange,
  mode,
  onModeChange,
  error,
  label = "Input",
}: {
  value: string;
  onChange: (v: string) => void;
  mode: InputMode;
  onModeChange: (m: InputMode) => void;
  error?: HexParseError;
  label?: string;
}) {
  const t = useToolText();
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="tool-input" className="text-xs font-medium uppercase tracking-wide text-mute">
          {t(label)}
        </label>
        <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Input mode")}>
          {(["hex", "ascii"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => onModeChange(m)}
              className={`rounded-[6px] px-2.5 py-1 font-mono text-xs transition-colors ${
                mode === m ? "bg-elevated text-ink" : "text-mute hover:text-body"
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <textarea
        id="tool-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        spellCheck={false}
        placeholder={mode === "hex" ? "01 03 00 00 00 0A" : "123456789"}
        className={`mt-2 w-full resize-y rounded-btn border bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors placeholder:text-mute ${
          error ? "border-err" : "border-line-strong focus:border-mute"
        }`}
      />
      {error && (
        <p className="mt-1.5 font-mono text-xs text-err" role="alert">
          {t("Invalid character “{char}” at position {index}")
            .replace("{char}", error.char)
            .replace("{index}", String(error.index))}
          <span className="ml-2 text-mute">
            {value.slice(Math.max(0, error.index - 8), error.index)}
            <span className="text-err underline decoration-err underline-offset-2">
              {error.char}
            </span>
            {value.slice(error.index + 1, error.index + 9)}
          </span>
        </p>
      )}
    </div>
  );
}
