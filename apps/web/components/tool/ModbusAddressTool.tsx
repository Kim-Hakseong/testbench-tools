"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ENTITY_LABEL,
  modbusAddressViews,
  parseDataModelAddress,
  type ModbusEntity,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

type InputKind = "data-model" | "protocol";

export function ModbusAddressTool() {
  const t = useToolText();
  const [kind, setKind] = useState<InputKind>("data-model");
  const [text, setText] = useState("40011");
  const [entity, setEntity] = useState<ModbusEntity>("holding-register");
  const [d, setD] = useState(text);

  useEffect(() => {
    const h = setTimeout(() => setD(text), 150);
    return () => clearTimeout(h);
  }, [text]);

  const views = useMemo(() => {
    const s = d.trim();
    if (kind === "data-model") return parseDataModelAddress(s);
    if (!/^\d{1,5}$/.test(s)) return null;
    return modbusAddressViews(entity, Number(s));
  }, [kind, d, entity]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Input kind")}>
            {([["data-model", "4xxxx notation"], ["protocol", "0-based + type"]] as const).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${kind === k ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
                {t(label)}
              </button>
            ))}
          </div>

          {kind === "protocol" && (
            <div>
              <label htmlFor="ma-entity" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Entity type")}</label>
              <select id="ma-entity" value={entity} onChange={(e) => setEntity(e.target.value as ModbusEntity)} className={`${fieldCls} border-line-strong`}>
                {(Object.keys(ENTITY_LABEL) as ModbusEntity[]).map((e) => (
                  <option key={e} value={e}>{ENTITY_LABEL[e]}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="ma-addr" className="text-xs font-medium uppercase tracking-wide text-mute">
              {kind === "data-model" ? t("Data-model address (e.g. 40011, 30001, 100005)") : t("Protocol address (0-based, 0…65535)")}
            </label>
            <input id="ma-addr" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
              className={`${fieldCls} ${views === null ? "border-err" : "border-line-strong"}`} />
            {views === null && d.trim() !== "" && (
              <p className="mt-1.5 font-mono text-xs text-err" role="alert">
                {kind === "data-model"
                  ? t("Use 5 or 6 digits starting with 0, 1, 3 or 4.")
                  : t("Enter an integer 0…65535.")}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          {views && (
            <>
              <ResultCard label={t("Entity")} value={ENTITY_LABEL[views.entity]} />
              <ResultCard label={t("Protocol address (on the wire, 0-based)")} value={String(views.protocol)} size="lg" />
              <ResultCard label={t("1-based address")} value={String(views.oneBased)} />
              <ResultCard label={t("5-digit notation")} value={views.fiveDigit ?? t("— (offset > 9998)")} />
              <ResultCard label={t("6-digit notation")} value={views.sixDigit} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
