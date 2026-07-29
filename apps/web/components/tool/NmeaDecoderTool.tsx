"use client";

import { useEffect, useMemo, useState } from "react";
import { checksumHex, NMEA_FIELD_LABELS, parseNmea } from "@testbench/engine";
import { useToolText } from "@/components/tool/useToolText";

export function NmeaDecoderTool() {
  const t = useToolText();
  const [input, setInput] = useState("$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47");
  const [debounced, setDebounced] = useState(input);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(input), 150);
    return () => clearTimeout(h);
  }, [input]);

  const result = useMemo(() => {
    const s = debounced.trim();
    if (s === "") return { error: t("Enter a sentence.") };
    const r = parseNmea(s);
    if (!r.ok) return { error: r.error };
    return { s: r.sentence };
  }, [debounced, t]);

  const labels = "s" in result && result.s ? NMEA_FIELD_LABELS[result.s.type] : undefined;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <label htmlFor="nd-in" className="text-xs font-medium uppercase tracking-wide text-mute">
        {t("NMEA 0183 sentence")}
      </label>
      <textarea id="nd-in" value={input} rows={3} spellCheck={false}
        onChange={(e) => setInput(e.target.value)}
        className={`mt-2 w-full resize-y rounded-btn border bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors ${
          "error" in result ? "border-err" : "border-line-strong focus:border-mute"
        }`} />
      {"error" in result && result.error && (
        <p className="mt-1.5 font-mono text-xs text-err" role="alert">{result.error}</p>
      )}

      {"s" in result && result.s && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line-strong px-2.5 py-0.5 font-mono text-xs text-ink">
              {result.s.talker} · {result.s.type}
            </span>
            {result.s.valid === null ? (
              <span className="rounded-full border border-warn/40 px-2.5 py-0.5 font-mono text-xs text-warn">
                {t("no checksum — computed")} 0x{checksumHex(result.s.computed)}
              </span>
            ) : result.s.valid ? (
              <span className="rounded-full border border-ok/40 px-2.5 py-0.5 font-mono text-xs text-ok">
                {t("checksum VALID")} (0x{checksumHex(result.s.computed)})
              </span>
            ) : (
              <span className="rounded-full border border-err/40 px-2.5 py-0.5 font-mono text-xs text-err">
                {t("checksum FAIL")} — {t("got")} 0x{checksumHex(result.s.received!)}, {t("expected")} 0x{checksumHex(result.s.computed)}
              </span>
            )}
            {labels === undefined && (
              <span className="font-mono text-xs text-mute">{t("unknown type — generic fields")}</span>
            )}
          </div>

          <div className="overflow-x-auto rounded-btn border border-line-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">{t("Field")}</th>
                  <th className="px-3 py-2 font-medium">{t("Value")}</th>
                </tr>
              </thead>
              <tbody>
                {result.s.fields.map((f, i) => (
                  <tr key={i} className="border-b border-line-soft last:border-0">
                    <td className="px-3 py-2 font-mono text-[13px] text-mute">{i + 1}</td>
                    <td className="px-3 py-2 text-body">{labels?.[i] ?? `${t("Field")} ${i + 1}`}</td>
                    <td className="px-3 py-2 font-mono text-[13px] text-ink">{f === "" ? <span className="text-mute">—</span> : f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
