"use client";

import { useEffect, useMemo, useState } from "react";
import {
  convertSeries,
  deviceRadix,
  MELSEC_SERIES,
  nextAddresses,
  parseMelsecAddress,
  radixBase,
  type MelsecSeries,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

const RADIX_LABEL: Record<string, string> = {
  octal: "Octal (base 8)",
  decimal: "Decimal (base 10)",
  hexadecimal: "Hexadecimal (base 16)",
};

export function MelsecAddressTool() {
  const [series, setSeries] = useState<MelsecSeries>("fx5");
  const [text, setText] = useState("X20");
  const [debounced, setDebounced] = useState(text);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(text), 150);
    return () => clearTimeout(h);
  }, [text]);

  const parsed = useMemo(() => parseMelsecAddress(series, debounced), [series, debounced]);
  const address = parsed.ok ? parsed.address : null;

  const otherSeries: MelsecSeries = series === "fx5" ? "iq-r" : "fx5";
  const otherLabel = MELSEC_SERIES.find((s) => s.id === otherSeries)!.label;

  const converted = useMemo(() => {
    if (!address) return null;
    return convertSeries(address, otherSeries);
  }, [address, otherSeries]);

  const sameTextElsewhere = useMemo(() => {
    if (!address) return null;
    const result = parseMelsecAddress(otherSeries, debounced);
    return result.ok ? result.address : null;
  }, [address, otherSeries, debounced]);

  const run = useMemo(() => (address ? nextAddresses(address, 8) : []), [address]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-mute">CPU series</span>
            <div className="mt-1.5 flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="CPU series">
              {MELSEC_SERIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={series === s.id}
                  onClick={() => setSeries(s.id)}
                  className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${
                    series === s.id ? "bg-elevated text-ink" : "text-mute hover:text-body"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-mute">
              X / Y are {deviceRadix(series, "X")} on this series
            </p>
          </div>

          <div>
            <label htmlFor="melsec-addr" className="text-xs font-medium uppercase tracking-wide text-mute">
              Device address (e.g. X20, D100, M50, W1F)
            </label>
            <input
              id="melsec-addr"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              className={`${fieldCls} ${parsed.ok ? "border-line-strong" : "border-err"}`}
            />
            {!parsed.ok && (
              <p className="mt-1.5 font-mono text-xs text-err" role="alert">
                {parsed.error}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          {address && (
            <>
              <ResultCard label="Device number (decimal)" value={String(address.index)} size="lg" />
              <ResultCard label="Device" value={address.symbol} />
              <ResultCard label="Written in" value={RADIX_LABEL[address.radix] ?? address.radix} />
              <ResultCard
                label={`Same point on ${otherLabel}`}
                value={converted && converted.ok ? converted.text : "— not on that series"}
              />
              <ResultCard
                label="Binary"
                value={address.index.toString(2)}
              />
              <ResultCard
                label="Base"
                value={`${radixBase(address.radix)} — digits ${
                  address.radix === "octal" ? "0-7" : address.radix === "decimal" ? "0-9" : "0-9 A-F"
                }`}
              />
            </>
          )}
        </div>
      </div>

      {address && sameTextElsewhere && sameTextElsewhere.index !== address.index && (
        <p className="mt-4 rounded-btn border border-err px-3 py-2 font-mono text-xs text-err" role="status">
          Careful — &ldquo;{address.symbol}
          {address.numberText}&rdquo; is also valid on {otherLabel}, but there it means point{" "}
          {sameTextElsewhere.index}, not {address.index}.
        </p>
      )}

      {address && run.length > 0 && (
        <div className="mt-4 rounded-btn border border-line-soft bg-elevated p-3">
          <div className="text-[11px] uppercase tracking-wide text-mute">Next 8 consecutive points</div>
          <p className="mt-1.5 break-words font-mono text-sm text-ink">{run.join("  ·  ")}</p>
        </div>
      )}
    </div>
  );
}
