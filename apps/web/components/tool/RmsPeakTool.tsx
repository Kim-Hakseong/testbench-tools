"use client";

import { useEffect, useMemo, useState } from "react";
import { sineLevels } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const KINDS = [
  { id: "rms", label: "RMS" },
  { id: "peak", label: "Peak" },
  { id: "pp", label: "Peak-to-peak" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function RmsPeakTool() {
  const [kind, setKind] = useState<Kind>("rms");
  const [valText, setValText] = useState("230");
  const [d, setD] = useState(valText);

  useEffect(() => {
    const h = setTimeout(() => setD(valText), 150);
    return () => clearTimeout(h);
  }, [valText]);

  const value = useMemo(() => {
    const v = Number(d.trim());
    return d.trim() === "" || Number.isNaN(v) ? null : v;
  }, [d]);

  const levels = value !== null ? sineLevels(kind, value) : null;
  const fmt = (x: number) => x.toPrecision(6).replace(/\.?0+$/, "");

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Input kind">
            {KINDS.map((k) => (
              <button key={k.id} type="button" role="tab" aria-selected={kind === k.id}
                onClick={() => setKind(k.id)}
                className={`flex-1 rounded-[6px] px-2 py-1.5 text-sm transition-colors ${kind === k.id ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
                {k.label}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="rp-val" className="text-xs font-medium uppercase tracking-wide text-mute">
              {KINDS.find((k) => k.id === kind)!.label} value
            </label>
            <input id="rp-val" value={valText} onChange={(e) => setValText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${value === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <p className="font-mono text-xs text-mute">
            valid for a pure sine wave, zero DC offset
            <br />Vpk = √2 · Vrms · Vpp = 2 · Vpk
          </p>
        </div>

        <div className="space-y-2.5">
          {levels && (
            <>
              <ResultCard label="RMS" value={fmt(levels.rms)} size={kind === "rms" ? "md" : "lg"} />
              <ResultCard label="Peak" value={fmt(levels.peak)} />
              <ResultCard label="Peak-to-peak" value={fmt(levels.peakToPeak)} />
              <ResultCard label="Rectified average (2·Vpk/π)" value={fmt(levels.avgRectified)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
