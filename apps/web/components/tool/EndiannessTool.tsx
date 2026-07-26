"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bytesToHex,
  parseHex,
  reverseBytes,
  swapBytesInWords,
  swapWords,
} from "@testbench/engine";
import { HexInput } from "@/components/tool/HexInput";
import { ResultCard } from "@/components/tool/ResultCard";

export function EndiannessTool() {
  const [input, setInput] = useState("12 34 56 78");
  const [debounced, setDebounced] = useState(input);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 150);
    return () => clearTimeout(t);
  }, [input]);

  const parsed = useMemo(() => parseHex(debounced), [debounced]);
  const bytes = parsed.ok && parsed.bytes.length > 0 ? parsed.bytes : null;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <HexInput
            value={input}
            onChange={setInput}
            mode="hex"
            onModeChange={() => {}}
            error={parsed.ok ? undefined : parsed.error}
            label="Value (hex bytes)"
          />
          {bytes && (
            <p className="mt-2 font-mono text-xs text-mute">
              {bytes.length} bytes ({bytes.length * 8}-bit)
            </p>
          )}
        </div>
        <div className="space-y-2.5">
          {bytes && (
            <>
              <ResultCard label="Byte-reversed (full endianness flip)" value={bytesToHex(reverseBytes(bytes))} size="lg" />
              {bytes.length >= 2 && bytes.length % 2 === 0 && (
                <ResultCard label="Byte swap within 16-bit words (AB CD → BA DC)" value={bytesToHex(swapBytesInWords(bytes))} />
              )}
              {bytes.length >= 4 && bytes.length % 4 === 0 && (
                <ResultCard label="16-bit word swap within 32-bit (AB CD EF GH → EF GH AB CD)" value={bytesToHex(swapWords(bytes))} />
              )}
              <ResultCard label="Original" value={bytesToHex(bytes)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
