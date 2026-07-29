"use client";

import { useMemo, useState } from "react";
import {
  buildArinc429,
  parseArinc429,
  SSM_BCD,
  SSM_BNR,
  SSM_DISCRETE,
  type Arinc429Format,
  type LabelBitOrder,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border border-line-strong bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

const ORDERS: { id: LabelBitOrder; label: string }[] = [
  { id: "bit1-msb", label: "MSB at bit 1" },
  { id: "bit8-msb", label: "MSB at bit 8" },
];

const FORMATS: { id: Arinc429Format; label: string }[] = [
  { id: "bnr", label: "BNR" },
  { id: "bcd", label: "BCD" },
  { id: "discrete", label: "Discrete" },
];

const SSM_TABLE: Record<Arinc429Format, readonly string[]> = {
  bnr: SSM_BNR,
  bcd: SSM_BCD,
  discrete: SSM_DISCRETE,
};

export function Arinc429BuilderTool() {
  const t = useToolText();
  const [labelOctal, setLabelOctal] = useState("205");
  const [order, setOrder] = useState<LabelBitOrder>("bit1-msb");
  const [format, setFormat] = useState<Arinc429Format>("bnr");
  const [sdi, setSdi] = useState("2");
  const [ssm, setSsm] = useState("3");
  const [dataText, setDataText] = useState("400");
  const [bcdText, setBcdText] = useState("2 5 7 8 6");

  const built = useMemo(() => {
    const common = {
      labelOctal: labelOctal.trim(),
      labelBitOrder: order,
      sdi: Number(sdi),
      ssm: Number(ssm),
    };
    if (format === "bcd") {
      const digits = bcdText
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      if (digits.some((d) => !Number.isInteger(d))) {
        return { ok: false as const, error: "BCD digits must be whole numbers" };
      }
      return buildArinc429({ ...common, bcdDigits: digits });
    }
    const value = Number(dataText);
    if (!Number.isInteger(value)) {
      return { ok: false as const, error: "Data must be a whole number" };
    }
    return buildArinc429({ ...common, data: value });
  }, [labelOctal, order, format, sdi, ssm, dataText, bcdText]);

  // Round-trip the built word so the panel shows what a decoder will see.
  const back = useMemo(() => {
    if (!built.ok) return null;
    const r = parseArinc429(built.word.raw, { labelBitOrder: order, format });
    return r.ok ? r.word : null;
  }, [built, order, format]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a429b-label" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Label (octal)")}
              </label>
              <input id="a429b-label" value={labelOctal} onChange={(e) => setLabelOctal(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="a429b-sdi" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("SDI")}
              </label>
              <select id="a429b-sdi" value={sdi} onChange={(e) => setSdi(e.target.value)} className={fieldCls}>
                {[0, 1, 2, 3].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-mute">{t("Label bit order")}</span>
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
            <label htmlFor="a429b-format" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Data format (from your ICD)")}
            </label>
            <select
              id="a429b-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as Arinc429Format)}
              className={fieldCls}
            >
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>{t(f.label)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="a429b-ssm" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("SSM")}
            </label>
            <select id="a429b-ssm" value={ssm} onChange={(e) => setSsm(e.target.value)} className={fieldCls}>
              {SSM_TABLE[format].map((name, i) => (
                <option key={name} value={i}>{`${i} — ${name}`}</option>
              ))}
            </select>
          </div>

          {format === "bcd" ? (
            <div>
              <label htmlFor="a429b-bcd" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("BCD digits (most significant first)")}
              </label>
              <input id="a429b-bcd" value={bcdText} onChange={(e) => setBcdText(e.target.value)} className={fieldCls} />
            </div>
          ) : (
            <div>
              <label htmlFor="a429b-data" className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Data field (bits 29-11, signed)")}
              </label>
              <input id="a429b-data" value={dataText} onChange={(e) => setDataText(e.target.value)} className={fieldCls} />
            </div>
          )}

          {!built.ok && (
            <p className="font-mono text-xs text-err" role="alert">
              {built.error}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {built.ok && (
            <>
              <ResultCard label={t("Word (hex)")} value={built.word.hex} size="lg" />
              <ResultCard label={t("Parity (odd, bit 32)")} value={String(built.word.parityBit)} />
              {back && (
                <>
                  <ResultCard label={t("Bits 32 → 1")} value={back.bits} />
                  <ResultCard
                    label={t("Decodes back as")}
                    value={`${t("Label (octal)")} ${back.label.octal} · SDI ${back.sdi} · SSM ${back.ssm}`}
                  />
                  <ResultCard
                    label={t("Read the other way round the label is")}
                    value={back.label.octalAlternate}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {built.ok && (
        <p className="mt-4 rounded-btn border border-line-soft px-3 py-2 text-xs text-mute" role="status">
          {t("Parity is computed here, so a word with the wrong parity cannot be produced.")}
        </p>
      )}
    </div>
  );
}
