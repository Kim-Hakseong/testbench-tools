"use client";

import { useEffect, useMemo, useState } from "react";
import {
  asciiToBytes,
  bytesToHex,
  crc,
  crcBytes,
  getPreset,
  parseHex,
  type HexParseError,
} from "@testbench/engine";
import { HexInput, type InputMode } from "@/components/tool/HexInput";
import { ResultCard } from "@/components/tool/ResultCard";

/**
 * Preset-based CRC calculator panel. With multiple `presetNames` a variant
 * selector is shown (e.g. the CCITT family page). Results update live with a
 * 150 ms debounce (PRD §4).
 */
export function CrcTool({
  presetNames,
  initialInput = "123456789",
  initialMode = "ascii",
}: {
  presetNames: string[];
  initialInput?: string;
  initialMode?: InputMode;
}) {
  const [input, setInput] = useState(initialInput);
  const [mode, setMode] = useState<InputMode>(initialMode);
  const [presetName, setPresetName] = useState(presetNames[0]!);
  const [debounced, setDebounced] = useState(input);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 150);
    return () => clearTimeout(t);
  }, [input]);

  const { bytes, error } = useMemo((): {
    bytes: Uint8Array | null;
    error?: HexParseError;
  } => {
    if (mode === "ascii") return { bytes: asciiToBytes(debounced) };
    const r = parseHex(debounced);
    return r.ok ? { bytes: r.bytes } : { bytes: null, error: r.error };
  }, [debounced, mode]);

  const preset = getPreset(presetName);
  const value = bytes ? crc(bytes, preset) : null;
  const hexDigits = Math.ceil(preset.width / 4);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <HexInput
            value={input}
            onChange={setInput}
            mode={mode}
            onModeChange={setMode}
            error={error}
          />
          {presetNames.length > 1 && (
            <div className="mt-4">
              <label htmlFor="crc-variant" className="text-xs font-medium uppercase tracking-wide text-mute">
                Variant
              </label>
              <select
                id="crc-variant"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="mt-2 w-full rounded-btn border border-line-strong bg-well px-3 py-2 font-mono text-sm text-ink outline-none focus:border-mute"
              >
                {presetNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          {bytes && (
            <p className="mt-3 font-mono text-xs text-mute">{bytes.length} bytes</p>
          )}
        </div>
        <div className="space-y-2.5">
          {value !== null && bytes ? (
            <>
              <ResultCard
                label={preset.name}
                value={"0x" + value.toString(16).toUpperCase().padStart(hexDigits, "0")}
                size="lg"
              />
              <ResultCard label="Bytes (little-endian)" value={bytesToHex(crcBytes(value, preset.width).le)} />
              <ResultCard label="Bytes (big-endian)" value={bytesToHex(crcBytes(value, preset.width).be)} />
              <ResultCard label="Decimal" value={String(value)} />
            </>
          ) : (
            <p className="text-sm text-mute">Fix the input to see results.</p>
          )}
        </div>
      </div>
    </div>
  );
}
