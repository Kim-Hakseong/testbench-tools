"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyBnrScale,
  parseArinc429,
  ssmMeaning,
  type Arinc429Format,
  type LabelBitOrder,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

const FORMATS: { id: Arinc429Format | "none"; label: string }[] = [
  { id: "none", label: "Not specified" },
  { id: "bnr", label: "BNR" },
  { id: "bcd", label: "BCD" },
  { id: "discrete", label: "Discrete" },
];

const ORDERS: { id: LabelBitOrder; label: string }[] = [
  { id: "bit1-msb", label: "MSB at bit 1" },
  { id: "bit8-msb", label: "MSB at bit 8" },
];

/** Split the 32 bits into the fields, bit 32 first, for the strip below. */
function fieldSpans(bits: string) {
  return [
    { name: "P", cls: "text-err", text: bits.slice(0, 1) },
    { name: "SSM", cls: "text-ok", text: bits.slice(1, 3) },
    { name: "Data 29-11", cls: "text-ink", text: bits.slice(3, 22) },
    { name: "SDI", cls: "text-mute", text: bits.slice(22, 24) },
    { name: "Label 8-1", cls: "text-body", text: bits.slice(24, 32) },
  ];
}

export function Arinc429Tool() {
  const t = useToolText();
  const [text, setText] = useState("0xE00640A1");
  const [format, setFormat] = useState<Arinc429Format | "none">("none");
  const [order, setOrder] = useState<LabelBitOrder>("bit1-msb");
  const [scaleText, setScaleText] = useState("512");
  const [debounced, setDebounced] = useState(text);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(text), 150);
    return () => clearTimeout(h);
  }, [text]);

  const parsed = useMemo(
    () =>
      parseArinc429(debounced, {
        labelBitOrder: order,
        ...(format === "none" ? {} : { format }),
      }),
    [debounced, order, format],
  );

  const w = parsed.ok ? parsed.word : null;

  const scaled = useMemo(() => {
    if (!w) return null;
    const fs = Number(scaleText);
    if (!Number.isFinite(fs) || fs === 0) return null;
    return applyBnrScale(w.bnr.signed, fs);
  }, [w, scaleText]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label htmlFor="a429-word" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("32-bit word (hex)")}
            </label>
            <input
              id="a429-word"
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

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Label bit order")}
            </span>
            <div className="mt-1.5 flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Label bit order")}>
              {ORDERS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  aria-selected={order === o.id}
                  onClick={() => setOrder(o.id)}
                  className={`flex-1 rounded-[6px] px-2 py-1.5 text-sm transition-colors ${
                    order === o.id ? "bg-elevated text-ink" : "text-mute hover:text-body"
                  }`}
                >
                  {t(o.label)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="a429-format" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Data format (from your ICD)")}
            </label>
            <select
              id="a429-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as Arinc429Format | "none")}
              className={`${fieldCls} border-line-strong`}
            >
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {t(f.label)}
                </option>
              ))}
            </select>
          </div>

          {(format === "bnr" || format === "none") && (
            <div>
              <label htmlFor="a429-scale" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("BNR full-scale range (from your ICD)")}
              </label>
              <input
                id="a429-scale"
                value={scaleText}
                onChange={(e) => setScaleText(e.target.value)}
                spellCheck={false}
                className={`${fieldCls} border-line-strong`}
              />
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {w && (
            <>
              <ResultCard label={t("Label (octal)")} value={w.label.octal} size="lg" />
              <ResultCard label={t("SDI")} value={String(w.sdi)} />
              <ResultCard
                label={t("SSM")}
                value={
                  w.ssmMeaning
                    ? `${w.ssm} — ${w.ssmMeaning}`
                    : `${w.ssm} — BNR: ${ssmMeaning(w.ssm, "bnr")} · BCD: ${ssmMeaning(w.ssm, "bcd")}`
                }
              />
              <ResultCard
                label={t("Parity (odd, bit 32)")}
                value={
                  w.parityOk
                    ? `${w.parityBit} — ${t("valid")}`
                    : `${w.parityBit} — ${t("expected")} ${w.parityExpected}`
                }
              />
              <ResultCard
                label={t("BNR value")}
                value={
                  scaled === null
                    ? String(w.bnr.signed)
                    : `${w.bnr.signed} raw → ${Number(scaled.toPrecision(9))}`
                }
              />
              <ResultCard
                label={t("BCD digits")}
                value={
                  w.bcd.value === null
                    ? `${w.bcd.digits.join(" ")} — ${t("invalid digit")}`
                    : `${w.bcd.digits.join(" ")} → ${w.bcd.value}`
                }
              />
            </>
          )}
        </div>
      </div>

      {w && (
        <p
          className={`mt-4 rounded-btn border px-3 py-2 text-xs ${
            w.parityOk ? "border-line-soft text-mute" : "border-err text-err"
          }`}
          role="status"
        >
          {w.parityOk
            ? t("Parity checks out.")
            : t("Parity fails — this word would be rejected on the bus.")}{" "}
          {t("Read the other way round the label is")} <strong>{w.label.octalAlternate}</strong>
          {t(" — sources number the label bits in opposite directions, so check which your tool means.")}
        </p>
      )}

      {w && (
        <div className="mt-3 overflow-x-auto rounded-btn border border-line-soft bg-elevated p-3">
          <div className="text-[11px] uppercase tracking-wide text-mute">
            {t("Bits 32 → 1")}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
            {fieldSpans(w.bits).map((f) => (
              <span key={f.name} className={f.cls}>
                <span className="mr-1 text-[10px] uppercase text-mute">{f.name}</span>
                {f.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
