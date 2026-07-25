"use client";

import { useEffect, useMemo, useState } from "react";
import { asciiToBytes, bytesToAscii, bytesToHex, parseHex } from "@testbench/engine";
import { CopyButton } from "@/components/CopyButton";

export function HexAsciiTool({ direction }: { direction: "hexToAscii" | "asciiToHex" }) {
  const [input, setInput] = useState(direction === "hexToAscii" ? "48 69" : "Hi");
  const [debounced, setDebounced] = useState(input);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 150);
    return () => clearTimeout(t);
  }, [input]);

  const { output, error, byteCount } = useMemo(() => {
    if (direction === "hexToAscii") {
      const r = parseHex(debounced);
      if (!r.ok) return { output: "", error: r.error, byteCount: 0 };
      return { output: bytesToAscii(r.bytes), byteCount: r.bytes.length };
    }
    const bytes = asciiToBytes(debounced);
    return { output: bytesToHex(bytes), byteCount: bytes.length };
  }, [debounced, direction]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="ha-in" className="text-xs font-medium uppercase tracking-wide text-mute">
            {direction === "hexToAscii" ? "Hex bytes" : "ASCII text"}
          </label>
          <textarea
            id="ha-in"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder={direction === "hexToAscii" ? "48 69" : "Hi"}
            className={`mt-2 w-full resize-y rounded-btn border bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors ${
              error ? "border-err" : "border-line-strong focus:border-mute"
            }`}
          />
          {error && (
            <p className="mt-1.5 font-mono text-xs text-err" role="alert">
              Invalid character “{error.char}” at position {error.index}
            </p>
          )}
          <p className="mt-1.5 font-mono text-xs text-mute">{byteCount} bytes</p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-mute">
              {direction === "hexToAscii" ? "ASCII text" : "Hex bytes"}
            </span>
            <CopyButton text={output} />
          </div>
          <pre className="mt-2 min-h-[8.5rem] w-full overflow-x-auto whitespace-pre-wrap break-all rounded-btn border border-line-soft bg-well px-3 py-2.5 font-mono text-sm text-ink">
            {output || <span className="text-mute">—</span>}
          </pre>
          {direction === "hexToAscii" && (
            <p className="mt-1.5 text-xs text-mute">Non-printable bytes are shown as “.”</p>
          )}
        </div>
      </div>
    </div>
  );
}
