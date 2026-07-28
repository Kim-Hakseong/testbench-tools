"use client";

import { useEffect, useMemo, useState } from "react";
import { parseXgtFrame, xgtDataTypeName } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

/** The manual's own worked frame — the one LS prints the BCC arithmetic for. */
const SAMPLE = "05 32 30 72 53 53 30 31 30 36 25 4D 57 31 30 30 04 41 34";

const BCC_NOTE: Record<string, string> = {
  valid: "BCC matches",
  mismatch: "BCC does not match",
  missing: "Lowercase command, but no BCC was sent",
  "not-required": "Uppercase command — no BCC expected",
  unexpected: "Uppercase command, but a BCC was appended",
};

export function XgtCnetDecoderTool() {
  const t = useToolText();
  const [text, setText] = useState(SAMPLE);
  const [debounced, setDebounced] = useState(text);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(text), 150);
    return () => clearTimeout(h);
  }, [text]);

  const parsed = useMemo(() => parseXgtFrame(debounced), [debounced]);
  const frame = parsed.ok ? parsed.frame : null;

  const bccGood = frame ? frame.bccValid : false;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label htmlFor="xgt-frame" className="text-xs font-medium uppercase tracking-wide text-mute">
              XGT Cnet frame — hex bytes, raw text, or with &lt;ENQ&gt; markers
            </label>
            <textarea
              id="xgt-frame"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              rows={4}
              className={`${fieldCls} resize-y ${parsed.ok ? "border-line-strong" : "border-err"}`}
            />
            {!parsed.ok && (
              <p className="mt-1.5 font-mono text-xs text-err" role="alert">
                {parsed.error}
              </p>
            )}
          </div>

          {frame && (
            <p
              className={`rounded-btn border px-3 py-2 font-mono text-xs ${
                bccGood ? "border-line-soft text-ok" : "border-err text-err"
              }`}
              role="status"
            >
              {BCC_NOTE[frame.bccStatus] ?? frame.bccStatus}
              {frame.bccRequired && ` · expected ${frame.expectedBcc}`}
              {frame.bccPresent && frame.bcc && ` · found ${frame.bcc}`}
            </p>
          )}

          {frame && frame.notes.length > 0 && (
            <ul className="space-y-1 rounded-btn border border-line-soft bg-elevated p-3 text-xs text-mute">
              {frame.notes.map((n) => (
                <li key={n}>— {n}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2.5">
          {frame && (
            <>
              <ResultCard
                label={t("Frame")}
                value={`${frame.kind} · ${frame.direction}${frame.isError ? " · error" : ""}`}
                size="lg"
              />
              <ResultCard label="Station" value={`${frame.station} (${frame.stationText})`} />
              <ResultCard
                label={t("Command")}
                value={`${frame.command.raw} ${frame.commandType} — ${frame.command.name}, ${frame.mode}`}
              />
              <ResultCard
                label="BCC"
                value={
                  frame.bccRequired
                    ? `${frame.bcc ?? "—"} · expected ${frame.expectedBcc}`
                    : `not required (uppercase ${frame.command.letter})`
                }
              />
              {frame.errorCode && (
                <ResultCard
                  label={t("Error")}
                  value={`${frame.errorCode} — ${frame.errorText ?? "not in the published table"}`}
                />
              )}
              <ResultCard label="Data area" value={frame.dataArea || "— empty"} />
            </>
          )}
        </div>
      </div>

      {frame && frame.blocks.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-btn border border-line-soft bg-elevated p-3">
          <div className="text-[11px] uppercase tracking-wide text-mute">Blocks</div>
          <table className="mt-2 w-full min-w-[30rem] text-left font-mono text-xs">
            <thead className="text-mute">
              <tr>
                <th className="py-1 pr-4">#</th>
                <th className="py-1 pr-4">{t("Device")}</th>
                <th className="py-1 pr-4">Type</th>
                <th className="py-1 pr-4">Count</th>
                <th className="py-1">Data</th>
              </tr>
            </thead>
            <tbody className="text-body">
              {frame.blocks.map((b, i) => (
                <tr key={`${b.name ?? "block"}-${i}`} className="border-t border-line-soft">
                  <td className="py-1 pr-4">{i + 1}</td>
                  <td className="py-1 pr-4 text-ink">{b.name ?? "—"}</td>
                  <td className="py-1 pr-4">{b.dataType ? xgtDataTypeName(b.dataType) : "—"}</td>
                  <td className="py-1 pr-4">{b.count ?? "—"}</td>
                  <td className="py-1">{b.data ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {frame && (
        <p className="mt-3 break-all rounded-btn border border-line-soft bg-elevated p-3 font-mono text-xs text-mute">
          {frame.display}
        </p>
      )}
    </div>
  );
}
