"use client";

import { useEffect, useMemo, useState } from "react";
import {
  asciiToBytes,
  bytesToHex,
  crc,
  crcBytes,
  CRC_PRESETS,
  parseHex,
  type CrcParams,
  type HexParseError,
} from "@testbench/engine";
import { HexInput, type InputMode } from "@/components/tool/HexInput";
import { ResultCard } from "@/components/tool/ResultCard";
import { useToolText } from "@/components/tool/useToolText";

function parseHexField(s: string): number | null {
  const raw = s.trim().replace(/^0x/i, "");
  if (raw === "" || !/^[0-9a-fA-F]{1,8}$/.test(raw)) return null;
  return parseInt(raw, 16) >>> 0;
}

/** Fully parameterized CRC panel: width / poly / init / reflect / xorout. */
export function CustomCrcTool() {
  const t = useToolText();
  // Defaults = the §9.1 worked example: CRC-8, poly 0xD5, init 0xFF → 0x7C.
  const [input, setInput] = useState("123456789");
  const [mode, setMode] = useState<InputMode>("ascii");
  const [debounced, setDebounced] = useState(input);
  const [width, setWidth] = useState(8);
  const [poly, setPoly] = useState("D5");
  const [init, setInit] = useState("FF");
  const [xorout, setXorout] = useState("00");
  const [refin, setRefin] = useState(false);
  const [refout, setRefout] = useState(false);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(input), 150);
    return () => clearTimeout(h);
  }, [input]);

  const { bytes, error } = useMemo((): {
    bytes: Uint8Array | null;
    error?: HexParseError;
  } => {
    if (mode === "ascii") return { bytes: asciiToBytes(debounced) };
    const r = parseHex(debounced);
    return r.ok ? { bytes: r.bytes } : { bytes: null, error: r.error };
  }, [debounced, mode]);

  const polyV = parseHexField(poly);
  const initV = parseHexField(init);
  const xoroutV = parseHexField(xorout);
  const widthOk = Number.isInteger(width) && width >= 1 && width <= 32;
  const paramsOk = widthOk && polyV !== null && initV !== null && xoroutV !== null;

  const params: CrcParams | null = paramsOk
    ? { width, poly: polyV!, init: initV!, refin, refout, xorout: xoroutV! }
    : null;
  const value = bytes && params ? crc(bytes, params) : null;
  const hexDigits = Math.ceil(width / 4);

  function loadPreset(name: string) {
    const p = CRC_PRESETS.find((x) => x.name === name);
    if (!p) return;
    setWidth(p.width);
    setPoly(p.poly.toString(16).toUpperCase());
    setInit(p.init.toString(16).toUpperCase());
    setXorout(p.xorout.toString(16).toUpperCase());
    setRefin(p.refin);
    setRefout(p.refout);
  }

  const fieldCls =
    "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute";

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <HexInput value={input} onChange={setInput} mode={mode} onModeChange={setMode} error={error} />

          <div className="mt-4">
            <label htmlFor="load-preset" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Load preset")}
            </label>
            <select
              id="load-preset"
              defaultValue=""
              onChange={(e) => e.target.value && loadPreset(e.target.value)}
              className={`${fieldCls} border-line-strong`}
            >
              <option value="">{t("— choose a known model —")}</option>
              {CRC_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="crc-width" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Width (1–32)")}</label>
              <input
                id="crc-width"
                type="number"
                min={1}
                max={32}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className={`${fieldCls} ${widthOk ? "border-line-strong" : "border-err"}`}
              />
            </div>
            <div>
              <label htmlFor="crc-poly" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Polynomial (hex)")}</label>
              <input
                id="crc-poly"
                value={poly}
                onChange={(e) => setPoly(e.target.value)}
                spellCheck={false}
                className={`${fieldCls} ${polyV !== null ? "border-line-strong" : "border-err"}`}
              />
            </div>
            <div>
              <label htmlFor="crc-init" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Init (hex)")}</label>
              <input
                id="crc-init"
                value={init}
                onChange={(e) => setInit(e.target.value)}
                spellCheck={false}
                className={`${fieldCls} ${initV !== null ? "border-line-strong" : "border-err"}`}
              />
            </div>
            <div>
              <label htmlFor="crc-xorout" className="text-xs font-medium uppercase tracking-wide text-mute">{t("XorOut (hex)")}</label>
              <input
                id="crc-xorout"
                value={xorout}
                onChange={(e) => setXorout(e.target.value)}
                spellCheck={false}
                className={`${fieldCls} ${xoroutV !== null ? "border-line-strong" : "border-err"}`}
              />
            </div>
          </div>

          <div className="mt-3 flex gap-5">
            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" checked={refin} onChange={(e) => setRefin(e.target.checked)} />
              RefIn
            </label>
            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" checked={refout} onChange={(e) => setRefout(e.target.checked)} />
              RefOut
            </label>
          </div>
        </div>

        <div className="space-y-2.5">
          {value !== null && bytes ? (
            <>
              <ResultCard
                label={`CRC-${width} ${t("result")}`}
                value={"0x" + value.toString(16).toUpperCase().padStart(hexDigits, "0")}
                size="lg"
              />
              <ResultCard label={t("Bytes (little-endian)")} value={bytesToHex(crcBytes(value, width).le)} />
              <ResultCard label={t("Bytes (big-endian)")} value={bytesToHex(crcBytes(value, width).be)} />
              <ResultCard label={t("Decimal")} value={String(value)} />
              <p className="pt-1 font-mono text-xs text-mute">{bytes.length} {t("bytes in")}</p>
            </>
          ) : (
            <p className="text-sm text-mute">
              {t(error ? "Fix the input to see results." : "Fix the highlighted parameters to see results.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
