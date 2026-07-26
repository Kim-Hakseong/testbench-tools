"use client";

import { useEffect, useMemo, useState } from "react";
import { extractFields, type BitField } from "@testbench/engine";

const FIELD_COLORS = ["#7dd3fc", "#5eead4", "#fcd34d", "#fda4af", "#bef264", "#93c5fd", "#fdba74", "#f9a8d4"];

const fieldCls =
  "w-full rounded-btn border bg-well px-2 py-1.5 font-mono text-xs text-ink outline-none transition-colors focus:border-mute border-line-strong";

interface Row {
  name: string;
  lsb: string;
  width: string;
}

export function BitFieldTool() {
  const [valText, setValText] = useState("CAFE1234");
  const [rows, setRows] = useState<Row[]>([
    { name: "low byte", lsb: "0", width: "8" },
    { name: "mid", lsb: "8", width: "12" },
    { name: "high", lsb: "20", width: "12" },
  ]);
  const [d, setD] = useState({ valText, rows });

  useEffect(() => {
    const h = setTimeout(() => setD({ valText, rows }), 150);
    return () => clearTimeout(h);
  }, [valText, rows]);

  const value = useMemo(() => {
    const t = d.valText.trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,16}$/.test(t)) return null;
    return BigInt("0x" + t);
  }, [d.valText]);

  const totalBits = useMemo(() => {
    const t = d.valText.trim().replace(/^0x/i, "");
    return /^[0-9a-fA-F]+$/.test(t) ? t.length * 4 : 32;
  }, [d.valText]);

  const fields: BitField[] = useMemo(
    () =>
      d.rows
        .map((r) => ({ name: r.name || "field", lsb: Number(r.lsb), width: Number(r.width) }))
        .filter((f) => Number.isInteger(f.lsb) && Number.isInteger(f.width) && f.lsb >= 0 && f.width >= 1 && f.lsb + f.width <= 64),
    [d.rows],
  );

  const extracted = value !== null ? extractFields(value, fields) : [];

  const bitOwner = useMemo(() => {
    const map = new Map<number, number>();
    fields.forEach((f, i) => {
      for (let b = f.lsb; b < f.lsb + f.width; b++) if (!map.has(b)) map.set(b, i);
    });
    return map;
  }, [fields]);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div>
        <label htmlFor="bf-val" className="text-xs font-medium uppercase tracking-wide text-mute">Register value (hex, ≤64-bit)</label>
        <input id="bf-val" value={valText} onChange={(e) => setValText(e.target.value)} spellCheck={false}
          className={`mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute ${value === null ? "border-err" : "border-line-strong"}`} />
      </div>

      {/* bit strip, MSB left */}
      {value !== null && (
        <div className="mt-4 overflow-x-auto">
          <div className="flex gap-0.5">
            {Array.from({ length: totalBits }, (_, i) => {
              const bit = totalBits - 1 - i;
              const owner = bitOwner.get(bit);
              const set = (value >> BigInt(bit)) & 1n;
              const color = owner !== undefined ? FIELD_COLORS[owner % FIELD_COLORS.length] : undefined;
              return (
                <span key={bit} title={`bit ${bit}`}
                  className="flex h-7 w-5 shrink-0 items-center justify-center rounded-[3px] border font-mono text-[11px]"
                  style={{
                    borderColor: color ?? "var(--tb-border-soft)",
                    backgroundColor: color ? `${color}22` : undefined,
                    color: set ? "var(--tb-ink)" : "var(--tb-mute)",
                  }}>
                  {set ? "1" : "0"}
                </span>
              );
            })}
          </div>
          <div className="mt-0.5 flex gap-0.5 font-mono text-[9px] text-mute">
            {Array.from({ length: totalBits }, (_, i) => {
              const bit = totalBits - 1 - i;
              return (
                <span key={bit} className="w-5 shrink-0 text-center">
                  {bit % 4 === 0 ? bit : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* field rows */}
      <div className="mt-4 space-y-2">
        <div className="grid grid-cols-[1fr_5rem_5rem_7rem_7rem_auto] items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-mute">
          <span>Field</span><span>LSB</span><span>Width</span><span>Value</span><span>Hex</span><span />
        </div>
        {rows.map((row, i) => {
          const ex = extracted[i];
          return (
            <div key={i} className="grid grid-cols-[1fr_5rem_5rem_7rem_7rem_auto] items-center gap-2">
              <input value={row.name} onChange={(e) => setRow(i, { name: e.target.value })} spellCheck={false} aria-label={`Field ${i + 1} name`} className={fieldCls}
                style={{ borderLeftColor: FIELD_COLORS[i % FIELD_COLORS.length], borderLeftWidth: 3 }} />
              <input value={row.lsb} onChange={(e) => setRow(i, { lsb: e.target.value })} spellCheck={false} aria-label={`Field ${i + 1} LSB`} className={fieldCls} />
              <input value={row.width} onChange={(e) => setRow(i, { width: e.target.value })} spellCheck={false} aria-label={`Field ${i + 1} width`} className={fieldCls} />
              <span className="font-mono text-sm text-ink">{ex ? String(ex.value) : "—"}</span>
              <span className="font-mono text-sm text-body">{ex ? ex.hex : "—"}</span>
              <button type="button" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                disabled={rows.length <= 1} aria-label={`Remove field ${i + 1}`}
                className="rounded-btn border border-line-strong px-2 py-1 text-sm text-mute transition-colors hover:border-mute hover:text-body disabled:opacity-40">
                −
              </button>
            </div>
          );
        })}
      </div>
      <button type="button"
        onClick={() => setRows((r) => [...r, { name: `field ${r.length + 1}`, lsb: "0", width: "1" }])}
        className="mt-2.5 rounded-btn border border-line-strong px-3 py-1.5 text-sm text-body transition-colors hover:border-mute">
        + Add field
      </button>
    </div>
  );
}
