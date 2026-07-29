"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatSpec,
  halfDigitMaxCounts,
  instrumentPreset,
  INSTRUMENT_PRESETS,
  measurementAccuracy,
  type AccuracySpec,
  type CountBasis,
  type InstrumentPreset,
  type InstrumentRangePreset,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border border-line-strong bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

/** Specs quote either percent or ppm for the proportional terms, never both. */
type ProportionalUnit = "percent" | "ppm";

/** Which question the user can answer about their display. */
type BasisKind = "countsFullScale" | "digits" | "resolution";

const BASIS_LABELS: { id: BasisKind; label: string }[] = [
  { id: "countsFullScale", label: "Display counts at full scale (6000, 20000…)" },
  { id: "digits", label: "Display digits (3.5, 4.5, 5.5…)" },
  { id: "resolution", label: "Resolution — value of one count" },
];

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

/** Optional numeric field: blank means "this term is not in my spec". */
function optional(s: string): number | undefined {
  const v = num(s);
  return v === null ? undefined : v;
}

/**
 * Six significant figures, in plain notation while that stays readable.
 *
 * Uncertainties routinely land around 1e-4 of the reading, and exponential
 * notation there makes the breakdown harder to compare at a glance than the
 * extra zeros do.
 */
function fmt(v: number, sig = 6): string {
  if (!Number.isFinite(v)) return "—";
  if (v !== 0 && (Math.abs(v) < 1e-6 || Math.abs(v) >= 1e7)) return v.toExponential(4);
  return Number(v.toPrecision(sig)).toString();
}

function withUnit(v: number, unit: string): string {
  return unit ? `${fmt(v)} ${unit}` : fmt(v);
}

