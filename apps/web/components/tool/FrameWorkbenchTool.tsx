"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FRAME_CHECKSUM_PRESETS,
  FRAME_FIELD_TYPES,
  checksumByteCount,
  decodeFrame,
  decodeLayout,
  encodeLayout,
  ftprojToLayout,
  layoutToFtproj,
  parseHex,
  validateLayout,
  type FrameChecksumPreset,
  type FrameEndian,
  type FrameFieldType,
  type FrameLayout,
} from "@testbench/bench-core";
import { CopyButton } from "@/components/CopyButton";
import { useToolText } from "@/components/tool/useToolText";

// Same field palette as the bit-field extractor, so a field reads the same colour on both.
const FIELD_COLORS = ["#7dd3fc", "#5eead4", "#fcd34d", "#fda4af", "#bef264", "#93c5fd", "#fdba74", "#f9a8d4"];

const inputCls =
  "w-full rounded-btn border border-line-strong bg-well px-2 py-1.5 font-mono text-xs text-ink outline-none transition-colors focus:border-mute";
const btnCls =
  "rounded-btn border border-line-strong px-3 py-1.5 text-sm text-body transition-colors hover:border-mute";

interface Example {
  label: string;
  layout: FrameLayout;
  frames: string;
}

/** Both examples are rows of vectors/frame-frameterm.json, so they are known to decode as shown. */
const EXAMPLES: Example[] = [
  {
    label: "FrameTerm demo protocol",
    layout: {
      checksum: { preset: "CRC16_MODBUS", offsetFromEnd: 2, byteOrder: "LE", coverageStart: 0, coverageEndOffsetFromEnd: 2 },
      fields: [
        { name: "seq", offset: 2, type: "u8", endian: "LE" },
        { name: "temp", offset: 3, type: "s16", endian: "BE" },
        { name: "status", offset: 5, type: "u8", endian: "LE" },
      ],
    },
    frames: "A5 06 07 00 E1 01 18 0A\nA5 06 08 00 EB 00 DC 7E\nA5 06 09 00 F5 00 2B DD",
  },
  {
    label: "Modbus RTU float reply",
    layout: {
      checksum: { preset: "CRC16_MODBUS", offsetFromEnd: 2, byteOrder: "LE", coverageStart: 0, coverageEndOffsetFromEnd: 2 },
      fields: [
        { name: "slave", offset: 0, type: "u8", endian: "LE" },
        { name: "function", offset: 1, type: "u8", endian: "LE" },
        { name: "byteCount", offset: 2, type: "u8", endian: "LE" },
        { name: "value", offset: 3, type: "f32", endian: "BE" },
      ],
    },
    frames: "01 03 04 41 20 00 00 EF C5\n01 03 04 BF C0 00 00 DF DB\n11 03 04 41 BE 00 00 9E EA",
  },
];

const PRESET_LABEL: Record<FrameChecksumPreset, string> = {
  None: "None",
  CRC16_MODBUS: "CRC-16/MODBUS",
  CRC16_CCITT_FALSE: "CRC-16/CCITT-FALSE",
  CRC32: "CRC-32",
  CRC8: "CRC-8",
  XOR8: "XOR8",
  SUM8: "SUM8",
};

const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
const hexN = (n: number, bytes: number) => "0x" + n.toString(16).toUpperCase().padStart(bytes * 2, "0");

function numOr(text: string, fallback: number): number {
  return /^\d{1,4}$/.test(text.trim()) ? Number(text.trim()) : fallback;
}

