"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  asciiToBytes,
  identifyFromCatalog,
  matchPresetName,
  parseHex,
  type CrcParams,
  type CrcSample,
} from "@testbench/engine";
import type { SearchEvent, SearchRequest } from "@/workers/crc-search.worker";

interface Row {
  dataText: string;
  checksumText: string;
}

type DataMode = "ascii" | "hex";

function parseChecksum(s: string): number | null {
  const t = s.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{1,8}$/.test(t)) return null;
  return parseInt(t, 16) >>> 0;
}

function paramsKey(p: CrcParams): string {
  return [p.width, p.poly, p.init, p.refin, p.refout, p.xorout].join("/");
}

function fmtHex(v: number, width: number): string {
  return "0x" + v.toString(16).toUpperCase().padStart(Math.ceil(width / 4), "0");
}

export function CrcIdentifierTool() {
  const [rows, setRows] = useState<Row[]>([
    { dataText: "123456789", checksumText: "4B37" },
    { dataText: "", checksumText: "" },
  ]);
  const [mode, setMode] = useState<DataMode>("ascii");
  const [debouncedRows, setDebouncedRows] = useState(rows);
  const [searchWidth, setSearchWidth] = useState<8 | 16>(16);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deepResults, setDeepResults] = useState<CrcParams[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedRows(rows), 150);
    return () => clearTimeout(t);
  }, [rows]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const { samples, rowErrors } = useMemo(() => {
    const out: CrcSample[] = [];
    const errors: (string | null)[] = [];
    for (const row of debouncedRows) {
      if (row.dataText.trim() === "" && row.checksumText.trim() === "") {
        errors.push(null);
        continue;
      }
      let data: Uint8Array | null = null;
      if (mode === "ascii") data = asciiToBytes(row.dataText);
      else {
        const r = parseHex(row.dataText);
        data = r.ok ? r.bytes : null;
      }
      const checksum = parseChecksum(row.checksumText);
      if (!data || data.length === 0) errors.push("data");
      else if (checksum === null) errors.push("checksum");
      else {
        out.push({ data, checksum });
        errors.push(null);
      }
    }
    return { samples: out, rowErrors: errors };
  }, [debouncedRows, mode]);

  const catalogMatches = useMemo(() => identifyFromCatalog(samples), [samples]);

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function startSearch() {
    if (samples.length === 0 || searching) return;
    setSearching(true);
    setSearchDone(false);
    setProgress(0);
    setDeepResults([]);
    const worker = new Worker(new URL("../../workers/crc-search.worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<SearchEvent>) => {
      const msg = e.data;
      if (msg.type === "progress") setProgress(msg.done / msg.total);
      else if (msg.type === "found") setDeepResults((prev) => [...prev, ...msg.params]);
      else if (msg.type === "done") {
        setSearching(false);
        setSearchDone(true);
        worker.terminate();
      }
    };
    const req: SearchRequest = {
      samples: samples.map((s) => ({ data: Array.from(s.data), checksum: s.checksum })),
      width: searchWidth,
    };
    worker.postMessage(req);
  }

  function cancelSearch() {
    workerRef.current?.terminate();
    setSearching(false);
  }

  const inputCls =
    "w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      {/* sample pairs */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-mute">
          Known (data, checksum) pairs
        </span>
        <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Data mode">
          {(["ascii", "hex"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-[6px] px-2.5 py-1 font-mono text-xs transition-colors ${
                mode === m ? "bg-elevated text-ink" : "text-mute hover:text-body"
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_11rem_auto]">
            <input
              value={row.dataText}
              onChange={(e) => updateRow(i, { dataText: e.target.value })}
              placeholder={mode === "ascii" ? "data e.g. 123456789" : "data e.g. 01 03 00 00 00 0A"}
              spellCheck={false}
              aria-label={`Sample ${i + 1} data`}
              className={`${inputCls} ${rowErrors[i] === "data" ? "border-err" : "border-line-strong"}`}
            />
            <input
              value={row.checksumText}
              onChange={(e) => updateRow(i, { checksumText: e.target.value })}
              placeholder="checksum e.g. 4B37"
              spellCheck={false}
              aria-label={`Sample ${i + 1} checksum`}
              className={`${inputCls} ${rowErrors[i] === "checksum" ? "border-err" : "border-line-strong"}`}
            />
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
              disabled={rows.length <= 1}
              aria-label={`Remove sample ${i + 1}`}
              className="rounded-btn border border-line-strong px-3 py-2 text-sm text-mute transition-colors hover:border-mute hover:text-body disabled:opacity-40"
            >
              −
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((r) => [...r, { dataText: "", checksumText: "" }])}
        className="mt-2.5 rounded-btn border border-line-strong px-3 py-1.5 text-sm text-body transition-colors hover:border-mute"
      >
        + Add pair
      </button>

      {/* catalog matches */}
      <div className="mt-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-mute">
          Catalog matches ({catalogMatches.length})
        </h3>
        {samples.length === 0 ? (
          <p className="mt-2 text-sm text-mute">Enter at least one valid pair.</p>
        ) : catalogMatches.length === 0 ? (
          <p className="mt-2 font-mono text-sm text-warn">
            No catalog algorithm matches all pairs — try the deep search below.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {catalogMatches.map((p) => (
              <li
                key={p.name}
                className="flex flex-wrap items-baseline gap-x-3 rounded-btn border border-line-soft bg-elevated px-3 py-2"
              >
                <span className="font-mono text-sm text-ok">{p.name}</span>
                <span className="font-mono text-xs text-mute">
                  poly {fmtHex(p.poly, p.width)} · init {fmtHex(p.init, p.width)} · ref{" "}
                  {p.refin ? "t" : "f"}/{p.refout ? "t" : "f"} · xorout {fmtHex(p.xorout, p.width)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {samples.length === 1 && catalogMatches.length > 1 && (
          <p className="mt-2 text-xs text-mute">
            Add a second pair to narrow the candidates.
          </p>
        )}
      </div>

      {/* deep search */}
      <div className="mt-6 border-t border-line-soft pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-mute">
            Deep search (exhaustive, in a Web Worker)
          </h3>
          <select
            value={searchWidth}
            onChange={(e) => setSearchWidth(Number(e.target.value) as 8 | 16)}
            disabled={searching}
            aria-label="Search width"
            className="rounded-btn border border-line-strong bg-well px-2 py-1 font-mono text-xs text-ink outline-none"
          >
            <option value={8}>width 8</option>
            <option value={16}>width 16</option>
          </select>
          {!searching ? (
            <button
              type="button"
              onClick={startSearch}
              disabled={samples.length === 0}
              className="rounded-btn bg-ink px-3 py-1.5 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            >
              Search all polynomials
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelSearch}
              className="rounded-btn border border-line-strong px-3 py-1.5 text-sm text-body transition-colors hover:border-mute"
            >
              Cancel
            </button>
          )}
        </div>

        {(searching || searchDone) && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full bg-ok transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-xs text-mute">
              {searching
                ? `sweeping polynomials… ${Math.round(progress * 100)}%`
                : `done — ${deepResults.length} parameter set${deepResults.length === 1 ? "" : "s"} found`}
            </p>
          </div>
        )}

        {deepResults.length > 0 && (
          <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
            {Array.from(new Map(deepResults.map((p) => [paramsKey(p), p])).values()).map((p) => {
              const name = matchPresetName(p);
              return (
                <li
                  key={paramsKey(p)}
                  className="flex flex-wrap items-baseline gap-x-3 rounded-btn border border-line-soft bg-elevated px-3 py-2"
                >
                  <span className="font-mono text-sm text-ink">
                    poly {fmtHex(p.poly, p.width)} · init {fmtHex(p.init, p.width)} · ref{" "}
                    {p.refin ? "t" : "f"}/{p.refout ? "t" : "f"} · xorout {fmtHex(p.xorout, p.width)}
                  </span>
                  {name && <span className="font-mono text-xs text-ok">= {name}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
