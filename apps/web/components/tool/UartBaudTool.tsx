"use client";

import { useEffect, useMemo, useState } from "react";
import { uartBaudError } from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const COMMON_BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

function num(s: string): number | null {
  const v = Number(s.trim());
  return s.trim() === "" || Number.isNaN(v) || v <= 0 ? null : v;
}

export function UartBaudTool() {
  const t = useToolText();
  const [form, setForm] = useState({ fclk: "16000000", baud: "115200" });
  const [os, setOs] = useState<16 | 8>(16);
  const [d, setD] = useState(form);

  useEffect(() => {
    const h = setTimeout(() => setD(form), 150);
    return () => clearTimeout(h);
  }, [form]);

  const fclk = num(d.fclk);
  const baud = num(d.baud);

  const result = useMemo(() => {
    if (fclk === null || baud === null) return null;
    return uartBaudError(fclk, baud, os);
  }, [fclk, baud, os]);

  const table = useMemo(() => {
    if (fclk === null) return [];
    return COMMON_BAUDS.map((b) => ({ baud: b, ...uartBaudError(fclk, b, os) }));
  }, [fclk, os]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ub-fclk" className="font-mono text-xs text-mute">{t("UART clock")} (Hz)</label>
              <input id="ub-fclk" value={form.fclk} onChange={set("fclk")} spellCheck={false} className={`${fieldCls} ${fclk === null ? "border-err" : "border-line-strong"}`} />
            </div>
            <div>
              <label htmlFor="ub-baud" className="font-mono text-xs text-mute">{t("Target baud")}</label>
              <input id="ub-baud" value={form.baud} onChange={set("baud")} spellCheck={false} className={`${fieldCls} ${baud === null ? "border-err" : "border-line-strong"}`} />
            </div>
          </div>
          <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label={t("Oversampling")}>
            {([16, 8] as const).map((o) => (
              <button key={o} type="button" role="tab" aria-selected={os === o}
                onClick={() => setOs(o)}
                className={`flex-1 rounded-[6px] px-3 py-1.5 font-mono text-sm transition-colors ${os === o ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
                ×{o} {t("oversampling")}
              </button>
            ))}
          </div>
          {result && (
            <div className="space-y-2.5">
              <p className={`rounded-btn border px-3 py-2 font-mono text-sm ${Math.abs(result.error) < 0.02 ? "border-ok/40 text-ok" : "border-err/40 text-err"}`}>
                {Math.abs(result.error) < 0.02
                  ? t("OK — {e} % error (within the ~±2 % rule of thumb)").replace(
                      "{e}",
                      (result.error * 100).toFixed(3),
                    )
                  : t("RISKY — {e} % error will likely corrupt frames").replace(
                      "{e}",
                      (result.error * 100).toFixed(2),
                    )}
              </p>
              <ResultCard label={t("Divisor")} value={String(result.divisor)} size="lg" />
              <ResultCard label={t("Actual baud")} value={result.actualBaud.toFixed(1).replace(/\.0$/, "")} />
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-btn border border-line-soft">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                <th className="px-3 py-2 font-medium">Baud</th>
                <th className="px-3 py-2 font-medium">{t("Divisor")}</th>
                <th className="px-3 py-2 font-medium">{t("Actual")}</th>
                <th className="px-3 py-2 font-medium">{t("Error")}</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.baud} className="border-b border-line-soft font-mono text-[13px] last:border-0">
                  <td className="px-3 py-2 text-ink">{r.baud}</td>
                  <td className="px-3 py-2 text-body">{r.divisor}</td>
                  <td className="px-3 py-2 text-body">{Math.round(r.actualBaud)}</td>
                  <td className={`px-3 py-2 ${Math.abs(r.error) < 0.02 ? "text-ok" : "text-err"}`}>
                    {(r.error * 100).toFixed(2)} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
