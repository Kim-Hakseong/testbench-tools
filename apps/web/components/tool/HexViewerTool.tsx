"use client";

import { useCallback, useRef, useState } from "react";
import { hexDumpLines } from "@testbench/engine";

const PAGE = 16 * 1024; // bytes rendered per "load more"

export function HexViewerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadChunk = useCallback(async (f: File, from: number) => {
    const buf = new Uint8Array(await f.slice(from, from + PAGE).arrayBuffer());
    setLines((prev) => [...prev, ...hexDumpLines(buf, from)]);
    setLoaded(from + buf.length);
  }, []);

  const open = useCallback(
    (f: File) => {
      setFile(f);
      setLines([]);
      setLoaded(0);
      void loadChunk(f, 0);
    },
    [loadChunk],
  );

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) open(f);
        }}
        className={`flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-8 text-center transition-colors ${
          dragOver ? "border-ok bg-elevated" : "border-line-strong"
        }`}
      >
        <p className="text-sm text-body">Drop any file here</p>
        <p className="mt-1 text-xs text-mute">or</p>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="mt-2 rounded-btn bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98]">
          Choose file
        </button>
        <input ref={inputRef} type="file" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) open(f);
            e.target.value = "";
          }} />
        <p className="mt-4 font-mono text-xs text-ok">Your file never leaves your browser.</p>
      </div>

      {file && (
        <div className="mt-4">
          <p className="font-mono text-xs text-mute">
            {file.name} · {file.size.toLocaleString()} bytes · showing {loaded.toLocaleString()}
          </p>
          <pre className="mt-2 max-h-96 overflow-auto rounded-btn border border-line-soft bg-well p-3 font-mono text-[12px] leading-relaxed text-body">
            {lines.join("\n")}
          </pre>
          {loaded < file.size && (
            <button type="button" onClick={() => void loadChunk(file, loaded)}
              className="mt-2.5 rounded-btn border border-line-strong px-3 py-1.5 text-sm text-body transition-colors hover:border-mute">
              Load next 16 KB ({(file.size - loaded).toLocaleString()} bytes remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
