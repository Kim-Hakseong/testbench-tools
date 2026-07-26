"use client";

import { useEffect, useMemo, useState } from "react";
import { layoutStruct, parseStructBody, type Arch } from "@testbench/engine";

const DEFAULT_SRC = `uint8_t  flags;
uint32_t count;
uint16_t id;
char     name[8];`;

export function StructPaddingTool() {
  const [src, setSrc] = useState(DEFAULT_SRC);
  const [arch, setArch] = useState<Arch>(32);
  const [d, setD] = useState(src);

  useEffect(() => {
    const h = setTimeout(() => setD(src), 150);
    return () => clearTimeout(h);
  }, [src]);

  const result = useMemo(() => {
    const p = parseStructBody(d);
    if (!p.ok) return { error: p.error };
    return { layout: layoutStruct(p.members, arch) };
  }, [d, arch]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="sp-src" className="text-xs font-medium uppercase tracking-wide text-mute">
              Struct members (one per line)
            </label>
            <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Architecture">
              {([32, 64] as const).map((a) => (
                <button key={a} type="button" role="tab" aria-selected={arch === a}
                  onClick={() => setArch(a)}
                  className={`rounded-[6px] px-2.5 py-1 font-mono text-xs transition-colors ${arch === a ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
                  {a}-bit
                </button>
              ))}
            </div>
          </div>
          <textarea id="sp-src" value={src} rows={8} spellCheck={false}
            onChange={(e) => setSrc(e.target.value)}
            className={`mt-2 w-full resize-y rounded-btn border bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors ${
              "error" in result ? "border-err" : "border-line-strong focus:border-mute"
            }`} />
          {"error" in result && result.error && (
            <p className="mt-1.5 font-mono text-xs text-err" role="alert">{result.error}</p>
          )}
          <p className="mt-2 font-mono text-xs text-mute">
            natural alignment (System V-style) · long = {arch === 64 ? "8" : "4"} bytes · pointers = {arch / 8} bytes
          </p>
        </div>

        <div>
          {"layout" in result && result.layout && (
            <>
              <div className="overflow-x-auto rounded-btn border border-line-soft">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                      <th className="px-3 py-2 font-medium">Member</th>
                      <th className="px-3 py-2 font-medium">Offset</th>
                      <th className="px-3 py-2 font-medium">Size</th>
                      <th className="px-3 py-2 font-medium">Pad before</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.layout.rows.map((r) => (
                      <tr key={r.name} className="border-b border-line-soft font-mono text-[13px] last:border-0">
                        <td className="px-3 py-2 text-ink">{r.name}{r.count > 1 ? `[${r.count}]` : ""}</td>
                        <td className="px-3 py-2 text-body">{r.offset}</td>
                        <td className="px-3 py-2 text-body">{r.size}</td>
                        <td className={`px-3 py-2 ${r.padBefore > 0 ? "text-warn" : "text-mute"}`}>{r.padBefore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 font-mono text-sm text-ink">
                sizeof = <span className="text-ok">{result.layout.size}</span> · alignment {result.layout.align} ·{" "}
                <span className={result.layout.totalPadding > 0 ? "text-warn" : "text-ok"}>
                  {result.layout.totalPadding} bytes padding ({Math.round((result.layout.totalPadding / result.layout.size) * 100)} %)
                </span>
              </p>
              {/* byte map */}
              <div className="mt-3 flex flex-wrap gap-0.5">
                {(() => {
                  const cells: { kind: "data" | "pad"; title: string }[] = [];
                  for (const r of result.layout.rows) {
                    for (let i = 0; i < r.padBefore; i++) cells.push({ kind: "pad", title: "padding" });
                    for (let i = 0; i < r.size; i++) cells.push({ kind: "data", title: r.name });
                  }
                  while (cells.length < result.layout.size) cells.push({ kind: "pad", title: "tail padding" });
                  return cells.map((c, i) => (
                    <span key={i} title={`${i}: ${c.title}`}
                      className={`inline-block h-4 w-4 rounded-[3px] border ${
                        c.kind === "pad" ? "border-warn/50 bg-warn/20" : "border-line-strong bg-elevated"
                      }`} />
                  ));
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
