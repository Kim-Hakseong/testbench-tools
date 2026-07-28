"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AB_DEFAULT_FILES,
  AB_TYPE_NAME,
  abDefaultFile,
  abFlatBitIndex,
  formatAbAddress,
  parseAbAddress,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function AbAddressTool() {
  const t = useToolText();
  const [text, setText] = useState("N7:2/8");
  const [debounced, setDebounced] = useState(text);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(text), 150);
    return () => clearTimeout(h);
  }, [text]);

  const parsed = useMemo(() => parseAbAddress(debounced), [debounced]);
  const address = parsed.ok ? parsed.address : null;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label htmlFor="ab-addr" className="text-xs font-medium uppercase tracking-wide text-mute">
              SLC address (e.g. N7:2/8, B3/16, I:2.1/3)
            </label>
            <input
              id="ab-addr"
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

          <div className="rounded-btn border border-line-soft bg-elevated p-3">
            <div className="text-[11px] uppercase tracking-wide text-mute">{t("Reserved files")}</div>
            <p className="mt-1.5 font-mono text-xs leading-relaxed text-body">
              {AB_DEFAULT_FILES.map((f) => `${f.type}${f.number} ${f.name}`).join("  ·  ")}
            </p>
            <p className="mt-2 text-xs text-mute">Files 9–255 are whatever you configure them to be.</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {address && (
            <>
              <ResultCard label={t("Canonical")} value={formatAbAddress(address)} size="lg" />
              {address.kind === "data" ? (
                <>
                  <ResultCard
                    label={t("File")}
                    value={`${address.type}${address.file} — ${AB_TYPE_NAME[address.type]}${
                      abDefaultFile(address.file) ? " (reserved)" : " (user-assigned)"
                    }`}
                  />
                  <ResultCard label={t("Element")} value={`${address.element} — one 16-bit word`} />
                  <ResultCard
                    label={t("Bit")}
                    value={address.bit === undefined ? "— whole word" : String(address.bit)}
                  />
                  <ResultCard label={t("Bit from start of file")} value={String(abFlatBitIndex(address))} />
                  <ResultCard
                    label={t("Bit-only shorthand")}
                    value={
                      address.bit === undefined
                        ? "— needs a bit"
                        : `${address.type}${address.file}/${abFlatBitIndex(address)}`
                    }
                  />
                </>
              ) : (
                <>
                  <ResultCard label={t("Direction")} value={address.type === "I" ? "Input" : "Output"} />
                  <ResultCard label={t("Slot")} value={String(address.slot)} />
                  <ResultCard label={t("Word in slot")} value={String(address.word)} />
                  <ResultCard
                    label={t("Bit (terminal)")}
                    value={address.bit === undefined ? "— whole word" : String(address.bit)}
                  />
                  <ResultCard
                    label={t("Terminal number in slot")}
                    value={
                      address.bit === undefined
                        ? "— needs a bit"
                        : String(address.word * 16 + address.bit)
                    }
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
