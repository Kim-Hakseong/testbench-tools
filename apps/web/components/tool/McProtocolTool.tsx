"use client";

import { useEffect, useMemo, useState } from "react";
import { parseMcFrame, type McMode } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

/** The E71 manual's own sample-program frame: batch read D0…D4. */
const SAMPLE_ASCII = "500000FF03FF000018000A04010000D*0000000005";
const SAMPLE_BINARY = "50 00 00 FF FF 03 00 18 00 0A 00 01 04 00 00 00 00 00 A8 05 00";

function hex(n: number, digits: number): string {
  return n.toString(16).toUpperCase().padStart(digits, "0") + "H";
}

export function McProtocolTool() {
  const t = useToolText();
  const [mode, setMode] = useState<McMode>("ascii");
  const [text, setText] = useState(SAMPLE_ASCII);
  const [debounced, setDebounced] = useState(text);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(text), 150);
    return () => clearTimeout(h);
  }, [text]);

  function switchMode(next: McMode) {
    setMode(next);
    setText(next === "ascii" ? SAMPLE_ASCII : SAMPLE_BINARY);
  }

  const parsed = useMemo(() => parseMcFrame(debounced, mode), [debounced, mode]);
  const frame = parsed.ok ? parsed.frame : null;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-mute">{t("Mode")}</span>
            <div className="mt-1.5 flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Mode")}>
              {(
                [
                  ["ascii", "ASCII code"],
                  ["binary", "Binary code"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => switchMode(id)}
                  className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${
                    mode === id ? "bg-elevated text-ink" : "text-mute hover:text-body"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="mc-frame" className="text-xs font-medium uppercase tracking-wide text-mute">
              3E frame — {mode === "ascii" ? "the characters as sent" : "hex bytes"}
            </label>
            <textarea
              id="mc-frame"
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

          {frame && !frame.dataLengthOk && (
            <p className="rounded-btn border border-err px-3 py-2 font-mono text-xs text-err" role="status">
              Length field says {frame.dataLength} but the frame carries {frame.actualDataLength}
            </p>
          )}
          {frame?.note && (
            <p className="rounded-btn border border-line-soft bg-elevated px-3 py-2 text-xs text-mute">{frame.note}</p>
          )}
        </div>

        <div className="space-y-2.5">
          {frame && (
            <>
              <ResultCard
                label={t("Frame")}
                value={frame.kind === "request" ? "Request (5000H)" : "Response (D000H)"}
                size="lg"
              />
              <ResultCard
                label="Access route"
                value={`network ${hex(frame.networkNo, 2)} · PC ${hex(frame.pcNo, 2)} · I/O ${hex(frame.ioNo, 4)} · station ${hex(frame.stationNo, 2)}`}
              />
              {frame.kind === "request" ? (
                <>
                  <ResultCard
                    label={t("Command")}
                    value={`${hex(frame.command, 4)} ${frame.commandName} · ${hex(frame.subcommand, 4)} ${frame.subcommandName}`}
                  />
                  <ResultCard
                    label={t("Device")}
                    value={
                      frame.device
                        ? `${frame.device.text} · ${frame.points ?? "?"} ${frame.unit === "bit" ? "bit" : "word"} point(s)`
                        : "— not decoded"
                    }
                  />
                  <ResultCard label="Monitoring timer" value={frame.monitoringTimerLabel} />
                  <ResultCard
                    label="Write data"
                    value={
                      frame.writeData && frame.writeData.length > 0
                        ? frame.writeData.map((v) => (frame.unit === "bit" ? v : hex(v, 4))).join(" ")
                        : "— read command"
                    }
                  />
                </>
              ) : (
                <>
                  <ResultCard
                    label="End code"
                    value={`${hex(frame.endCode, 4)} — ${frame.success ? "normal completion" : "error (see the module manual)"}`}
                  />
                  <ResultCard
                    label="Error information"
                    value={
                      frame.errorInformation
                        ? `command ${hex(frame.errorInformation.command, 4)} · subcommand ${hex(frame.errorInformation.subcommand, 4)}`
                        : "— none"
                    }
                  />
                  <ResultCard label="Response data" value={frame.dataText || "— empty"} />
                </>
              )}
              <ResultCard
                label="Data length"
                value={`${frame.dataLength} declared · ${frame.actualDataLength} actual`}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
