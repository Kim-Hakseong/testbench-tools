"use client";

import { useEffect, useMemo, useState } from "react";
import { ANALOG_PRESETS, scale } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

function fmt(v: number): string {
  const s = v.toFixed(4).replace(/\.?0+$/, "");
  return s === "" || s === "-" ? "0" : s;
}

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function PlcScalingTool() {
  const [presetId, setPresetId] = useState<string>("s7");
  const [direction, setDirection] = useState<"toEng" | "toRaw">("toEng");
  const [rawMinText, setRawMinText] = useState("0");
  const [rawMaxText, setRawMaxText] = useState("27648");
  const [engMinText, setEngMinText] = useState("0");
  const [engMaxText, setEngMaxText] = useState("100");
  const [inText, setInText] = useState("13824");
  const [d, setD] = useState({ rawMinText, rawMaxText, engMinText, engMaxText, inText });

  useEffect(() => {
    const t = setTimeout(() => setD({ rawMinText, rawMaxText, engMinText, engMaxText, inText }), 150);
    return () => clearTimeout(t);
  }, [rawMinText, rawMaxText, engMinText, engMaxText, inText]);

  const preset = ANALOG_PRESETS.find((p) => p.id === presetId);

  function selectPreset(id: string) {
    setPresetId(id);
    const p = ANALOG_PRESETS.find((x) => x.id === id);
    if (p) {
      setRawMinText(String(p.rawMin));
      setRawMaxText(String(p.rawMax));
    }
  }

  const rawMin = preset ? preset.rawMin : num(d.rawMinText);
  const rawMax = preset ? preset.rawMax : num(d.rawMaxText);
  const engMin = num(d.engMinText);
  const engMax = num(d.engMaxText);
  const input = num(d.inText);
  const ok =
    rawMin !== null && rawMax !== null && rawMax !== rawMin &&
    engMin !== null && engMax !== null && engMax !== engMin && input !== null;

  const result = useMemo(() => {
    if (!ok) return null;
    return direction === "toEng"
      ? scale(input!, rawMin!, rawMax!, engMin!, engMax!)
      : scale(input!, engMin!, engMax!, rawMin!, rawMax!);
  }, [ok, direction, input, rawMin, rawMax, engMin, engMax]);

  const outOfRange =
    ok && input !== null &&
    (direction === "toEng"
      ? input < Math.min(rawMin!, rawMax!) || input > Math.max(rawMin!, rawMax!)
      : input < Math.min(engMin!, engMax!) || input > Math.max(engMin!, engMax!));

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="plc-preset" className="text-xs font-medium uppercase tracking-wide text-mute">Vendor preset</label>
          <select
            id="plc-preset"
            value={presetId}
            onChange={(e) => (e.target.value === "custom" ? setPresetId("custom") : selectPreset(e.target.value))}
            className={`${fieldCls} border-line-strong`}
          >
            {ANALOG_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
            <option value="custom">Custom raw range…</option>
          </select>
        </div>
        <div className="flex items-end">
          <div className="flex w-full rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Direction">
            {(
              [
                ["toEng", "Raw → Engineering"],
                ["toRaw", "Engineering → Raw"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={direction === key}
                onClick={() => setDirection(key)}
                className={`flex-1 rounded-[6px] px-2 py-1.5 text-sm transition-colors ${
                  direction === key ? "bg-elevated text-ink" : "text-mute hover:text-body"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="plc-rawmin" className="text-xs font-medium uppercase tracking-wide text-mute">Raw min</label>
            <input id="plc-rawmin" value={preset ? String(preset.rawMin) : rawMinText} disabled={!!preset}
              onChange={(e) => setRawMinText(e.target.value)} spellCheck={false}
              className={`${fieldCls} border-line-strong disabled:opacity-60`} />
          </div>
          <div>
            <label htmlFor="plc-rawmax" className="text-xs font-medium uppercase tracking-wide text-mute">Raw max</label>
            <input id="plc-rawmax" value={preset ? String(preset.rawMax) : rawMaxText} disabled={!!preset}
              onChange={(e) => setRawMaxText(e.target.value)} spellCheck={false}
              className={`${fieldCls} border-line-strong disabled:opacity-60`} />
          </div>
          <div>
            <label htmlFor="plc-engmin" className="text-xs font-medium uppercase tracking-wide text-mute">Eng. min</label>
            <input id="plc-engmin" value={engMinText} onChange={(e) => setEngMinText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${engMin === null ? "border-err" : "border-line-strong"}`} />
          </div>
          <div>
            <label htmlFor="plc-engmax" className="text-xs font-medium uppercase tracking-wide text-mute">Eng. max</label>
            <input id="plc-engmax" value={engMaxText} onChange={(e) => setEngMaxText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${engMax === null || engMax === engMin ? "border-err" : "border-line-strong"}`} />
          </div>
          <div className="col-span-2">
            <label htmlFor="plc-in" className="text-xs font-medium uppercase tracking-wide text-mute">
              {direction === "toEng" ? "Raw value" : "Engineering value"}
            </label>
            <input id="plc-in" value={inText} onChange={(e) => setInText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${input === null ? "border-err" : "border-line-strong"}`} />
          </div>
        </div>

        <div className="space-y-2.5">
          {result === null ? (
            <p className="text-sm text-mute">Fix the highlighted inputs to see results.</p>
          ) : (
            <>
              <ResultCard
                label={direction === "toEng" ? "Engineering value" : "Raw value"}
                value={fmt(direction === "toRaw" ? Math.round(result) : result)}
                size="lg"
              />
              <ResultCard
                label="Percent of span"
                value={`${fmt(scale(input!, direction === "toEng" ? rawMin! : engMin!, direction === "toEng" ? rawMax! : engMax!, 0, 100))} %`}
              />
              {outOfRange && (
                <p className="rounded-btn border border-warn/40 px-3 py-2 font-mono text-xs text-warn">
                  Input is outside the configured range — extrapolating linearly.
                </p>
              )}
              {preset && (
                <p className="font-mono text-xs text-mute">preset source: {preset.source}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
