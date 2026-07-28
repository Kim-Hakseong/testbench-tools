"use client";

import { useMemo, useState } from "react";
import { buildXgtFrame, type XgtBuildInput, type XgtRequestCommand } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border border-line-strong bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

const COMMANDS: { id: XgtRequestCommand; label: string }[] = [
  { id: "RSS", label: "RSS — read individually" },
  { id: "RSB", label: "RSB — read continuously" },
  { id: "WSS", label: "WSS — write individually" },
  { id: "WSB", label: "WSB — write continuously" },
];

export function XgtCnetBuilderTool() {
  const t = useToolText();
  const [command, setCommand] = useState<XgtRequestCommand>("RSS");
  const [station, setStation] = useState("20");
  const [useBcc, setUseBcc] = useState(true);
  const [names, setNames] = useState("%MW100");
  const [count, setCount] = useState("2");
  const [data, setData] = useState("00FF");

  const built = useMemo(() => {
    const st = Number.parseInt(station, 16);
    if (!Number.isInteger(st)) return { ok: false as const, error: "Station must be hex, e.g. 20 or 0A" };

    const list = names
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (list.length === 0) return { ok: false as const, error: "Enter at least one device name" };

    const n = Number(count);
    const common = { station: st, useBcc };

    let input: XgtBuildInput;
    if (command === "RSS") input = { ...common, command, variables: list };
    else if (command === "RSB") input = { ...common, command, name: list[0]!, count: n };
    else if (command === "WSS")
      input = {
        ...common,
        command,
        blocks: list.map((name) => ({ name, data: data.trim().toUpperCase() })),
      };
    else input = { ...common, command, name: list[0]!, count: n, data: data.trim().toUpperCase() };

    return buildXgtFrame(input);
  }, [command, station, useBcc, names, count, data]);

  const frame = built.ok ? built.frame : null;
  const multi = command === "RSS" || command === "WSS";
  const needsCount = command === "RSB" || command === "WSB";
  const needsData = command === "WSS" || command === "WSB";

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label htmlFor="xgtb-cmd" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Command")}
            </label>
            <select
              id="xgtb-cmd"
              value={command}
              onChange={(e) => setCommand(e.target.value as XgtRequestCommand)}
              className={fieldCls}
            >
              {COMMANDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="xgtb-station" className="text-xs font-medium uppercase tracking-wide text-mute">
                Station (hex)
              </label>
              <input id="xgtb-station" value={station} onChange={(e) => setStation(e.target.value)} className={fieldCls} />
            </div>
            <div className="flex items-end">
              <label className="flex w-full cursor-pointer items-center gap-2 rounded-btn border border-line-strong px-3 py-2 text-sm">
                <input type="checkbox" checked={useBcc} onChange={(e) => setUseBcc(e.target.checked)} />
                <span className="text-body">Append BCC</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="xgtb-names" className="text-xs font-medium uppercase tracking-wide text-mute">
              {multi ? "Device names (one per line)" : "Device name"}
            </label>
            <textarea
              id="xgtb-names"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              rows={multi ? 3 : 1}
              spellCheck={false}
              className={`${fieldCls} resize-y`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {needsCount && (
              <div>
                <label htmlFor="xgtb-count" className="text-xs font-medium uppercase tracking-wide text-mute">
                  Number of data
                </label>
                <input id="xgtb-count" value={count} onChange={(e) => setCount(e.target.value)} className={fieldCls} />
              </div>
            )}
            {needsData && (
              <div>
                <label htmlFor="xgtb-data" className="text-xs font-medium uppercase tracking-wide text-mute">
                  Data (ASCII hex)
                </label>
                <input id="xgtb-data" value={data} onChange={(e) => setData(e.target.value)} className={fieldCls} />
              </div>
            )}
          </div>

          {!built.ok && (
            <p className="font-mono text-xs text-err" role="alert">
              {built.error}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {frame && (
            <>
              <ResultCard label={t("Frame")} value={frame.display} size="lg" />
              <ResultCard label="Body (station → data)" value={frame.body} />
              <ResultCard label="Data area" value={frame.dataArea || "— empty"} />
              <ResultCard
                label="BCC"
                value={frame.bcc ? `${frame.bcc} (lowercase command)` : "none (uppercase command)"}
              />
              <ResultCard
                label="Hex bytes"
                value={frame.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")}
              />
            </>
          )}
          {frame && frame.notes.length > 0 && (
            <ul className="space-y-1 rounded-btn border border-line-soft bg-elevated p-3 text-xs text-mute">
              {frame.notes.map((n) => (
                <li key={n}>— {n}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
