"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzeCanFrame, bytesToHex, parseHex } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function CanFrameTool() {
  const [idText, setIdText] = useState("123");
  const [extended, setExtended] = useState(false);
  const [rtr, setRtr] = useState(false);
  const [dataText, setDataText] = useState("DE AD BE EF");
  const [d, setD] = useState({ idText, dataText });

  useEffect(() => {
    const t = setTimeout(() => setD({ idText, dataText }), 150);
    return () => clearTimeout(t);
  }, [idText, dataText]);

  const analysis = useMemo(() => {
    const idClean = d.idText.trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,8}$/.test(idClean)) return { error: "Identifier must be hex." };
    const parsed = parseHex(rtr ? "" : d.dataText);
    if (!parsed.ok) return { error: `Data: invalid character at position ${parsed.error.index}.` };
    return { a: analyzeCanFrame(parseInt(idClean, 16), extended, rtr, parsed.bytes) };
  }, [d, extended, rtr]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cf-id" className="font-mono text-xs text-mute">Identifier (hex)</label>
              <input id="cf-id" value={idText} onChange={(e) => setIdText(e.target.value)} spellCheck={false}
                className={`${fieldCls} border-line-strong`} />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm text-body">
                <input type="checkbox" checked={extended} onChange={(e) => setExtended(e.target.checked)} />
                29-bit (ext)
              </label>
              <label className="flex items-center gap-2 text-sm text-body">
                <input type="checkbox" checked={rtr} onChange={(e) => setRtr(e.target.checked)} />
                RTR
              </label>
            </div>
          </div>
          {!rtr && (
            <div>
              <label htmlFor="cf-data" className="font-mono text-xs text-mute">Data bytes (hex, 0–8)</label>
              <textarea id="cf-data" value={dataText} rows={2} spellCheck={false}
                onChange={(e) => setDataText(e.target.value)}
                className={`${fieldCls} resize-y border-line-strong`} />
            </div>
          )}
          {"error" in analysis && (
            <p className="font-mono text-xs text-err" role="alert">{analysis.error}</p>
          )}
          {"a" in analysis && analysis.a && analysis.a.errors.map((e) => (
            <p key={e} className="rounded-btn border border-err/40 px-3 py-2 font-mono text-xs text-err">{e}</p>
          ))}
        </div>

        <div className="space-y-2.5">
          {"a" in analysis && analysis.a && analysis.a.errors.length === 0 && (
            <>
              <ResultCard label={`Identifier (${analysis.a.extended ? "29-bit extended" : "11-bit standard"})`} value={analysis.a.idHex} size="lg" />
              <ResultCard label="Identifier (binary — lower wins arbitration)" value={analysis.a.idBinary} />
              <ResultCard label="Identifier (decimal)" value={String(analysis.a.id)} />
              <ResultCard label="DLC" value={String(analysis.a.dlc)} />
              {!analysis.a.rtr && analysis.a.data.length > 0 && (
                <ResultCard label="Data" value={bytesToHex(analysis.a.data)} />
              )}
              {analysis.a.rtr && (
                <p className="rounded-btn border border-warn/40 px-3 py-2 font-mono text-xs text-warn">
                  Remote frame — requests transmission of this identifier, carries no data.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
