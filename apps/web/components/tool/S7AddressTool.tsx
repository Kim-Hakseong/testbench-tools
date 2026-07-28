"use client";

import { useEffect, useMemo, useState } from "react";
import {
  absoluteBitIndex,
  allocate,
  byteSpan,
  collidingAddresses,
  coveredBytes,
  formatS7,
  overlaps,
  parseS7Address,
  widthBytes,
  type S7Address,
  type S7Width,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

const AREA_LABEL: Record<string, string> = {
  I: "Input (%I / %E)",
  Q: "Output (%Q / %A)",
  M: "Bit memory (%M)",
  DB: "Data block",
};

const WIDTH_LABEL: Record<S7Width, string> = {
  X: "Bit",
  B: "Byte (8 bit)",
  W: "Word (16 bit)",
  D: "Double word (32 bit)",
};

function describe(address: S7Address): string {
  const span = byteSpan(address);
  const area = address.area === "DB" ? `DB${address.dbNumber}` : `%${address.area}`;
  if (address.width === "X") {
    return `bit ${address.bitOffset} of byte ${address.byteOffset} in ${area}`;
  }
  return span.first === span.last
    ? `byte ${span.first} in ${area}`
    : `bytes ${span.first}–${span.last} in ${area}`;
}

export function S7AddressTool() {
  const t = useToolText();
  const [text, setText] = useState("%MW100");
  const [other, setOther] = useState("%MW101");
  const [count, setCount] = useState("4");
  const [debounced, setDebounced] = useState(text);
  const [debouncedOther, setDebouncedOther] = useState(other);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(text), 150);
    return () => clearTimeout(h);
  }, [text]);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedOther(other), 150);
    return () => clearTimeout(h);
  }, [other]);

  const parsed = useMemo(() => parseS7Address(debounced), [debounced]);
  const parsedOther = useMemo(() => parseS7Address(debouncedOther), [debouncedOther]);

  const address = parsed.ok ? parsed.address : null;

  const clash = useMemo(() => {
    if (!parsed.ok || !parsedOther.ok) return null;
    return overlaps(parsed.address, parsedOther.address);
  }, [parsed, parsedOther]);

  const layout = useMemo(() => {
    if (!address) return [];
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 32) return [];
    return allocate(address.area, address.width, address.byteOffset, n, address.dbNumber);
  }, [address, count]);

  const blocked = useMemo(() => {
    if (!address || address.width === "X") return [];
    return collidingAddresses(address, address.width).map(formatS7);
  }, [address]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label htmlFor="s7-addr" className="text-xs font-medium uppercase tracking-wide text-mute">
              S7 address (e.g. %MW100, %M10.3, DB1.DBW20)
            </label>
            <input
              id="s7-addr"
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
            <label htmlFor="s7-other" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Compare with (overlap check)")}
            </label>
            <input
              id="s7-other"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              spellCheck={false}
              className={`${fieldCls} ${parsedOther.ok ? "border-line-strong" : "border-err"}`}
            />
            {!parsedOther.ok && debouncedOther.trim() !== "" && (
              <p className="mt-1.5 font-mono text-xs text-err" role="alert">
                {parsedOther.error}
              </p>
            )}
            {clash !== null && (
              <p
                className={`mt-2 rounded-btn border px-3 py-2 font-mono text-xs ${
                  clash ? "border-err text-err" : "border-line-soft text-ok"
                }`}
                role="status"
              >
                {clash
                  ? `Overlap — ${formatS7(parsed.ok ? parsed.address : ({} as S7Address))} and ${formatS7(
                      parsedOther.ok ? parsedOther.address : ({} as S7Address),
                    )} share storage`
                  : "No overlap — these two are independent"}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="s7-count" className="text-xs font-medium uppercase tracking-wide text-mute">
              Allocate how many (non-overlapping, 1–32)
            </label>
            <input
              id="s7-count"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              inputMode="numeric"
              className={`${fieldCls} border-line-strong`}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {address && (
            <>
              <ResultCard label={t("Canonical")} value={formatS7(address)} size="lg" />
              <ResultCard label={t("Area")} value={AREA_LABEL[address.area] ?? address.area} />
              <ResultCard label={t("Access width")} value={`${WIDTH_LABEL[address.width]} · ${widthBytes(address.width)} byte(s)`} />
              <ResultCard label={t("Covers")} value={describe(address)} />
              <ResultCard
                label={t(address.width === "X" ? "Absolute bit index" : "First bit index")}
                value={String(absoluteBitIndex(address))}
              />
              <ResultCard label={t("Bytes used")} value={coveredBytes(address).join(", ")} />
            </>
          )}
        </div>
      </div>

      {address && layout.length > 0 && (
        <div className="mt-5 rounded-btn border border-line-soft bg-elevated p-3">
          <div className="text-[11px] uppercase tracking-wide text-mute">
            Next {layout.length} without overlap — step {widthBytes(address.width)} byte(s)
          </div>
          <p className="mt-1.5 break-words font-mono text-sm text-ink">
            {layout.map(formatS7).join("  ·  ")}
          </p>
        </div>
      )}

      {address && blocked.length > 0 && (
        <div className="mt-3 rounded-btn border border-line-soft bg-elevated p-3">
          <div className="text-[11px] uppercase tracking-wide text-mute">
            Same-width addresses this one blocks
          </div>
          <p className="mt-1.5 break-words font-mono text-sm text-body">{blocked.join("  ·  ")}</p>
        </div>
      )}
    </div>
  );
}
