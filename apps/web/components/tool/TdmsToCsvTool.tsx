"use client";

import { useCallback, useRef, useState } from "react";
import { TdmsParser, tdmsToCsv, tdmsTypeName, type TdmsFile } from "@testbench/engine";
import { useToolText } from "@/components/tool/useToolText";

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB slices — the file is never fully loaded
const BIG_FILE = 200 * 1024 * 1024;

type Phase = "idle" | "parsing" | "done" | "error";

export function TdmsToCsvTool() {
  const t = useToolText();
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TdmsFile | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    setPhase("parsing");
    setFileName(file.name);
    setFileSize(file.size);
    setProgress(0);
    setResult(null);
    setError("");
    try {
      const parser = new TdmsParser();
      for (let off = 0; off < file.size; off += CHUNK_SIZE) {
        const slice = file.slice(off, off + CHUNK_SIZE);
        parser.push(new Uint8Array(await slice.arrayBuffer()));
        setProgress(Math.min(1, (off + CHUNK_SIZE) / file.size));
        // yield to keep the UI responsive between chunks
        await new Promise((r) => setTimeout(r, 0));
      }
      const parsed = parser.finish();
      setResult(parsed);
      setSelected(new Set(parsed.groups.flatMap((g) => g.channels.map((c) => c.path))));
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void parseFile(file);
  }

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function downloadCsv() {
    if (!result) return;
    const channels = result.groups
      .flatMap((g) => g.channels)
      .filter((c) => selected.has(c.path));
    if (channels.length === 0) return;
    const csv = tdmsToCsv(channels);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.tdms$/i, "") + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalSamples = result
    ? result.groups.reduce((n, g) => n + g.channels.reduce((m, c) => m + c.data.length, 0), 0)
    : 0;

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      {/* drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-ok bg-elevated" : "border-line-strong"
        }`}
      >
        <p className="text-sm text-body">{t("Drop a .tdms file here")}</p>
        <p className="mt-1 text-xs text-mute">{t("or")}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 rounded-btn bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98]"
        >
          {t("Choose file")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".tdms"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void parseFile(f);
            e.target.value = "";
          }}
        />
        <p className="mt-4 font-mono text-xs text-ok">{t("Your file never leaves your browser.")}</p>
      </div>

      {fileSize > BIG_FILE && (
        <p className="mt-3 rounded-btn border border-warn/40 px-3 py-2 font-mono text-xs text-warn">
          {t(
            "File is larger than 200 MB — browser memory limits may apply. The TDMS Converter desktop app (coming soon) handles batch conversion better.",
          )}
        </p>
      )}

      {phase === "parsing" && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            <div className="h-full bg-ok transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-1.5 font-mono text-xs text-mute">
            {t("parsing")} {fileName}… {Math.round(progress * 100)}%
          </p>
        </div>
      )}

      {phase === "error" && (
        <p className="mt-4 rounded-btn border border-err/40 px-3 py-2 font-mono text-sm text-err" role="alert">
          {error}
        </p>
      )}

      {phase === "done" && result && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs text-mute">
              {fileName} · {result.groups.length} {t(result.groups.length === 1 ? "group" : "groups")} ·{" "}
              {result.groups.reduce((n, g) => n + g.channels.length, 0)} {t("channels")} · {totalSamples}{" "}
              {t("samples")}
            </p>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={selected.size === 0}
              className="rounded-btn bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            >
              {t("Download CSV")} ({selected.size} ch)
            </button>
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto rounded-btn border border-line-soft">
            {result.groups.map((g) => (
              <div key={g.path}>
                <div className="border-b border-line-soft bg-elevated px-3 py-2 font-mono text-xs text-mute">
                  {g.name}
                </div>
                {g.channels.map((c) => (
                  <label
                    key={c.path}
                    className="flex cursor-pointer items-center gap-3 border-b border-line-soft px-3 py-2 last:border-0 hover:bg-elevated"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.path)}
                      onChange={() => toggle(c.path)}
                    />
                    <span className="font-mono text-sm text-ink">{c.name}</span>
                    <span className="font-mono text-xs text-mute">
                      {tdmsTypeName(c.dtype)} · {c.data.length} {t("samples")}
                    </span>
                    {Object.entries(c.properties).length > 0 && (
                      <span className="hidden truncate font-mono text-[11px] text-mute sm:inline">
                        {Object.entries(c.properties)
                          .map(([k, v]) => `${k}=${String(v)}`)
                          .join(" · ")}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
