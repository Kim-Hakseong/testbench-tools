"use client";

import { useEffect, useMemo, useState } from "react";
import { buildNmea, checksumHex, parseNmea } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

export function NmeaChecksumTool() {
  const [input, setInput] = useState("$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47");
  const [debounced, setDebounced] = useState(input);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 150);
    return () => clearTimeout(t);
  }, [input]);

  const result = useMemo(() => {
    const s = debounced.trim();
    if (s === "") return { error: "Enter a sentence." };
    const parsed = parseNmea(s.startsWith("$") || s.startsWith("!") ? s : "$" + s);
    if (!parsed.ok) return { error: parsed.error };
    return { sentence: parsed.sentence };
  }, [debounced]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="nmea-in" className="text-xs font-medium uppercase tracking-wide text-mute">
            NMEA sentence (with or without *checksum)
          </label>
          <textarea id="nmea-in" value={input} rows={4} spellCheck={false}
            onChange={(e) => setInput(e.target.value)}
            className={`mt-2 w-full resize-y rounded-btn border bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors ${
              "error" in result ? "border-err" : "border-line-strong focus:border-mute"
            }`} />
          {"error" in result && result.error && (
            <p className="mt-1.5 font-mono text-xs text-err" role="alert">{result.error}</p>
          )}
        </div>

        <div className="space-y-2.5">
          {"sentence" in result && result.sentence && (
            <>
              {result.sentence.valid !== null && (
                <p className={`rounded-btn border px-3 py-2 font-mono text-sm ${
                  result.sentence.valid ? "border-ok/40 text-ok" : "border-err/40 text-err"
                }`}>
                  {result.sentence.valid
                    ? "Checksum VALID"
                    : `Checksum FAIL — received ${checksumHex(result.sentence.received!)}, expected ${checksumHex(result.sentence.computed)}`}
                </p>
              )}
              <ResultCard label="Computed checksum" value={"0x" + checksumHex(result.sentence.computed)} size="lg" />
              <ResultCard
                label="Complete sentence"
                value={buildNmea(
                  result.sentence.address + (result.sentence.fields.length ? "," + result.sentence.fields.join(",") : ""),
                )}
              />
              <ResultCard label="Type" value={`${result.sentence.talker} / ${result.sentence.type}`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