export function AccuracyTool() {
  const t = useToolText();

  const [reading, setReading] = useState("4.7");
  const [range, setRange] = useState("10");
  const [unit, setUnit] = useState("V");

  const [propUnit, setPropUnit] = useState<ProportionalUnit>("percent");
  const [ofReading, setOfReading] = useState("0.0035");
  const [ofRange, setOfRange] = useState("0.0005");
  const [counts, setCounts] = useState("");
  const [offset, setOffset] = useState("");

  const [basisKind, setBasisKind] = useState<BasisKind>("countsFullScale");
  const [basisValue, setBasisValue] = useState("6000");

  /**
   * Which sourced preset filled the fields, or "" for manual entry.
   *
   * Editing any specification field clears it: once a digit has been changed
   * the panel is no longer showing that instrument's published spec, and
   * leaving the model name on screen would be a quiet lie. Changing the
   * *reading* deliberately does not clear it — sweeping the reading against a
   * fixed spec is the entire point of the tool.
   */
  const [presetId, setPresetId] = useState("");
  const [presetRange, setPresetRange] = useState(0);

  const [d, setD] = useState({ reading, range, ofReading, ofRange, counts, offset, basisValue });

  useEffect(() => {
    const h = setTimeout(
      () => setD({ reading, range, ofReading, ofRange, counts, offset, basisValue }),
      150,
    );
    return () => clearTimeout(h);
  }, [reading, range, ofReading, ofRange, counts, offset, basisValue]);

  /** Wrap a spec-field setter so typing drops back to manual entry. */
  function edited<T>(set: (v: T) => void): (v: T) => void {
    return (v: T) => {
      setPresetId("");
      set(v);
    };
  }

  function applyPreset(preset: InstrumentPreset, row: InstrumentRangePreset) {
    setUnit(preset.unit);
    setRange(String(row.range));
    setPropUnit("percent");
    setOfReading(row.spec.percentOfReading === undefined ? "" : String(row.spec.percentOfReading));
    setOfRange(row.spec.percentOfRange === undefined ? "" : String(row.spec.percentOfRange));
    setCounts(row.spec.counts === undefined ? "" : String(row.spec.counts));
    setOffset("");
    if (row.countBasis?.kind === "resolution") {
      setBasisKind("resolution");
      setBasisValue(String(row.countBasis.resolution));
    }
  }

  function selectInstrument(id: string) {
    setPresetId(id);
    setPresetRange(0);
    const preset = instrumentPreset(id);
    if (preset) applyPreset(preset, preset.ranges[0]!);
  }

  function selectPresetRange(index: number) {
    setPresetRange(index);
    const preset = instrumentPreset(presetId);
    if (preset?.ranges[index]) applyPreset(preset, preset.ranges[index]!);
  }

  const activePreset = instrumentPreset(presetId);
  const activeRow = activePreset?.ranges[presetRange];

  const spec = useMemo((): AccuracySpec => {
    const rdg = optional(d.ofReading);
    const rng = optional(d.ofRange);
    return {
      percentOfReading: propUnit === "percent" ? rdg : undefined,
      ppmOfReading: propUnit === "ppm" ? rdg : undefined,
      percentOfRange: propUnit === "percent" ? rng : undefined,
      ppmOfRange: propUnit === "ppm" ? rng : undefined,
      counts: optional(d.counts),
      offset: optional(d.offset),
    };
  }, [d.ofReading, d.ofRange, d.counts, d.offset, propUnit]);

  const countBasis = useMemo((): CountBasis | undefined => {
    const v = num(d.basisValue);
    if (v === null) return undefined;
    if (basisKind === "countsFullScale") return { kind: "countsFullScale", countsFullScale: v };
    if (basisKind === "digits") return { kind: "digits", digits: v };
    return { kind: "resolution", resolution: v };
  }, [basisKind, d.basisValue]);

  const usesCounts = (spec.counts ?? 0) > 0;

  const result = useMemo(() => {
    const r = num(d.reading);
    const rng = num(d.range);
    if (r === null || rng === null) return null;
    return measurementAccuracy({ reading: r, range: rng, spec, countBasis });
  }, [d.reading, d.range, spec, countBasis]);

  const specText = formatSpec(spec, unit);
  const maxCounts = basisKind === "digits" ? halfDigitMaxCounts(num(d.basisValue) ?? Number.NaN) : null;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* ------------------------------------------------------------ input */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="acc-preset" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Instrument")}
              </label>
              <select id="acc-preset" value={presetId}
                onChange={(e) => selectInstrument(e.target.value)} className={fieldCls}>
                <option value="">{t("Manual entry — type your spec")}</option>
                {INSTRUMENT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${p.vendor} ${p.model} — ${p.functionName}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="acc-preset-range" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Preset range")}
              </label>
              <select id="acc-preset-range" value={String(presetRange)} disabled={!activePreset}
                onChange={(e) => selectPresetRange(Number(e.target.value))}
                className={`${fieldCls} disabled:opacity-40`}>
                {activePreset ? (
                  activePreset.ranges.map((r, i) => (
                    <option key={r.label} value={String(i)}>{r.label}</option>
                  ))
                ) : (
                  <option value="0">—</option>
                )}
              </select>
            </div>
          </div>

          {activePreset && (
            <div className="rounded-btn border border-line-soft px-3 py-2 text-[11px] leading-relaxed text-mute">
              <span className="text-body">{activePreset.conditions}</span>
              <br />
              {activePreset.source}
              {activeRow?.note && (
                <>
                  <br />
                  <span className="text-warn">{activeRow.note}</span>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label htmlFor="acc-reading" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Reading")}
              </label>
              <input id="acc-reading" value={reading} onChange={(e) => setReading(e.target.value)}
                spellCheck={false} inputMode="decimal" className={fieldCls} />
            </div>
            <div className="col-span-1">
              <label htmlFor="acc-range" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Range (full scale)")}
              </label>
              <input id="acc-range" value={range} onChange={(e) => edited(setRange)(e.target.value)}
                spellCheck={false} inputMode="decimal" className={fieldCls} />
            </div>
            <div className="col-span-1">
              <label htmlFor="acc-unit" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Unit")}
              </label>
              <input id="acc-unit" value={unit} onChange={(e) => edited(setUnit)(e.target.value)}
                spellCheck={false} maxLength={6} className={fieldCls} />
            </div>
          </div>

          <div className="rounded-btn border border-line-soft p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Accuracy specification")}
              </span>
              <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist"
                aria-label={t("Proportional term unit")}>
                {(["percent", "ppm"] as const).map((u) => (
                  <button key={u} type="button" role="tab" aria-selected={propUnit === u}
                    onClick={() => edited(setPropUnit)(u)}
                    className={`rounded-[6px] px-2.5 py-1 font-mono text-xs transition-colors ${
                      propUnit === u ? "bg-elevated text-ink" : "text-mute hover:text-body"
                    }`}>
                    {u === "percent" ? "%" : "ppm"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="acc-rdg" className="text-[11px] text-mute">
                  {propUnit === "percent" ? t("% of reading") : t("ppm of reading")}
                </label>
                <input id="acc-rdg" value={ofReading} onChange={(e) => edited(setOfReading)(e.target.value)}
                  spellCheck={false} inputMode="decimal" className={fieldCls} />
              </div>
              <div>
                <label htmlFor="acc-rng" className="text-[11px] text-mute">
                  {propUnit === "percent" ? t("% of range") : t("ppm of range")}
                </label>
                <input id="acc-rng" value={ofRange} onChange={(e) => edited(setOfRange)(e.target.value)}
                  spellCheck={false} inputMode="decimal" className={fieldCls} />
              </div>
              <div>
                <label htmlFor="acc-counts" className="text-[11px] text-mute">
                  {t("Counts / digits")}
                </label>
                <input id="acc-counts" value={counts} onChange={(e) => edited(setCounts)(e.target.value)}
                  spellCheck={false} inputMode="decimal" placeholder="3" className={fieldCls} />
              </div>
              <div>
                <label htmlFor="acc-offset" className="text-[11px] text-mute">
                  {t("Fixed offset")}
                </label>
                <input id="acc-offset" value={offset} onChange={(e) => edited(setOffset)(e.target.value)}
                  spellCheck={false} inputMode="decimal" placeholder={unit || "0"} className={fieldCls} />
              </div>
            </div>

            <p className="mt-2 font-mono text-[11px] text-mute">{specText}</p>
          </div>

          {/* A counts term is meaningless until one count has a size. */}
          {usesCounts && (
            <div className="rounded-btn border border-line-soft p-3">
              <label htmlFor="acc-basis" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Size one count from")}
              </label>
              <select id="acc-basis" value={basisKind}
                onChange={(e) => edited(setBasisKind)(e.target.value as BasisKind)}
                className={fieldCls}>
                {BASIS_LABELS.map((b) => (
                  <option key={b.id} value={b.id}>{t(b.label)}</option>
                ))}
              </select>
              <input id="acc-basis-value" value={basisValue} onChange={(e) => edited(setBasisValue)(e.target.value)}
                spellCheck={false} inputMode="decimal"
                aria-label={t("Size one count from")} className={fieldCls} />
              {maxCounts !== null && (
                <p className="mt-1.5 font-mono text-[11px] text-mute">
                  {t("Over-ranges to {n} counts before switching range.").replace(
                    "{n}",
                    maxCounts.toLocaleString("en-US"),
                  )}
                </p>
              )}
            </div>
          )}

          {result && !result.ok && (
            <p className="font-mono text-xs text-err" role="alert">{result.error}</p>
          )}
          {result?.ok && result.specEmpty && (
            <p className="font-mono text-xs text-warn" role="status">
              {t("Enter at least one term of your instrument's accuracy specification.")}
            </p>
          )}
        </div>

        {/* ----------------------------------------------------------- output */}
        <div className="space-y-2.5">
          {result?.ok && !result.specEmpty && (
            <>
              <ResultCard label={t("Uncertainty (±)")} value={withUnit(result.uncertainty, unit)} size="lg" />
              <ResultCard
                label={t("Interval")}
                value={`${fmt(result.min)} … ${fmt(result.max)}${unit ? ` ${unit}` : ""}`}
              />
              <ResultCard
                label={t("As % of reading")}
                value={result.percentOfReading === null ? "—" : `${fmt(result.percentOfReading, 4)} %`}
              />
              <ResultCard
                label={t("As ppm of reading")}
                value={result.ppmOfReading === null ? "—" : `${fmt(result.ppmOfReading, 4)} ppm`}
              />
            </>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- breakdown */}
      {result?.ok && !result.specEmpty && (
        <div className="mt-5">
          <div className="text-xs font-medium uppercase tracking-wide text-mute">
            {t("Where the uncertainty comes from")}
          </div>
          <div className="mt-2 overflow-x-auto rounded-btn border border-line-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                  <th className="px-3 py-2 font-medium">{t("Term")}</th>
                  <th className="px-3 py-2 font-medium">{t("Contribution")}</th>
                  <th className="px-3 py-2 font-medium">{t("Share")}</th>
                </tr>
              </thead>
              <tbody>
                {result.terms.map((term) => (
                  <tr key={term.id} className="border-b border-line-soft font-mono text-[13px] last:border-0">
                    <td className="px-3 py-2 text-ink">
                      {term.label}
                      {term.fixed && (
                        <span className="ml-2 text-[11px] text-mute">{t("does not shrink with the reading")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-body">{withUnit(term.value, unit)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={term === result.dominant ? "text-warn" : "text-mute"}>
                          {Math.round(term.fraction * 100)} %
                        </span>
                        <span className="h-1.5 min-w-[3rem] flex-1 rounded-full bg-well">
                          <span
                            className={`block h-1.5 rounded-full ${term.fixed ? "bg-warn/60" : "bg-ok/60"}`}
                            style={{ width: `${Math.max(term.fraction * 100, 1)}%` }}
                          />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 font-mono text-xs text-mute">
            {t("Reading is {p} % of full scale.").replace("{p}", fmt(result.readingPercentOfRange, 4))}
            {result.countSize !== null &&
              ` · ${t("one count = {v}").replace("{v}", withUnit(result.countSize, unit))}`}
            {result.crossoverReading !== null &&
              ` · ${t("terms cross over at {v}").replace("{v}", withUnit(result.crossoverReading, unit))}`}
          </p>

          {result.readingExceedsRange && (
            <p className="mt-2 rounded-btn border border-err/50 px-3 py-2 text-xs text-err" role="alert">
              {t("The reading is past full scale, so the published specification no longer applies to it.")}
            </p>
          )}

          {result.fixedExceedsReading && !result.readingExceedsRange && (
            <p className="mt-2 rounded-btn border border-warn/50 px-3 py-2 text-xs text-warn" role="status">
              {t(
                "The terms that do not depend on the reading now make up more than half the error. This is the small-value-on-a-large-range case: the same reading taken on the smallest range that still fits it will have a smaller absolute uncertainty.",
              )}
            </p>
          )}

          <p className="mt-2 rounded-btn border border-line-soft px-3 py-2 text-xs text-mute" role="status">
            {t(
              "Terms are added, not root-sum-squared, because a published accuracy specification is a single guaranteed limit of error rather than a set of independent random contributions. It also assumes the instrument is inside its stated calibration interval and temperature window.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
