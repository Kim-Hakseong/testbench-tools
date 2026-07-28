"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeStatusWord } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const FLAGS: { key: keyof ReturnType<typeof decodeStatusWord>; label: string; bit: number }[] = [
  { key: "messageError", label: "Message Error", bit: 10 },
  { key: "instrumentation", label: "Instrumentation (reserved 0)", bit: 9 },
  { key: "serviceRequest", label: "Service Request", bit: 8 },
  { key: "broadcastReceived", label: "Broadcast Command Received", bit: 4 },
  { key: "busy", label: "Busy", bit: 3 },
  { key: "subsystemFlag", label: "Subsystem Flag", bit: 2 },
  { key: "dynamicBusControlAccept", label: "Dynamic Bus Control Acceptance", bit: 1 },
  { key: "terminalFlag", label: "Terminal Flag", bit: 0 },
];

export function Mil1553StatusTool() {
  const [wordText, setWordText] = useState("1800");
  const [d, setD] = useState(wordText);

  useEffect(() => {
    const t = setTimeout(() => setD(wordText), 150);
    return () => clearTimeout(t);
  }, [wordText]);

  const status = useMemo(() => {
    const t = d.trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,4}$/.test(t)) return null;
    return decodeStatusWord(parseInt(t, 16));
  }, [d]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="sw-word" className="text-xs font-medium uppercase tracking-wide text-mute">Status word (16-bit hex)</label>
          <input id="sw-word" value={wordText} onChange={(e) => setWordText(e.target.value)} spellCheck={false}
            className={`mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-lg text-ink outline-none transition-colors focus:border-mute ${status === null ? "border-err" : "border-line-strong"}`} />
          {status === null && <p className="mt-1.5 font-mono text-xs text-err">Enter up to 4 hex digits.</p>}
          {status && (
            <>
              <div className="mt-3">
                <ResultCard label="RT address" value={String(status.rtAddress)} size="lg" />
              </div>
              <p className="mt-3 font-mono text-xs text-mute">
                bits 15–11 RT address · 10–0 status flags · odd parity {status.parity}
              </p>
            </>
          )}
        </div>
        <div>
          {status && (
            <div className="overflow-hidden rounded-btn border border-line-soft">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                    <th className="px-3 py-2 font-medium">Bit</th>
                    <th className="px-3 py-2 font-medium">Flag</th>
                    <th className="px-3 py-2 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {FLAGS.map((f) => {
                    const on = status[f.key] as boolean;
                    return (
                      <tr key={f.key} className="border-b border-line-soft last:border-0">
                        <td className="px-3 py-2 font-mono text-[13px] text-mute">{f.bit}</td>
                        <td className="px-3 py-2 text-body">{f.label}</td>
                        <td className={`px-3 py-2 font-mono text-[13px] ${on ? "text-ok" : "text-mute"}`}>{on ? "1 · set" : "0"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
