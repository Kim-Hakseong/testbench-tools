"use client";

import { useEffect, useMemo, useState } from "react";
import {
  NTC_REFERENCE_CURVES,
  ntcBetaFromTwoPoints,
  ntcBetaLabel,
  ntcBetaResistance,
  ntcBetaTemperature,
  ntcCheckAgainstTable,
  ntcDividerReading,
  ntcFitSteinhartHart,
  ntcModelDeviation,
  ntcSteinhartResistance,
  ntcSteinhartTemperature,
  ntcSweepTemperatures,
  type NtcBetaParams,
  type NtcDividerTopology,
  type SteinhartHartCoefficients,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border border-line-strong bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";
const labelCls = "text-xs font-medium uppercase tracking-wide text-mute";

type Direction = "rToT" | "tToR";
type ShSource = "fit" | "coefficients";
type BetaSource = "value" | "pair";

const CURVE = NTC_REFERENCE_CURVES[0]!;

/** Defaults come from the one reference curve, so the first render is honest. */
const DEFAULT_POINTS = CURVE.suggestedFitC.map((c) => {
  const row = CURVE.table.find(([t]) => t === c)!;
  return { celsius: String(row[0]), ohms: String(row[1]) };
});

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

function fmt(v: number, digits = 3): string {
  return Number(v.toFixed(digits)).toString();
}

/** Ohms with a unit that keeps 300 kΩ readable without hiding the digits. */
function ohms(v: number): string {
  if (v >= 1e6) return `${fmt(v / 1e6, 4)} MΩ`;
  if (v >= 1000) return `${fmt(v / 1000, 4)} kΩ`;
  return `${fmt(v, 3)} Ω`;
}

/** A, B and C span eight orders of magnitude — exponent notation, always. */
function coefficient(v: number): string {
  return v.toExponential(6);
}

export function ThermistorTool() {
  const t = useToolText();

  const [direction, setDirection] = useState<Direction>("rToT");
  const [rText, setRText] = useState("32554");
  const [tText, setTText] = useState("0");

  const [r0Text, setR0Text] = useState("10000");
  const [t0Text, setT0Text] = useState("25");
  const [betaSource, setBetaSource] = useState<BetaSource>("value");
  const [betaText, setBetaText] = useState("3977");
  const [pairLoText, setPairLoText] = useState("25");
  const [pairHiText, setPairHiText] = useState("85");

  const [shSource, setShSource] = useState<ShSource>("fit");
  const [points, setPoints] = useState(DEFAULT_POINTS);
  const [coefText, setCoefText] = useState({
    a: "1.138449e-3",
    b: "2.325188e-4",
    c: "9.469821e-8",
  });

  const [seriesText, setSeriesText] = useState("10000");
  const [supplyText, setSupplyText] = useState("3.3");
  const [bitsText, setBitsText] = useState("12");
  const [topology, setTopology] = useState<NtcDividerTopology>("pulldown");

  // Debounced snapshot, same 150 ms as the other sensor tools.
  const snapshot = {
    rText,
    tText,
    r0Text,
    t0Text,
    betaText,
    pairLoText,
    pairHiText,
    points,
    coefText,
    seriesText,
    supplyText,
    bitsText,
  };
  const [d, setD] = useState(snapshot);
  useEffect(() => {
    const h = setTimeout(() => setD(snapshot), 150);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rText,
    tText,
    r0Text,
    t0Text,
    betaText,
    pairLoText,
    pairHiText,
    points,
    coefText,
    seriesText,
    supplyText,
    bitsText,
  ]);

  // --- Steinhart-Hart coefficients: fitted, or typed in directly ------------
  const fit = useMemo(() => {
    const parsed = d.points.map((p) => ({ ohms: num(p.ohms), celsius: num(p.celsius) }));
    if (parsed.some((p) => p.ohms === null || p.celsius === null)) return null;
    return ntcFitSteinhartHart(parsed as { ohms: number; celsius: number }[]);
  }, [d.points]);

  const sh = useMemo((): { co: SteinhartHartCoefficients | null; error: string | null } => {
    if (shSource === "fit") {
      if (!fit) return { co: null, error: null };
      return fit.ok ? { co: fit.coefficients, error: null } : { co: null, error: fit.error };
    }
    const a = num(d.coefText.a);
    const b = num(d.coefText.b);
    const c = num(d.coefText.c);
    if (a === null || b === null || c === null) return { co: null, error: null };
    return { co: { a, b, c }, error: null };
  }, [shSource, fit, d.coefText]);

  // --- Beta parameters -----------------------------------------------------
  const pairLo = num(d.pairLoText);
  const pairHi = num(d.pairHiText);

  /**
   * B derived from the fitted curve over the stated pair. This is the honest
   * way to answer "what is B for my thermistor?" — you have to say between
   * which two temperatures, and the answer changes when you change them.
   */
  const derivedBeta = useMemo(() => {
    if (!sh.co || pairLo === null || pairHi === null) return null;
    const lo = ntcSteinhartResistance(sh.co, pairLo);
    const hi = ntcSteinhartResistance(sh.co, pairHi);
    if (!lo.ok) return { ok: false as const, error: lo.error };
    if (!hi.ok) return { ok: false as const, error: hi.error };
    return ntcBetaFromTwoPoints(
      { ohms: lo.ohms, celsius: pairLo },
      { ohms: hi.ohms, celsius: pairHi },
    );
  }, [sh.co, pairLo, pairHi]);

  const beta = useMemo((): NtcBetaParams | null => {
    const r0Ohms = num(d.r0Text);
    const t0C = num(d.t0Text);
    if (r0Ohms === null || t0C === null) return null;
    const value =
      betaSource === "value"
        ? num(d.betaText)
        : derivedBeta && derivedBeta.ok
          ? derivedBeta.beta
          : null;
    if (value === null) return null;
    return {
      r0Ohms,
      t0C,
      beta: value,
      betaLowC: pairLo ?? undefined,
      betaHighC: pairHi ?? undefined,
    };
  }, [d.r0Text, d.t0Text, d.betaText, betaSource, derivedBeta, pairLo, pairHi]);

  const betaLabel = beta ? ntcBetaLabel(beta) : "B";

  // --- The conversion itself ----------------------------------------------
  const conversion = useMemo(() => {
    if (!beta) return null;
    if (direction === "rToT") {
      const r = num(d.rText);
      if (r === null) return null;
      return {
        kind: "temperature" as const,
        input: ohms(r),
        beta: ntcBetaTemperature(beta, r),
        sh: sh.co ? ntcSteinhartTemperature(sh.co, r) : null,
      };
    }
    const c = num(d.tText);
    if (c === null) return null;
    return {
      kind: "resistance" as const,
      input: `${fmt(c, 4)} °C`,
      beta: ntcBetaResistance(beta, c),
      sh: sh.co ? ntcSteinhartResistance(sh.co, c) : null,
    };
  }, [beta, direction, d.rText, d.tText, sh.co]);

  const headline = useMemo(() => {
    if (!conversion) return null;
    const betaValue = conversion.beta.ok
      ? conversion.kind === "temperature"
        ? `${fmt(conversion.beta.celsius, 3)} °C`
        : ohms(conversion.beta.ohms)
      : null;
    const shValue =
      conversion.sh && conversion.sh.ok
        ? conversion.kind === "temperature"
          ? `${fmt(conversion.sh.celsius, 3)} °C`
          : ohms(conversion.sh.ohms)
        : null;
    let gap: string | null = null;
    if (conversion.beta.ok && conversion.sh?.ok) {
      if (conversion.kind === "temperature") {
        const delta = conversion.beta.celsius - conversion.sh.celsius;
        gap = `${delta >= 0 ? "+" : ""}${fmt(delta, 3)} °C`;
      } else {
        const delta = conversion.beta.ohms - conversion.sh.ohms;
        const percent = (delta / conversion.sh.ohms) * 100;
        gap = `${delta >= 0 ? "+" : ""}${fmt(percent, 3)} %`;
      }
    }
    return { betaValue, shValue, gap };
  }, [conversion]);

  /**
   * Model deviation sweep. The span comes from the three fit points — they are
   * the range the user has said they care about — and it is named in the
   * heading so the table still explains itself when the points are hidden
   * behind the direct-coefficient mode.
   */
  const deviation = useMemo(() => {
    if (!beta || !sh.co) return null;
    const temps = d.points.map((p) => num(p.celsius)).filter((v): v is number => v !== null);
    if (temps.length < 2) return null;
    const lo = Math.min(...temps);
    const hi = Math.max(...temps);
    const result = ntcModelDeviation(beta, sh.co, ntcSweepTemperatures(lo, hi, 7));
    return { lo, hi, result };
  }, [beta, sh.co, d.points]);

  // --- Fit quality against the published table -----------------------------
  const usingCurvePoints = useMemo(() => {
    if (shSource !== "fit") return false;
    return d.points.every((p) => {
      const c = num(p.celsius);
      const r = num(p.ohms);
      return c !== null && r !== null && CURVE.table.some(([tc, ro]) => tc === c && ro === r);
    });
  }, [shSource, d.points]);

  const tableCheck = useMemo(() => {
    if (!usingCurvePoints || !sh.co) return null;
    return ntcCheckAgainstTable(sh.co, CURVE.table);
  }, [usingCurvePoints, sh.co]);

  // --- Optional divider ----------------------------------------------------
  const divider = useMemo(() => {
    if (!conversion) return null;
    // Whichever direction is running, the divider needs a resistance: the one
    // that was typed in, or the one the better of the two models just produced.
    let r: number | null = null;
    if (conversion.kind === "temperature") {
      r = num(d.rText);
    } else if (conversion.sh?.ok) {
      r = conversion.sh.ohms;
    } else if (conversion.beta.ok) {
      r = conversion.beta.ohms;
    }
    const seriesOhms = num(d.seriesText);
    const supplyVolts = num(d.supplyText);
    const bits = num(d.bitsText);
    if (r === null || seriesOhms === null || supplyVolts === null) return null;
    return {
      ohms: r,
      result: ntcDividerReading({
        ohms: r,
        seriesOhms,
        supplyVolts,
        topology,
        adcBits: bits === null ? undefined : bits,
      }),
    };
  }, [conversion, d.rText, d.seriesText, d.supplyText, d.bitsText, topology]);

  const setPoint = (i: number, key: "celsius" | "ohms", value: string) =>
    setPoints((prev) => prev.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));

  const conversionError =
    conversion && !conversion.beta.ok
      ? conversion.beta.error
      : conversion && conversion.sh && !conversion.sh.ok
        ? conversion.sh.error
        : null;

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------------- */}
      <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label htmlFor="ntc-direction" className={labelCls}>
                {t("Direction")}
              </label>
              <select
                id="ntc-direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value as Direction)}
                className={fieldCls}
              >
                <option value="rToT">{t("Resistance → temperature")}</option>
                <option value="tToR">{t("Temperature → resistance")}</option>
              </select>
            </div>

            {direction === "rToT" ? (
              <div>
                <label htmlFor="ntc-r" className={labelCls}>
                  {t("Measured resistance (Ω)")}
                </label>
                <input
                  id="ntc-r"
                  value={rText}
                  onChange={(e) => setRText(e.target.value)}
                  spellCheck={false}
                  className={fieldCls}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="ntc-t" className={labelCls}>
                  {t("Temperature (°C)")}
                </label>
                <input
                  id="ntc-t"
                  value={tText}
                  onChange={(e) => setTText(e.target.value)}
                  spellCheck={false}
                  className={fieldCls}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ntc-r0" className={labelCls}>
                  {t("R0 (Ω)")}
                </label>
                <input
                  id="ntc-r0"
                  value={r0Text}
                  onChange={(e) => setR0Text(e.target.value)}
                  spellCheck={false}
                  className={fieldCls}
                />
              </div>
              <div>
                <label htmlFor="ntc-t0" className={labelCls}>
                  {t("T0 (°C)")}
                </label>
                <input
                  id="ntc-t0"
                  value={t0Text}
                  onChange={(e) => setT0Text(e.target.value)}
                  spellCheck={false}
                  className={fieldCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="ntc-beta-source" className={labelCls}>
                {t("B parameter")}
              </label>
              <select
                id="ntc-beta-source"
                value={betaSource}
                onChange={(e) => setBetaSource(e.target.value as BetaSource)}
                className={fieldCls}
              >
                <option value="value">{t("Enter B from the datasheet")}</option>
                <option value="pair">{t("Derive B from the Steinhart-Hart curve")}</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="ntc-beta" className={labelCls}>
                  {t("B (K)")}
                </label>
                <input
                  id="ntc-beta"
                  value={
                    betaSource === "value"
                      ? betaText
                      : derivedBeta && derivedBeta.ok
                        ? fmt(derivedBeta.beta, 2)
                        : ""
                  }
                  onChange={(e) => setBetaText(e.target.value)}
                  readOnly={betaSource === "pair"}
                  spellCheck={false}
                  className={`${fieldCls} ${betaSource === "pair" ? "text-mute" : ""}`}
                />
              </div>
              <div>
                <label htmlFor="ntc-pair-lo" className={labelCls}>
                  {t("B measured from (°C)")}
                </label>
                <input
                  id="ntc-pair-lo"
                  value={pairLoText}
                  onChange={(e) => setPairLoText(e.target.value)}
                  spellCheck={false}
                  className={fieldCls}
                />
              </div>
              <div>
                <label htmlFor="ntc-pair-hi" className={labelCls}>
                  {t("to (°C)")}
                </label>
                <input
                  id="ntc-pair-hi"
                  value={pairHiText}
                  onChange={(e) => setPairHiText(e.target.value)}
                  spellCheck={false}
                  className={fieldCls}
                />
              </div>
            </div>
            <p className="font-mono text-[11px] text-mute">
              {t("B is defined between two temperatures — this result assumes {label}.").replace(
                "{label}",
                betaLabel,
              )}
              {derivedBeta && derivedBeta.ok && betaSource === "value"
                ? ` ${t("The fitted curve gives {label} = {beta} K.")
                    .replace("{label}", betaLabel)
                    .replace("{beta}", fmt(derivedBeta.beta, 1))}`
                : ""}
            </p>

            {conversionError && (
              <p className="font-mono text-xs text-err" role="alert">
                {conversionError}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            {headline?.shValue && (
              <ResultCard
                label={t("Steinhart-Hart (3 constants)")}
                value={headline.shValue}
                size="lg"
              />
            )}
            {headline?.betaValue && (
              <ResultCard
                label={`${t("Beta equation")} · ${betaLabel}`}
                value={headline.betaValue}
                size={headline.shValue ? "md" : "lg"}
              />
            )}
            {headline?.gap && (
              <ResultCard label={t("Beta − Steinhart-Hart")} value={headline.gap} />
            )}
            {sh.co && (
              <ResultCard
                label={t("A, B, C in use")}
                value={`${coefficient(sh.co.a)}, ${coefficient(sh.co.b)}, ${coefficient(sh.co.c)}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[16rem] flex-1">
            <label htmlFor="ntc-sh-source" className={labelCls}>
              {t("Steinhart-Hart coefficients")}
            </label>
            <select
              id="ntc-sh-source"
              value={shSource}
              onChange={(e) => setShSource(e.target.value as ShSource)}
              className={fieldCls}
            >
              <option value="fit">{t("Fit A, B and C from three (R, T) points")}</option>
              <option value="coefficients">{t("Enter A, B and C directly")}</option>
            </select>
          </div>
          {shSource === "fit" && (
            <button
              type="button"
              onClick={() => setPoints(DEFAULT_POINTS)}
              className="rounded-btn border border-line-strong px-3 py-2 text-xs text-mute transition-colors hover:text-ink"
            >
              {t("Load datasheet points")}
            </button>
          )}
        </div>

        {shSource === "fit" ? (
          <>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {points.map((p, i) => (
                <div key={i} className="rounded-btn border border-line-soft p-3">
                  <div className="text-[11px] uppercase tracking-wide text-mute">
                    {t("Point {n}").replace("{n}", String(i + 1))}
                  </div>
                  <label htmlFor={`ntc-p${i}-t`} className="sr-only">
                    {t("Temperature (°C)")}
                  </label>
                  <input
                    id={`ntc-p${i}-t`}
                    value={p.celsius}
                    onChange={(e) => setPoint(i, "celsius", e.target.value)}
                    placeholder="°C"
                    spellCheck={false}
                    className={fieldCls}
                  />
                  <label htmlFor={`ntc-p${i}-r`} className="sr-only">
                    {t("Resistance (Ω)")}
                  </label>
                  <input
                    id={`ntc-p${i}-r`}
                    value={p.ohms}
                    onChange={(e) => setPoint(i, "ohms", e.target.value)}
                    placeholder="Ω"
                    spellCheck={false}
                    className={fieldCls}
                  />
                </div>
              ))}
            </div>
            {fit && !fit.ok && (
              <p className="mt-3 font-mono text-xs text-err" role="alert">
                {fit.error}
              </p>
            )}
            {tableCheck?.ok && (
              <p className="mt-3 font-mono text-[11px] text-mute">
                {t(
                  "Checked against all {n} rows of the datasheet table: worst {worst} °C at {at} °C, RMS {rms} °C.",
                )
                  .replace("{n}", String(tableCheck.count))
                  .replace("{worst}", fmt(tableCheck.maxAbsC, 4))
                  .replace("{at}", fmt(tableCheck.worstCelsius, 0))
                  .replace("{rms}", fmt(tableCheck.rmsC, 4))}
              </p>
            )}
          </>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["a", "b", "c"] as const).map((key) => (
              <div key={key}>
                <label htmlFor={`ntc-coef-${key}`} className={labelCls}>
                  {key.toUpperCase()}
                </label>
                <input
                  id={`ntc-coef-${key}`}
                  value={coefText[key]}
                  onChange={(e) => setCoefText((prev) => ({ ...prev, [key]: e.target.value }))}
                  spellCheck={false}
                  className={fieldCls}
                />
              </div>
            ))}
          </div>
        )}

        {sh.error && (
          <p className="mt-3 font-mono text-xs text-err" role="alert">
            {sh.error}
          </p>
        )}

        {deviation?.result.ok && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-mute">
              {t("What the Beta equation costs from {lo} °C to {hi} °C")
                .replace("{lo}", fmt(deviation.lo, 1))
                .replace("{hi}", fmt(deviation.hi, 1))}
            </div>
            <div className="mt-2 overflow-x-auto rounded-btn border border-line-soft">
              <table className="w-full text-left font-mono text-[12px]">
                <thead>
                  <tr className="border-b border-line-soft text-[10px] uppercase tracking-wide text-mute">
                    <th className="px-3 py-1.5 font-medium">{t("Temperature")}</th>
                    <th className="px-3 py-1.5 font-medium">{t("Resistance")}</th>
                    <th className="px-3 py-1.5 font-medium">{t("Beta reads")}</th>
                    <th className="px-3 py-1.5 font-medium">{t("Error")}</th>
                  </tr>
                </thead>
                <tbody>
                  {deviation.result.rows.map((row) => (
                    <tr key={row.celsius} className="border-b border-line-soft last:border-0">
                      <td className="px-3 py-1.5 text-body">{fmt(row.celsius, 1)} °C</td>
                      <td className="px-3 py-1.5 text-body">{ohms(row.ohms)}</td>
                      <td className="px-3 py-1.5 text-body">{fmt(row.betaCelsius, 2)} °C</td>
                      <td
                        className={`px-3 py-1.5 ${Math.abs(row.deviationC) >= 1 ? "text-err" : "text-ink"}`}
                      >
                        {row.deviationC >= 0 ? "+" : ""}
                        {fmt(row.deviationC, 2)} °C
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-mute">
              {t(
                "Steinhart-Hart is treated as the reference here. The error column is what a Beta-only conversion would read at the same resistance — near zero at T0 and at the second temperature B was measured at, and growing at both ends of the range.",
              )}
            </p>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      <details className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          {t("Voltage divider and ADC counts (optional)")}
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="ntc-topology" className={labelCls}>
              {t("Topology")}
            </label>
            <select
              id="ntc-topology"
              value={topology}
              onChange={(e) => setTopology(e.target.value as NtcDividerTopology)}
              className={fieldCls}
            >
              <option value="pulldown">{t("Series resistor to supply, thermistor to ground")}</option>
              <option value="pullup">{t("Thermistor to supply, series resistor to ground")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="ntc-series" className={labelCls}>
              {t("Series resistor (Ω)")}
            </label>
            <input
              id="ntc-series"
              value={seriesText}
              onChange={(e) => setSeriesText(e.target.value)}
              spellCheck={false}
              className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor="ntc-supply" className={labelCls}>
              {t("Supply (V)")}
            </label>
            <input
              id="ntc-supply"
              value={supplyText}
              onChange={(e) => setSupplyText(e.target.value)}
              spellCheck={false}
              className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor="ntc-bits" className={labelCls}>
              {t("ADC resolution (bits)")}
            </label>
            <input
              id="ntc-bits"
              value={bitsText}
              onChange={(e) => setBitsText(e.target.value)}
              spellCheck={false}
              className={fieldCls}
            />
          </div>
        </div>
        {divider && divider.result.ok && (
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <ResultCard label={t("Thermistor resistance")} value={ohms(divider.ohms)} />
            <ResultCard label={t("Divider output")} value={`${fmt(divider.result.volts, 5)} V`} />
            {divider.result.counts !== undefined && (
              <ResultCard
                label={t("ADC count")}
                value={`${divider.result.counts} / ${divider.result.fullScaleCounts}`}
              />
            )}
          </div>
        )}
        {divider && !divider.result.ok && (
          <p className="mt-3 font-mono text-xs text-err" role="alert">
            {divider.result.error}
          </p>
        )}
        <p className="mt-3 text-xs text-mute">
          {t(
            "Counts assume the ADC reference is the same rail as the divider supply (ratiometric) and that full scale is the all-ones code: ratio = count / (2^N − 1). Self-heating is not modelled — the divider current warms the thermistor, which is a real error at low series resistance.",
          )}
        </p>
      </details>
    </div>
  );
}
