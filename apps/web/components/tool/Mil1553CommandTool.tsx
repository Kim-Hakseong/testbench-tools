"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeCommandWord, encodeCommandWord } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function hex16(v: number): string {
  return "0x" + v.toString(16).toUpperCase().padStart(4, "0");
}

export function Mil1553CommandTool() {
  const [mode, setMode] = useState<"decode" | "build">("decode");
  // decode
  const [wordText, setWordText] = useState("183E");
  const [dWord, setDWord] = useState(wordText);
  // build
  const [rt, setRt] = useState(3);
  const [tr, setTr] = useState(false);
  const [sa, setSa] = useState(1);
  const [wcm, setWcm] = useState(30);

  useEffect(() => {
    const t = setTimeout(() => setDWord(wordText), 150);
    return () => clearTimeout(t);
  }, [wordText]);

  const decoded = useMemo(() => {
    const t = dWord.trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,4}$/.test(t)) return null;
    return decodeCommandWord(parseInt(t, 16));
  }, [dWord]);

  const isMode = sa === 0 || sa === 31;
  const built = encodeCommandWord({ rtAddress: rt, transmit: tr, subaddress: sa, wordCountOrMode: wcm });
  const builtDecoded = decodeCommandWord(built);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Mode">
        {([["decode", "Decode"], ["build", "Build"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${mode === k ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === "decode" ? (
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="cw-word" className="text-xs font-medium uppercase tracking-wide text-mute">Command word (16-bit hex)</label>
            <input id="cw-word" value={wordText} onChange={(e) => setWordText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${decoded === null ? "border-err" : "border-line-strong"} text-lg`} />
            {decoded === null && <p className="mt-1.5 font-mono text-xs text-err">Enter up to 4 hex digits.</p>}
            {decoded && (
              <p className="mt-3 font-mono text-xs text-mute">
                bits 15–11 RT · 10 T/R · 9–5 subaddress · 4–0 word count / mode code
              </p>
            )}
          </div>
          <div className="space-y-2.5">
            {decoded && (
              <>
                <ResultCard label={`RT address${decoded.broadcast ? " (broadcast)" : ""}`} value={String(decoded.rtAddress)} size="lg" />
                <ResultCard label="T/R" value={decoded.transmit ? "1 — Transmit (RT → BC)" : "0 — Receive (BC → RT)"} />
                <ResultCard label="Subaddress" value={`${decoded.subaddress}${decoded.isModeCommand ? " → mode command" : ""}`} />
                {decoded.isModeCommand ? (
                  <ResultCard label={`Mode code ${decoded.modeCode}`} value={decoded.mode ? decoded.mode.name : "reserved / undefined"} />
                ) : (
                  <ResultCard label="Word count" value={`${decoded.wordCount} data word${decoded.wordCount === 1 ? "" : "s"}`} />
                )}
                <ResultCard label="Odd parity bit" value={String(decoded.parity)} />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cw-rt" className="font-mono text-xs text-mute">RT address (0–31)</label>
              <input id="cw-rt" type="number" min={0} max={31} value={rt} onChange={(e) => setRt(Math.max(0, Math.min(31, Number(e.target.value))))} className={`${fieldCls} border-line-strong`} />
            </div>
            <div>
              <label htmlFor="cw-sa" className="font-mono text-xs text-mute">Subaddress (0–31)</label>
              <input id="cw-sa" type="number" min={0} max={31} value={sa} onChange={(e) => setSa(Math.max(0, Math.min(31, Number(e.target.value))))} className={`${fieldCls} border-line-strong`} />
            </div>
            <div className="col-span-2">
              <label className="font-mono text-xs text-mute">Direction (T/R)</label>
              <div className="mt-1.5 flex rounded-btn border border-line-strong p-0.5">
                {([[false, "Receive (BC→RT)"], [true, "Transmit (RT→BC)"]] as const).map(([v, l]) => (
                  <button key={String(v)} type="button" onClick={() => setTr(v)}
                    className={`flex-1 rounded-[6px] px-2 py-1.5 text-sm transition-colors ${tr === v ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label htmlFor="cw-wcm" className="font-mono text-xs text-mute">
                {isMode ? "Mode code (0–31)" : "Word count (1–32)"}
              </label>
              <input id="cw-wcm" type="number" min={isMode ? 0 : 1} max={isMode ? 31 : 32} value={wcm}
                onChange={(e) => setWcm(Number(e.target.value))} className={`${fieldCls} border-line-strong`} />
              {isMode && <p className="mt-1 font-mono text-[11px] text-mute">subaddress 0/31 → this field is a mode code</p>}
            </div>
          </div>
          <div className="space-y-2.5">
            <ResultCard label="Command word" value={hex16(built)} size="lg" />
            <ResultCard label="Binary" value={built.toString(2).padStart(16, "0")} />
            <ResultCard label="With odd parity (17-bit)" value={`${built.toString(2).padStart(16, "0")} ${builtDecoded.parity}`} />
            {builtDecoded.isModeCommand && builtDecoded.mode && (
              <ResultCard label={`Mode code ${builtDecoded.modeCode}`} value={builtDecoded.mode.name} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
