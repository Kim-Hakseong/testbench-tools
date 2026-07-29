"use client";

import { useEffect, useMemo, useState } from "react";
import {
  dbFromPowerRatio,
  dbFromVoltageRatio,
  dbmFromWatts,
  powerRatioFromDb,
  voltageRatioFromDb,
  vrmsFromPower,
  wattsFromDbm,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

type Mode = "dbm" | "power" | "voltage";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) ? null : v;
}

function fmt(x: number): string {
  if (x !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e6)) return x.toExponential(4);
  return x.toPrecision(6).replace(/\.?0+$/, "");
}

export function DbDbmTool() {
  const t = useToolText();
  const [mode, setMode] = useState<Mode>("dbm");
  const [form, setForm] = useState({ dbm: "0", ratio: "2", db: "3", z: "50", dir: "toDb" as "toDb" | "toRatio" });
  const [d, setD] = useState(form);

  useEffect(() => {
    const h = setTimeout(() => setD(form), 150);
    return () => clearTimeout(h);
  }, [form]);

  const dbmV = num(d.dbm);
  const ratioV = num(d.ratio);
  const dbV = num(d.db);
  const zV = num(d.z);

  type DbResult =
    | { kind: "dbm"; w: number; mw: number; vrms: number }
    | { kind: "db"; db: number }
    | { kind: "ratio"; ratio: number }
    | null;

  const result = useMemo((): DbResult => {
    if (mode === "dbm") {
      if (dbmV === null || zV === null || zV <= 0) return null;
      const w = wattsFromDbm(dbmV);
      return { kind: "dbm", w, mw: w * 1000, vrms: vrmsFromPower(w, zV) };
    }
    if (d.dir === "toDb") {
      if (ratioV === null || ratioV <= 0) return null;
      return { kind: "db", db: mode === "power" ? dbFromPowerRatio(ratioV) : dbFromVoltageRatio(ratioV) };
    }
    if (dbV === null) return null;
    return { kind: "ratio", ratio: mode === "power" ? powerRatioFromDb(dbV) : voltageRatioFromDb(dbV) };
  }, [mode, d.dir, dbmV, ratioV, dbV, zV]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Mode")}>
        {([["dbm", "dBm ↔ power"], ["power", "Power ratio ↔ dB"], ["voltage", "Voltage ratio ↔ dB"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={`flex-1 rounded-[6px] px-2 py-1.5 text-sm transition-colors ${mode === k ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
            {t(label)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          {mode === "dbm" ? (
            <>
              <div>
                <label htmlFor="db-dbm" className="font-mono text-xs text-mute">{t("Power (dBm)")}</label>
                <input id="db-dbm" value={form.dbm} onChange={set("dbm")} spellCheck={false} className={`${fieldCls} ${dbmV === null ? "border-err" : "border-line-strong"}`} />
              </div>
              <div>
                <label htmlFor="db-z" className="font-mono text-xs text-mute">{t("Impedance (Ω)")}</label>
                <select id="db-z" value={form.z} onChange={set("z")} className={`${fieldCls} border-line-strong`}>
                  <option value="50">{t("50 (RF)")}</option>
                  <option value="75">{t("75 (video)")}</option>
                  <option value="600">{t("600 (audio/telecom)")}</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="db-dir" className="font-mono text-xs text-mute">{t("Direction")}</label>
                <select id="db-dir" value={form.dir} onChange={set("dir")} className={`${fieldCls} border-line-strong`}>
                  <option value="toDb">{t("ratio → dB")}</option>
                  <option value="toRatio">{t("dB → ratio")}</option>
                </select>
              </div>
              {d.dir === "toDb" ? (
                <div>
                  <label htmlFor="db-ratio" className="font-mono text-xs text-mute">{mode === "power" ? "P₂/P₁" : "V₂/V₁"}</label>
                  <input id="db-ratio" value={form.ratio} onChange={set("ratio")} spellCheck={false} className={`${fieldCls} ${ratioV === null || ratioV <= 0 ? "border-err" : "border-line-strong"}`} />
                </div>
              ) : (
                <div>
                  <label htmlFor="db-db" className="font-mono text-xs text-mute">dB</label>
                  <input id="db-db" value={form.db} onChange={set("db")} spellCheck={false} className={`${fieldCls} ${dbV === null ? "border-err" : "border-line-strong"}`} />
                </div>
              )}
            </>
          )}
          <p className="col-span-2 font-mono text-xs text-mute">
            {mode === "dbm" && "P = 1 mW · 10^(dBm/10) · Vrms = √(P·Z)"}
            {mode === "power" && "dB = 10 · log₁₀(P₂/P₁)"}
            {mode === "voltage" && "dB = 20 · log₁₀(V₂/V₁)"}
          </p>
        </div>

        <div className="space-y-2.5">
          {result?.kind === "dbm" && (
            <>
              <ResultCard label={t("Power")} value={`${fmt(result.mw)} mW`} size="lg" />
              <ResultCard label={t("Power (W)")} value={`${fmt(result.w)} W`} />
              <ResultCard label={`Vrms @ ${d.z} Ω`} value={`${fmt(result.vrms)} V`} />
            </>
          )}
          {result?.kind === "db" && (
            <ResultCard label={t("Level")} value={`${fmt(result.db)} dB`} size="lg" />
          )}
          {result?.kind === "ratio" && (
            <ResultCard label={t(mode === "power" ? "Power ratio" : "Voltage ratio")} value={fmt(result.ratio)} size="lg" />
          )}
        </div>
      </div>
    </div>
  );
}
