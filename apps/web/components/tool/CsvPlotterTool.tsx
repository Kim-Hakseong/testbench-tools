"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseCsvNumeric, type CsvNumeric } from "@testbench/engine";
import { useToolText } from "@/components/tool/useToolText";

const COLORS = ["#7dd3fc", "#5eead4", "#fcd34d", "#fda4af", "#bef264", "#93c5fd", "#fdba74", "#f9a8d4"];

export function CsvPlotterTool() {
  const t = useToolText();
  const [csv, setCsv] = useState<CsvNumeric | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [xIsFirst, setXIsFirst] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback((text: string, name: string) => {
    const r = parseCsvNumeric(text);
    if (!r.ok) {
      setError(r.error);
      setCsv(null);
      return;
    }
    setError("");
    setFileName(name);
    setCsv(r.csv);
    const dataCols = r.csv.headers.map((_, i) => i).filter((i) => !(r.csv.headers.length > 1 && i === 0));
    setVisible(new Set(dataCols.slice(0, 8)));
  }, []);

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !csv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = 320;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const style = getComputedStyle(document.documentElement);
    const mute = style.getPropertyValue("--tb-mute").trim() || "#888";
    const border = style.getPropertyValue("--tb-border-structural").trim() || "#444";
    ctx.clearRect(0, 0, W, H);

    const xCol = xIsFirst && csv.headers.length > 1 ? csv.columns[0]! : null;
    const cols = [...visible].filter((i) => i < csv.columns.length);
    if (cols.length === 0) return;

    let yMin = Infinity, yMax = -Infinity;
    for (const c of cols) for (const v of csv.columns[c]!) {
      if (Number.isFinite(v)) { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); }
    }
    if (!Number.isFinite(yMin)) return;
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const xMin = xCol ? Math.min(...xCol.filter(Number.isFinite)) : 0;
    const xMax = xCol ? Math.max(...xCol.filter(Number.isFinite)) : csv.rowCount - 1;

    const PAD_L = 56, PAD_R = 8, PAD_T = 8, PAD_B = 24;
    const px = (x: number) => PAD_L + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD_L - PAD_R);
    const py = (y: number) => PAD_T + (1 - (y - yMin) / (yMax - yMin)) * (H - PAD_T - PAD_B);

    // grid + labels
    ctx.strokeStyle = border;
    ctx.fillStyle = mute;
    ctx.font = "10px 'Geist Mono', monospace";
    ctx.lineWidth = 0.5;
    for (let g = 0; g <= 4; g++) {
      const y = yMin + ((yMax - yMin) * g) / 4;
      ctx.beginPath();
      ctx.moveTo(PAD_L, py(y));
      ctx.lineTo(W - PAD_R, py(y));
      ctx.stroke();
      ctx.fillText(Number(y.toPrecision(4)).toString(), 4, py(y) + 3);
    }
    ctx.fillText(Number(xMin.toPrecision(4)).toString(), PAD_L, H - 8);
    const xMaxLabel = Number(xMax.toPrecision(4)).toString();
    ctx.fillText(xMaxLabel, W - PAD_R - ctx.measureText(xMaxLabel).width, H - 8);

    // traces
    for (const c of cols) {
      ctx.strokeStyle = COLORS[c % COLORS.length]!;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const data = csv.columns[c]!;
      let started = false;
      for (let i = 0; i < data.length; i++) {
        const xv = xCol ? xCol[i]! : i;
        const yv = data[i]!;
        if (!Number.isFinite(xv) || !Number.isFinite(yv)) { started = false; continue; }
        if (!started) { ctx.moveTo(px(xv), py(yv)); started = true; }
        else ctx.lineTo(px(xv), py(yv));
      }
      ctx.stroke();
    }
  }, [csv, visible, xIsFirst]);

  function toggle(i: number) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) void f.text().then((text) => load(text, f.name));
        }}
        className={`flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-8 text-center transition-colors ${
          dragOver ? "border-ok bg-elevated" : "border-line-strong"
        }`}
      >
        <p className="text-sm text-body">{t("Drop a .csv file here")}</p>
        <p className="mt-1 text-xs text-mute">{t("or")}</p>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="mt-2 rounded-btn bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98]">
          {t("Choose file")}
        </button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void f.text().then((text) => load(text, f.name));
            e.target.value = "";
          }} />
        <p className="mt-4 font-mono text-xs text-ok">{t("Your file never leaves your browser.")}</p>
      </div>

      {error && <p className="mt-3 rounded-btn border border-err/40 px-3 py-2 font-mono text-sm text-err" role="alert">{error}</p>}

      {csv && (
        <div className="mt-4 space-y-3">
          <p className="font-mono text-xs text-mute">
            {fileName} · {csv.rowCount} {t("rows")} · {csv.headers.length} {t("columns")} · {t("delimiter")} “{csv.delimiter === "\t" ? "TAB" : csv.delimiter}”
            {csv.skippedRows > 0
              ? ` · ${t("{n} non-numeric rows skipped").replace("{n}", String(csv.skippedRows))}`
              : ""}
          </p>
          <canvas ref={canvasRef} className="w-full rounded-btn border border-line-soft bg-well" style={{ height: 320 }} />
          <div className="flex flex-wrap items-center gap-3">
            {csv.headers.length > 1 && (
              <label className="flex items-center gap-2 font-mono text-xs text-body">
                <input type="checkbox" checked={xIsFirst} onChange={(e) => setXIsFirst(e.target.checked)} />
                {t("first column = X axis")}
              </label>
            )}
            {csv.headers.map((h, i) =>
              xIsFirst && i === 0 && csv.headers.length > 1 ? null : (
                <label key={i} className="flex items-center gap-1.5 font-mono text-xs text-body">
                  <input type="checkbox" checked={visible.has(i)} onChange={() => toggle(i)} />
                  <span className="inline-block h-2 w-4 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {h}
                </label>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
