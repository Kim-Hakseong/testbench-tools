"use client";

import { useEffect, useMemo, useState } from "react";
import { adcToVoltage, voltageToAdc } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function AdcTool() {
  const [direction, setDirection] = useState<"toV" | "toCount">("toV");
  const [bits, setBits] = useState(12);
  const [vrefText, setVrefText] = useState("3.3");
  const [countText, setCountText] = useState("2048");
  const [voltText, setVoltText] = useState("1.65");
  const [d, setD] = useState({ vrefText, countText, voltText });

  useEffect(() => {
    const t = setTimeout(() => setD({ vrefText, countText, voltText }), 150);
    return () => clearTimeout(t);
  }, [vrefText, countText, voltText]);

  const vref = num(d.vrefText);
  const count = num(d.countText);
  const volt = num(d.voltText);
  const maxCode = Math.pow(2, bits) - 1;

  const countValid = count !== null && Number.isInteger(count) && count >= 0 && count <= maxCode;

  const result = useMemo(() => {
    if (vref === null || vref <= 0) return null;
    if (direction === "toV") {
      if (!countValid) return null;
      return { kind: "v" as const, ...adcToVoltage(count!, bits, vref) };
    }
    if (volt === null) return null;
    return { kind: "count" as const, code: voltageToAdc(volt, bits, vref), lsb: vref / maxCode };
  }, [direction, vref, count, countValid, volt, bits, maxCode]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Direction">
        {(
          [
            ["toV", "Count → Voltage"],
            ["toCount", "Voltage → Count"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={direction === key}
            onClick={() => setDirection(key)}
            className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${
              direction === key ? "bg-elevated text-ink" : "text-mute hover:text-body"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="adc-bits" className="text-xs font-medium uppercase tracking-wide text-mute">Resolution</label>
            <select id="adc-bits" value={bits} onChange={(e) => setBits(Number(e.target.value))}
              className={`${fieldCls} border-line-strong`}>
              {[8, 10, 12, 14, 16, 24].map((b) => (
                <option key={b} value={b}>{b}-bit (0…{Math.pow(2, b) - 1})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="adc-vref" className="text-xs font-medium uppercase tracking-wide text-mute">Vref (V)</label>
            <input id="adc-vref" value={vrefText} onChange={(e) => setVrefText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${vref === null || vref <= 0 ? "border-err" : "border-line-strong"}`} />
          </div>
          <div className="col-span-2">
            {direction === "toV" ? (
              <>
                <label htmlFor="adc-count" className="text-xs font-medium uppercase tracking-wide text-mute">ADC count</label>
                <input id="adc-count" value={countText} onChange={(e) => setCountText(e.target.value)} spellCheck={false}
                  className={`${fieldCls} ${countValid ? "border-line-strong" : "border-err"}`} />
                {!countValid && count !== null && (
                  <p className="mt-1.5 font-mono text-xs text-err" role="alert">
                    Count must be an integer in 0…{maxCode}.
                  </p>
                )}
              </>
            ) : (
              <>
                <label htmlFor="adc-volt" className="text-xs font-medium uppercase tracking-wide text-mute">Voltage (V)</label>
                <input id="adc-volt" value={voltText} onChange={(e) => setVoltText(e.target.value)} spellCheck={false}
                  className={`${fieldCls} ${volt === null ? "border-err" : "border-line-strong"}`} />
              </>
            )}
          </div>
          <p className="col-span-2 font-mono text-xs text-mute">
            convention: ratio = count / (2^N − 1)
          </p>
        </div>

        <div className="space-y-2.5">
          {result === null ? (
            <p className="text-sm text-mute">Fix the highlighted inputs to see results.</p>
          ) : result.kind === "v" ? (
            <>
              <ResultCard label="Voltage" value={`${result.voltage.toFixed(6)} V`} size="lg" />
              <ResultCard label="LSB size" value={`${(result.lsb * 1000).toFixed(6)} mV`} />
              <ResultCard label="Ratio" value={`${(result.ratio * 100).toFixed(4)} %`} />
            </>
          ) : (
            <>
              <ResultCard label="Nearest code" value={String(result.code)} size="lg" />
              <ResultCard label="Code (hex)" value={"0x" + result.code.toString(16).toUpperCase()} />
              <ResultCard label="LSB size" value={`${(result.lsb * 1000).toFixed(6)} mV`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
