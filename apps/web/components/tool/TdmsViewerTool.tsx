"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { TdmsParser, tdmsTypeName, type TdmsFile } from "@testbench/engine";

const CHUNK_SIZE = 4 * 1024 * 1024;

export function TdmsViewerTool() {
  const [phase, setPhase] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TdmsFile | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    setPhase("parsing");
    setFileName(file.name);
    setProgress(0);
    setResult(null);
    try {
      const parser = new TdmsParser();
      for (let off = 0; off < file.size; off += CHUNK_SIZE) {
        parser.push(new Uint8Array(await file.slice(off, off + CHUNK_SIZE).arrayBuffer()));
        setProgress(Math.min(1, (off + CHUNK_SIZE) / file.size));
        await new Promise((r) => setTimeout(r, 0));
      }
      setResult(parser.finish());
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, []);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) void parseFile(f);
        }}
        className={`flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-ok bg-elevated" : "border-line-strong"
        }`}
      >
        <p className="text-sm text-body">Drop a .tdms file here</p>
        <p className="mt-1 text-xs text-mute">or</p>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="mt-2 rounded-btn bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98]">
          Choose file
        </button>
        <input ref={inputRef} type="file" accept=".tdms" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void parseFile(f);
            e.target.value = "";
          }} />
        <p className="mt-4 font-mono text-xs text-ok">Your file never leaves your browser.</p>
      </div>

      {phase === "parsing" && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            <div className="h-full bg-ok transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-1.5 font-mono text-xs text-mute">parsing {fileName}… {Math.round(progress * 100)}%</p>
        </div>
      )}
      {phase === "error" && (
        <p className="mt-4 rounded-btn border border-err/40 px-3 py-2 font-mono text-sm text-err" role="alert">{error}</p>
      )}

      {phase === "done" && result && (
        <div className="mt-5 space-y-4">
          {Object.entries(result.properties).length > 0 && (
            <div className="rounded-btn border border-line-soft bg-well p-3 font-mono text-xs text-body">
              <span className="text-mute">file properties · </span>
              {Object.entries(result.properties).map(([k, v]) => `${k} = ${String(v)}`).join(" · ")}
            </div>
          )}
          {result.groups.map((g) => (
            <div key={g.path} className="rounded-btn border border-line-soft">
              <div className="border-b border-line-soft bg-elevated px-3 py-2 font-mono text-sm text-ink">
                {g.name}
                <span className="ml-2 text-xs text-mute">{g.channels.length} channels</span>
              </div>
              {g.channels.map((c) => (
                <details key={c.path} className="border-b border-line-soft px-3 py-2 last:border-0">
                  <summary className="cursor-pointer font-mono text-sm text-body">
                    {c.name}
                    <span className="ml-2 text-xs text-mute">
                      {tdmsTypeName(c.dtype)} · {c.data.length} samples
                    </span>
                  </summary>
                  <div className="mt-2 space-y-1.5 pl-4 font-mono text-xs">
                    {Object.entries(c.properties).length > 0 && (
                      <p className="text-mute">
                        {Object.entries(c.properties).map(([k, v]) => `${k} = ${String(v)}`).join(" · ")}
                      </p>
                    )}
                    <p className="text-body">
                      <span className="text-mute">first samples: </span>
                      {c.data.slice(0, 10).map((v) => Number(v.toPrecision(7))).join(", ")}
                      {c.data.length > 10 ? " …" : ""}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          ))}
          <p className="text-sm text-mute">
            Need the data itself?{" "}
            <Link href="/tools/tdms-to-csv/" className="text-body underline decoration-line-strong underline-offset-4 hover:text-ink">
              TDMS to CSV Converter →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
