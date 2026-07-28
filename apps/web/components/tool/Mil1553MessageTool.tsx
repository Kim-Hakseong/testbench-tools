"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeMessage } from "@testbench/engine";

function parseWords(text: string): { words: number[]; error: string | null } {
  const tokens = text.trim().split(/[\s,]+/).filter(Boolean);
  const words: number[] = [];
  for (const tok of tokens) {
    const t = tok.replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,4}$/.test(t)) return { words: [], error: `Invalid word “${tok}”.` };
    words.push(parseInt(t, 16));
  }
  return { words, error: null };
}

const ROLE_COLOR: Record<string, string> = {
  command: "var(--tb-accent-cyan)",
  data: "var(--tb-accent-slate)",
  status: "var(--tb-accent-green)",
};

export function Mil1553MessageTool() {
  const [text, setText] = useState("2822 1234 5678 2800");
  const [d, setD] = useState(text);

  useEffect(() => {
    const t = setTimeout(() => setD(text), 150);
    return () => clearTimeout(t);
  }, [text]);

  const { words, error } = useMemo(() => parseWords(d), [d]);
  const msg = useMemo(() => (words.length > 0 && !error ? decodeMessage(words) : null), [words, error]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <label htmlFor="msg-in" className="text-xs font-medium uppercase tracking-wide text-mute">
        Message words (16-bit hex, space-separated — word 1 is the command)
      </label>
      <textarea id="msg-in" value={text} rows={2} spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        className={`mt-1.5 w-full resize-y rounded-btn border bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors ${error ? "border-err" : "border-line-strong focus:border-mute"}`} />
      {error && <p className="mt-1.5 font-mono text-xs text-err" role="alert">{error}</p>}

      {msg && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line-strong px-2.5 py-0.5 font-mono text-xs text-ink">{msg.type}</span>
            <span className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${msg.ok ? "border-ok/40 text-ok" : "border-warn/40 text-warn"}`}>
              {msg.ok ? `${msg.words.length} words — layout matches` : msg.note}
            </span>
          </div>

          <div className="overflow-x-auto rounded-btn border border-line-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Word</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Decoded</th>
                </tr>
              </thead>
              <tbody>
                {msg.words.map((w, i) => (
                  <tr key={i} className="border-b border-line-soft last:border-0">
                    <td className="px-3 py-2 font-mono text-[13px] text-mute">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-[13px] text-ink">0x{w.raw.toString(16).toUpperCase().padStart(4, "0")}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 text-body">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ROLE_COLOR[w.role] }} />
                        {w.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[13px] text-mute">
                      {w.command && `RT ${w.command.rtAddress} · ${w.command.transmit ? "Tx" : "Rx"} · SA ${w.command.subaddress}${w.command.isModeCommand ? ` · mode ${w.command.modeCode}` : ` · WC ${w.command.wordCount}`}`}
                      {w.status && `RT ${w.status.rtAddress}${w.status.messageError ? " · ME" : ""}${w.status.busy ? " · Busy" : ""}${w.status.serviceRequest ? " · SRQ" : ""}${w.status.terminalFlag ? " · TF" : ""}`}
                      {w.role === "data" && `${w.raw} · int16 ${(w.raw << 16) >> 16}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
