"use client";

import { useEffect, useMemo, useState } from "react";
import {
  tcTemperature,
  tcVoltage,
  tcWithColdJunction,
  THERMOCOUPLE_TYPES,
  type ThermocoupleType,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

type Mode = "toMv" | "toC" | "cjc";

const MODES: { id: Mode; label: string }[] = [
  { id: "cjc", label: "Measured mV + cold junction → °C" },
  { id: "toC", label: "mV → °C" },
  { id: "toMv", label: "°C → mV" },
];

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

function fmt(v: number, digits = 3): string {
  return Number(v.toFixed(digits)).toString();
}

/** Flattened panel model — one shape whatever direction the engine ran in. */
type TcView =
  | { ok: false; error: string }
  | {
      ok: true;
      headlineLabel: string;
      headlineValue: string;
      subrange: string;
      coldJunction?: string;
      total?: string;
      band?: string;
    };

export function ThermocoupleTool() {
  const t = useToolText();
  const [type, setType] = useState<ThermocoupleType>("K");
  const [mode, setMode] = useState<Mode>("cjc");
  const [tempText, setTempText] = useState("100");
  const [mvText, setMvText] = useState("4.096");
  const [cjText, setCjText] = useState("25");
  const [d, setD] = useState({ tempText, mvText, cjText });

  useEffect(() => {
    const h = setTimeout(() => setD({ tempText, mvText, cjText }), 150);
    return () => clearTimeout(h);
  }, [tempText, mvText, cjText]);

  const info = THERMOCOUPLE_TYPES.find((x) => x.id === type)!;

  /**
   * The two directions do not share a span, and pairing them on one line reads
   * as a contradiction: type K's reference function runs to −270 °C, but NIST
   * only publishes an inverse down to −5.891 mV (−200 °C), and type B produces
   * 0 mV at 0 °C while its inverse starts at 0.291 mV. Show whichever span the
   * current direction is actually bounded by.
   */
  const span = useMemo(() => {
    if (mode === "toMv") {
      const lo = tcVoltage(type, info.minC);
      const hi = tcVoltage(type, info.maxC);
      const out = lo.ok && hi.ok ? ` → ${fmt(lo.millivolts)}…${fmt(hi.millivolts)} mV` : "";
      return `${fmt(info.minC, 0)}…${fmt(info.maxC, 0)} °C${out}`;
    }
    return `${fmt(info.minMv)}…${fmt(info.maxMv)} mV → ${fmt(info.inverseMinC, 0)}…${fmt(info.inverseMaxC, 0)} °C`;
  }, [mode, type, info]);

  /**
   * One shape for all three modes. The engine returns a different result type
   * per direction; flattening them here keeps the panel from having to narrow
   * a three-way union field by field.
   */
  const view = useMemo((): TcView | null => {
    if (mode === "toMv") {
      const c = num(d.tempText);
      if (c === null) return null;
      const r = tcVoltage(type, c);
      if (!r.ok) return { ok: false, error: r.error };
      return {
        ok: true,
        headlineLabel: "Voltage (mV)",
        headlineValue: `${fmt(r.millivolts, 4)} mV`,
        subrange: `${fmt(r.subrange.minC, 0)} … ${fmt(r.subrange.maxC, 0)} °C`,
      };
    }

    const mv = num(d.mvText);
    if (mv === null) return null;

    if (mode === "toC") {
      const r = tcTemperature(type, mv);
      if (!r.ok) return { ok: false, error: r.error };
      return {
        ok: true,
        headlineLabel: "Temperature (°C)",
        headlineValue: `${fmt(r.celsius, 2)} °C`,
        band: `${fmt(r.errorMinC, 3)} … ${fmt(r.errorMaxC, 3)} °C`,
        subrange: `${fmt(r.subrange.minMv, 3)} … ${fmt(r.subrange.maxMv, 3)} mV`,
      };
    }

    const cj = num(d.cjText);
    if (cj === null) return null;
    const r = tcWithColdJunction(type, mv, cj);
    if (!r.ok) return { ok: false, error: r.error };
    return {
      ok: true,
      headlineLabel: "Temperature (°C)",
      headlineValue: `${fmt(r.celsius, 2)} °C`,
      coldJunction: `${fmt(r.coldJunctionMv, 4)} mV`,
      total: `${fmt(r.totalMv, 4)} mV`,
      band: `${fmt(r.errorMinC, 3)} … ${fmt(r.errorMaxC, 3)} °C`,
      subrange: `${fmt(r.subrange.minMv, 3)} … ${fmt(r.subrange.maxMv, 3)} mV`,
    };
  }, [mode, type, d]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label htmlFor="tc-type" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Thermocouple type")}
            </label>
            <select
              id="tc-type"
              value={type}
              onChange={(e) => setType(e.target.value as ThermocoupleType)}
              className={`${fieldCls} border-line-strong`}
            >
              {THERMOCOUPLE_TYPES.map((x) => (
                <option key={x.id} value={x.id}>
                  {`Type ${x.id} — ${x.name}`}
                </option>
              ))}
            </select>
            <p className="mt-1.5 font-mono text-[11px] text-mute">
              {span}
            </p>
          </div>

          <div>
            <label htmlFor="tc-mode" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Direction")}
            </label>
            <select
              id="tc-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className={`${fieldCls} border-line-strong`}
            >
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>{t(m.label)}</option>
              ))}
            </select>
          </div>

          {mode === "toMv" ? (
            <div>
              <label htmlFor="tc-temp" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Temperature (°C)")}
              </label>
              <input id="tc-temp" value={tempText} onChange={(e) => setTempText(e.target.value)}
                spellCheck={false} className={`${fieldCls} border-line-strong`} />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="tc-mv" className="text-xs font-medium uppercase tracking-wide text-mute">
                  {mode === "cjc" ? t("Measured voltage (mV)") : t("Voltage (mV)")}
                </label>
                <input id="tc-mv" value={mvText} onChange={(e) => setMvText(e.target.value)}
                  spellCheck={false} className={`${fieldCls} border-line-strong`} />
              </div>
              {mode === "cjc" && (
                <div>
                  <label htmlFor="tc-cj" className="text-xs font-medium uppercase tracking-wide text-mute">
                    {t("Cold junction temperature (°C)")}
                  </label>
                  <input id="tc-cj" value={cjText} onChange={(e) => setCjText(e.target.value)}
                    spellCheck={false} className={`${fieldCls} border-line-strong`} />
                </div>
              )}
            </>
          )}

          {view && !view.ok && (
            <p className="font-mono text-xs text-err" role="alert">{view.error}</p>
          )}
        </div>

        <div className="space-y-2.5">
          {view?.ok && (
            <>
              <ResultCard label={t(view.headlineLabel)} value={view.headlineValue} size="lg" />
              {view.coldJunction && (
                <ResultCard label={t("Cold junction contributes")} value={view.coldJunction} />
              )}
              {view.total && (
                <ResultCard label={t("Total voltage inverted")} value={view.total} />
              )}
              {view.band && (
                <ResultCard label={t("Inverse polynomial error band")} value={view.band} />
              )}
              <ResultCard label={t("Sub-range applied")} value={view.subrange} />
            </>
          )}
        </div>
      </div>

      {view?.ok && view.band && (
        <p className="mt-4 rounded-btn border border-line-soft px-3 py-2 text-xs text-mute" role="status">
          {t("The mV → °C direction is an approximation, not an exact inverse. NIST publishes the residual band shown above; it is not measurement uncertainty, which your sensor and wiring add on top.")}
        </p>
      )}
    </div>
  );
}