export function FrameWorkbenchTool() {
  const t = useToolText();
  const [layout, setLayout] = useState<FrameLayout>(EXAMPLES[0]!.layout);
  const [framesText, setFramesText] = useState(EXAMPLES[0]!.frames);
  const [selected, setSelected] = useState(0);
  const [base, setBase] = useState<Record<string, unknown> | undefined>(undefined);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // A shared link carries the layout in the fragment; open it once on load.
  useEffect(() => {
    if (!window.location.hash) return;
    const shared = decodeLayout(decodeURIComponent(window.location.hash.slice(1)));
    if (shared) {
      setLayout(shared);
      setFramesText("");
      setNotice({ kind: "ok", text: t("Layout loaded from the link. Paste your frames below.") });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = validateLayout(layout);

  const frames = useMemo(() => {
    return framesText
      .split("\n")
      .map((line, i) => ({ line: i + 1, text: line.trim() }))
      .filter((l) => l.text !== "")
      .map((l) => {
        const parsed = parseHex(l.text);
        return parsed.ok
          ? { line: l.line, ok: true as const, bytes: parsed.bytes, decoded: check.ok ? decodeFrame(layout, parsed.bytes) : null }
          : { line: l.line, ok: false as const, error: parsed.error };
      });
  }, [framesText, layout, check.ok]);

  const summary = useMemo(() => {
    let ok = 0, fail = 0;
    for (const f of frames) {
      if (f.ok && f.decoded?.checksum.status === "ok") ok++;
      else if (f.ok && f.decoded?.checksum.status === "fail") fail++;
    }
    return { ok, fail };
  }, [frames]);

  const sel = frames[Math.min(selected, frames.length - 1)];

  function setChecksum(patch: Partial<FrameLayout["checksum"]>) {
    setLayout((l) => {
      const next = { ...l.checksum, ...patch };
      // Moving to a preset of a different width puts the checksum (and the end of
      // coverage) at the end of the frame — the overwhelmingly common placement.
      if (patch.preset && checksumByteCount(patch.preset) !== checksumByteCount(l.checksum.preset)) {
        const n = checksumByteCount(patch.preset);
        next.offsetFromEnd = n;
        next.coverageEndOffsetFromEnd = n;
      }
      return { ...l, checksum: next };
    });
  }

  function setField(i: number, patch: Partial<FrameLayout["fields"][number]>) {
    setLayout((l) => ({ ...l, fields: l.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) }));
  }

  function loadExample(ex: Example) {
    setLayout(ex.layout);
    setFramesText(ex.frames);
    setSelected(0);
    setBase(undefined);
    setNotice(null);
  }

  function makeShareLink() {
    const url = `${window.location.origin}${window.location.pathname}#${encodeLayout(layout)}`;
    window.history.replaceState(null, "", url);
    setShareUrl(url);
  }

  function exportFtproj() {
    const blob = new Blob([layoutToFtproj(layout, base)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "frame-layout.ftproj";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importFtproj(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = ftprojToLayout(String(reader.result ?? ""));
      if (!result.ok) {
        setNotice({ kind: "err", text: result.error });
        return;
      }
      setLayout(result.layout);
      setBase(result.base);
      setNotice({
        kind: "ok",
        text: t("Imported {file}. Framing ({mode}) and the rest of the project are kept for export.")
          .replace("{file}", file.name)
          .replace("{mode}", result.framingMode),
      });
    };
    reader.readAsText(file);
  }

  // Which field (or the checksum) owns each byte of the selected frame.
  const owners = useMemo(() => {
    const map = new Map<number, { color: string; label: string }>();
    if (!sel?.ok || !sel.decoded) return map;
    const c = sel.decoded.checksum;
    if (c.at) for (let b = c.at[0]; b < c.at[1]; b++) map.set(b, { color: c.status === "ok" ? "var(--tb-ok)" : "var(--tb-err)", label: t("checksum") });
    sel.decoded.fields.forEach((f, i) => {
      if (!f.available) return;
      for (let b = f.range[0]; b < f.range[1]; b++) if (!map.has(b)) map.set(b, { color: FIELD_COLORS[i % FIELD_COLORS.length]!, label: f.name });
    });
    return map;
  }, [sel, t]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-mute">{t("Examples")}</span>
        {EXAMPLES.map((ex) => (
          <button key={ex.label} type="button" onClick={() => loadExample(ex)} className={btnCls}>
            {t(ex.label)}
          </button>
        ))}
      </div>

      {/* checksum placement */}
      <fieldset className="mt-4">
        <legend className="text-xs font-medium uppercase tracking-wide text-mute">{t("Checksum")}</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <label className="text-[11px] text-mute">
            {t("Algorithm")}
            <select value={layout.checksum.preset} onChange={(e) => setChecksum({ preset: e.target.value as FrameChecksumPreset })} className={`${inputCls} mt-1`}>
              {FRAME_CHECKSUM_PRESETS.map((p) => <option key={p} value={p}>{p === "None" ? t("None") : PRESET_LABEL[p]}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-mute">
            {t("Bytes from end")}
            <input value={String(layout.checksum.offsetFromEnd)} onChange={(e) => setChecksum({ offsetFromEnd: numOr(e.target.value, layout.checksum.offsetFromEnd) })} inputMode="numeric" className={`${inputCls} mt-1`} />
          </label>
          <label className="text-[11px] text-mute">
            {t("Byte order")}
            <select value={layout.checksum.byteOrder} onChange={(e) => setChecksum({ byteOrder: e.target.value as FrameEndian })} className={`${inputCls} mt-1`}>
              <option value="LE">{t("Little-endian (low byte first)")}</option>
              <option value="BE">{t("Big-endian (high byte first)")}</option>
            </select>
          </label>
          <label className="text-[11px] text-mute">
            {t("Coverage from byte")}
            <input value={String(layout.checksum.coverageStart)} onChange={(e) => setChecksum({ coverageStart: numOr(e.target.value, layout.checksum.coverageStart) })} inputMode="numeric" className={`${inputCls} mt-1`} />
          </label>
          <label className="text-[11px] text-mute">
            {t("Coverage stops before end −")}
            <input value={String(layout.checksum.coverageEndOffsetFromEnd)} onChange={(e) => setChecksum({ coverageEndOffsetFromEnd: numOr(e.target.value, layout.checksum.coverageEndOffsetFromEnd) })} inputMode="numeric" className={`${inputCls} mt-1`} />
          </label>
        </div>
      </fieldset>

      {/* fields */}
      <fieldset className="mt-4">
        <legend className="text-xs font-medium uppercase tracking-wide text-mute">{t("Fields")}</legend>
        <div className="mt-1.5 space-y-2">
          <div className="grid grid-cols-[minmax(5.5rem,1fr)_3.25rem_4.75rem_4.25rem_auto] sm:grid-cols-[1fr_4rem_5rem_4.5rem_auto] items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-mute">
            <span>{t("Name")}</span><span>{t("Offset")}</span><span>{t("Type")}</span><span>{t("Endian")}</span><span />
          </div>
          {layout.fields.map((f, i) => (
            <div key={i} className="grid grid-cols-[minmax(5.5rem,1fr)_3.25rem_4.75rem_4.25rem_auto] sm:grid-cols-[1fr_4rem_5rem_4.5rem_auto] items-center gap-2">
              <input value={f.name} onChange={(e) => setField(i, { name: e.target.value })} spellCheck={false}
                aria-label={t("Field {n} name").replace("{n}", String(i + 1))} className={inputCls}
                style={{ borderLeftColor: FIELD_COLORS[i % FIELD_COLORS.length], borderLeftWidth: 3 }} />
              <input value={String(f.offset)} onChange={(e) => setField(i, { offset: numOr(e.target.value, f.offset) })} inputMode="numeric"
                aria-label={t("Field {n} offset").replace("{n}", String(i + 1))} className={inputCls} />
              <select value={f.type} onChange={(e) => setField(i, { type: e.target.value as FrameFieldType })}
                aria-label={t("Field {n} type").replace("{n}", String(i + 1))} className={inputCls}>
                {FRAME_FIELD_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
              </select>
              <select value={f.endian} onChange={(e) => setField(i, { endian: e.target.value as FrameEndian })} disabled={f.type === "u8" || f.type === "s8"}
                aria-label={t("Field {n} byte order").replace("{n}", String(i + 1))} className={`${inputCls} disabled:opacity-40`}>
                <option value="LE">LE</option>
                <option value="BE">BE</option>
              </select>
              <button type="button" onClick={() => setLayout((l) => ({ ...l, fields: l.fields.filter((_, idx) => idx !== i) }))}
                aria-label={t("Remove field {n}").replace("{n}", String(i + 1))}
                className="rounded-btn border border-line-strong px-2 py-1 text-sm text-mute transition-colors hover:border-mute hover:text-body">
                −
              </button>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setLayout((l) => ({ ...l, fields: [...l.fields, { name: `field${l.fields.length + 1}`, offset: 0, type: "u8", endian: "LE" }] }))}
          className={`${btnCls} mt-2.5`}>
          {t("+ Add field")}
        </button>
        {!check.ok && <p className="mt-2 font-mono text-xs text-err" role="alert">{check.error}</p>}
      </fieldset>

      {/* frames */}
      <div className="mt-4">
        <label htmlFor="fw-frames" className="text-xs font-medium uppercase tracking-wide text-mute">{t("Frames (hex, one per line)")}</label>
        <textarea id="fw-frames" value={framesText} onChange={(e) => { setFramesText(e.target.value); setSelected(0); }}
          rows={4} spellCheck={false} placeholder="01 03 00 00 00 0A C5 CD"
          className="mt-2 w-full resize-y rounded-btn border border-line-strong bg-well px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors placeholder:text-mute focus:border-mute" />
      </div>

      {/* results */}
      {frames.length > 0 && check.ok && (
        <div className="mt-4">
          {layout.checksum.preset !== "None" && (
            <p className="font-mono text-xs text-mute">
              {t("{n} frames").replace("{n}", String(frames.length))} ·{" "}
              <span className="text-ok">{summary.ok} OK</span> ·{" "}
              <span className={summary.fail ? "text-err" : ""}>{summary.fail} FAIL</span>
            </p>
          )}
          <div className="mt-2 overflow-x-auto rounded-btn border border-line-soft">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">{t("Len")}</th>
                  <th className="px-2 py-1.5">{t("Checksum")}</th>
                  {layout.fields.map((f, i) => (
                    <th key={i} className="px-2 py-1.5" style={{ color: FIELD_COLORS[i % FIELD_COLORS.length] }}>{f.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {frames.map((fr, idx) => (
                  <tr key={fr.line} onClick={() => setSelected(idx)}
                    className={`cursor-pointer border-t border-line-soft ${idx === selected ? "bg-elevated" : "hover:bg-elevated"}`}>
                    <td className="px-2 py-1.5 text-mute">{fr.line}</td>
                    {!fr.ok ? (
                      <td colSpan={2 + layout.fields.length} className="px-2 py-1.5 text-err">
                        {t("Invalid character “{char}” at position {index}").replace("{char}", fr.error.char).replace("{index}", String(fr.error.index))}
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-1.5 text-body">{fr.decoded!.length}</td>
                        <td className="px-2 py-1.5">
                          {fr.decoded!.checksum.status === "ok" && <span className="text-ok">OK</span>}
                          {fr.decoded!.checksum.status === "fail" && <span className="text-err">FAIL</span>}
                          {fr.decoded!.checksum.status === "none" && <span className="text-mute">—</span>}
                          {fr.decoded!.checksum.status === "error" && <span className="text-warn">{t("too short")}</span>}
                        </td>
                        {fr.decoded!.fields.map((v, i) => (
                          <td key={i} className={`px-2 py-1.5 ${v.available ? "text-ink" : "text-mute"}`}>{v.display}</td>
                        ))}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* selected frame, byte by byte */}
          {sel?.ok && sel.decoded && (
            <div className="mt-4">
              <div className="text-xs font-medium uppercase tracking-wide text-mute">
                {t("Frame {n}, byte by byte").replace("{n}", String(sel.line))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from(sel.bytes).map((b, i) => {
                  const o = owners.get(i);
                  return (
                    <span key={i} title={`${t("Byte")} ${i}${o ? ` · ${o.label}` : ""}`}
                      className="flex w-9 flex-col items-center rounded-[3px] border py-0.5 font-mono"
                      style={{ borderColor: o?.color ?? "var(--tb-border-soft)", backgroundColor: o ? `color-mix(in srgb, ${o.color} 14%, transparent)` : undefined }}>
                      <span className="text-sm text-ink">{hex2(b)}</span>
                      <span className="text-[9px] text-mute">{i}</span>
                    </span>
                  );
                })}
              </div>
              {sel.decoded.checksum.expected !== undefined && (
                <p className={`mt-2 font-mono text-xs ${sel.decoded.checksum.status === "ok" ? "text-ok" : "text-err"}`}>
                  {t("computed {exp} over bytes {a}–{b}, frame carries {act}")
                    .replace("{exp}", hexN(sel.decoded.checksum.expected, checksumByteCount(layout.checksum.preset)))
                    .replace("{a}", String(sel.decoded.checksum.coverage![0]))
                    .replace("{b}", String(sel.decoded.checksum.coverage![1] - 1))
                    .replace("{act}", hexN(sel.decoded.checksum.actual!, checksumByteCount(layout.checksum.preset)))}
                </p>
              )}
              {sel.decoded.checksum.status === "error" && (
                <p className="mt-2 font-mono text-xs text-warn">{sel.decoded.checksum.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* share / FrameTerm */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
        <button type="button" onClick={makeShareLink} disabled={!check.ok} className={`${btnCls} disabled:opacity-40`}>{t("Share layout link")}</button>
        <button type="button" onClick={exportFtproj} disabled={!check.ok} className={`${btnCls} disabled:opacity-40`}>{t("Export .ftproj for FrameTerm")}</button>
        <button type="button" onClick={() => fileRef.current?.click()} className={btnCls}>{t("Import .ftproj")}</button>
        <input ref={fileRef} type="file" accept=".ftproj,application/json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importFtproj(f); e.target.value = ""; }} />
      </div>
      {shareUrl && (
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-btn border border-line-soft bg-well px-2 py-1.5 font-mono text-xs text-body">{shareUrl}</code>
          <CopyButton text={shareUrl} />
        </div>
      )}
      {notice && <p className={`mt-2 font-mono text-xs ${notice.kind === "ok" ? "text-ok" : "text-err"}`} role="status">{notice.text}</p>}
      <p className="mt-3 text-xs text-mute">
        {t("The link carries the layout only — never your frames — and sits after the #, which browsers do not send to the server.")}
      </p>
    </div>
  );
}
