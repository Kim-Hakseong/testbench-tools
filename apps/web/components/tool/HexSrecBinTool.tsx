"use client";

import { useCallback, useRef, useState } from "react";
import {
  parseIntelHex,
  parseSrec,
  segmentsToBin,
  toIntelHex,
  toSrec,
  type FirmwareImage,
} from "@testbench/engine";

function download(name: string, data: Uint8Array | string, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const fieldCls =
  "mt-1.5 w-full rounded-btn border bg-well px-3 py-2 font-mono text-sm text-ink outline-none transition-colors focus:border-mute border-line-strong";

export function HexSrecBinTool() {
  const [mode, setMode] = useState<"toBin" | "toHex">("toBin");
  // toBin state
  const [text, setText] = useState("");
  const [image, setImage] = useState<FirmwareImage | null>(null);
  const [parseErr, setParseErr] = useState("");
  const [srcName, setSrcName] = useState("firmware");
  // toHex state
  const [binFile, setBinFile] = useState<File | null>(null);
  const [baseText, setBaseText] = useState("08000000");
  const inputRef = useRef<HTMLInputElement>(null);
  const binRef = useRef<HTMLInputElement>(null);

  const parseText = useCallback((t: string, name: string) => {
    setText(t);
    setSrcName(name.replace(/\.(hex|ihex|srec|s19|s28|s37|mot)$/i, ""));
    const trimmed = t.trim();
    if (trimmed === "") {
      setImage(null);
      setParseErr("");
      return;
    }
    const r = trimmed.startsWith(":") ? parseIntelHex(trimmed) : parseSrec(trimmed);
    if (!r.ok) {
      setImage(null);
      setParseErr(`Line ${r.line}: ${r.error}`);
    } else {
      setImage(r.image);
      setParseErr("");
    }
  }, []);

  async function convertBin(kind: "ihex" | "srec") {
    if (!binFile) return;
    const base = parseInt(baseText.replace(/^0x/i, ""), 16);
    if (Number.isNaN(base)) return;
    const data = new Uint8Array(await binFile.arrayBuffer());
    const segments = [{ address: base, data }];
    const name = binFile.name.replace(/\.bin$/i, "");
    if (kind === "ihex") download(`${name}.hex`, toIntelHex(segments), "text/plain");
    else download(`${name}.srec`, toSrec(segments), "text/plain");
  }

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex rounded-btn border border-line-strong p-0.5" role="tablist" aria-label="Direction">
        {([["toBin", "HEX / SREC → BIN"], ["toHex", "BIN → HEX / SREC"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm transition-colors ${mode === k ? "bg-elevated text-ink" : "text-mute hover:text-body"}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === "toBin" ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="fw-text" className="text-xs font-medium uppercase tracking-wide text-mute">
              Paste Intel HEX / S-Record text — or load a file
            </label>
            <button type="button" onClick={() => inputRef.current?.click()}
              className="rounded-btn border border-line-strong px-3 py-1 text-xs text-body transition-colors hover:border-mute">
              Open file…
            </button>
            <input ref={inputRef} type="file" accept=".hex,.ihex,.srec,.s19,.s28,.s37,.mot,text/plain" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void f.text().then((t) => parseText(t, f.name));
                e.target.value = "";
              }} />
          </div>
          <textarea id="fw-text" value={text} rows={7} spellCheck={false}
            placeholder=":10010000214601360121470136007EFE09D2190140&#10;:00000001FF"
            onChange={(e) => parseText(e.target.value, srcName)}
            className={`w-full resize-y rounded-btn border bg-well px-3 py-2.5 font-mono text-xs text-ink outline-none transition-colors ${
              parseErr ? "border-err" : "border-line-strong focus:border-mute"
            }`} />
          {parseErr && <p className="font-mono text-xs text-err" role="alert">{parseErr}</p>}

          {image && (
            <div className="space-y-2.5">
              <div className="overflow-x-auto rounded-btn border border-line-soft">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                      <th className="px-3 py-2 font-medium">Segment</th>
                      <th className="px-3 py-2 font-medium">Start</th>
                      <th className="px-3 py-2 font-medium">End</th>
                      <th className="px-3 py-2 font-medium">Bytes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {image.segments.map((s, i) => (
                      <tr key={i} className="border-b border-line-soft font-mono text-[13px] last:border-0">
                        <td className="px-3 py-2 text-mute">{i + 1}</td>
                        <td className="px-3 py-2 text-ink">0x{s.address.toString(16).toUpperCase().padStart(8, "0")}</td>
                        <td className="px-3 py-2 text-body">0x{(s.address + s.data.length - 1).toString(16).toUpperCase().padStart(8, "0")}</td>
                        <td className="px-3 py-2 text-body">{s.data.length.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button"
                  onClick={() => {
                    const bin = segmentsToBin(image.segments);
                    download(`${srcName}.bin`, bin.data, "application/octet-stream");
                  }}
                  className="rounded-btn bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98]">
                  Download .bin
                </button>
                <span className="font-mono text-xs text-mute">
                  {image.format === "ihex" ? "Intel HEX" : "S-Record"} · base 0x
                  {segmentsToBin(image.segments).base.toString(16).toUpperCase()}
                  {image.startAddress !== null &&
                    ` · entry 0x${image.startAddress.toString(16).toUpperCase()}`}{" "}
                  · gaps filled with 0xFF
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-mute">Binary file</span>
              <button type="button" onClick={() => binRef.current?.click()}
                className="mt-1.5 w-full rounded-btn border border-line-strong bg-well px-3 py-2 text-left font-mono text-sm text-body transition-colors hover:border-mute">
                {binFile ? `${binFile.name} (${binFile.size.toLocaleString()} B)` : "Choose .bin file…"}
              </button>
              <input ref={binRef} type="file" className="hidden"
                onChange={(e) => {
                  setBinFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }} />
            </div>
            <div>
              <label htmlFor="fw-base" className="text-xs font-medium uppercase tracking-wide text-mute">Base address (hex)</label>
              <input id="fw-base" value={baseText} onChange={(e) => setBaseText(e.target.value)} spellCheck={false} className={fieldCls} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" disabled={!binFile} onClick={() => void convertBin("ihex")}
              className="rounded-btn bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40">
              Download .hex
            </button>
            <button type="button" disabled={!binFile} onClick={() => void convertBin("srec")}
              className="rounded-btn border border-line-strong px-4 py-2 text-sm text-body transition-colors hover:border-mute disabled:opacity-40">
              Download .srec
            </button>
          </div>
        </div>
      )}
      <p className="mt-4 font-mono text-xs text-ok">Your file never leaves your browser.</p>
    </div>
  );
}
