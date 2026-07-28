"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatXgtAddress,
  parseXgtAddress,
  XGT_DEVICES,
  xgtFlatBitIndex,
  xgtNextBits,
} from "@testbench/engine";
import { ResultCard } from "@/components/tool/ResultCard";

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

export function XgtAddressTool() {
  const [text, setText] = useState("P00105");
  const [debounced, setDebounced] = useState(text);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(text), 150);
    return () => clearTimeout(h);
  }, [text]);

  const parsed = useMemo(() => parseXgtAddress(debounced), [debounced]);
  const address = parsed.ok ? parsed.address : null;

  const run = useMemo(
    () => (address && address.bit !== undefined ? xgtNextBits(address, 8) : []),
    [address],
  );

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label htmlFor="xgt-addr" className="text-xs font-medium uppercase tracking-wide text-mute">
              XGK device address (e.g. P00105, M0000F, D0011.A)
            </label>
            <input
              id="xgt-addr"
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
            <div className="text-[11px] uppercase tracking-wide text-mute">Device areas</div>
            <p className="mt-1.5 font-mono text-xs leading-relaxed text-body">
              {XGT_DEVICES.filter((d) => d.kind === "bit").map((d) => d.symbol).join(" ")} — bit devices
            </p>
            <p className="mt-1 font-mono text-xs leading-relaxed text-body">
              {XGT_DEVICES.filter((d) => d.kind === "word").map((d) => d.symbol).join(" ")} — word devices
            </p>
            <p className="mt-2 text-xs text-mute">
              Bit devices carry the bit as their last digit; word devices take a dotted bit. Either way the
              bit is hexadecimal.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {address && (
            <>
              <ResultCard label="Canonical" value={formatXgtAddress(address)} size="lg" />
              <ResultCard
                label="Device"
                value={`${address.device.symbol} — ${address.device.name} (${address.device.kind} device)`}
              />
              <ResultCard label="Word number (decimal)" value={String(address.word)} />
              <ResultCard
                label="Bit"
                value={
                  address.bit === undefined
                    ? "— whole word"
                    : `${address.bit} (written ${address.bitHex} in hex)`
                }
              />
              <ResultCard
                label="Bit from start of area"
                value={address.bit === undefined ? "— needs a bit" : String(xgtFlatBitIndex(address))}
              />
              <ResultCard label="Word address" value={formatXgtAddress({ device: address.device, word: address.word })} />
            </>
          )}
        </div>
      </div>

      {run.length > 0 && (
        <div className="mt-4 rounded-btn border border-line-soft bg-elevated p-3">
          <div className="text-[11px] uppercase tracking-wide text-mute">
            Next 8 consecutive bits — rolls into the next word after F
          </div>
          <p className="mt-1.5 break-words font-mono text-sm text-ink">{run.join("  ·  ")}</p>
        </div>
      )}
    </div>
  );
}
