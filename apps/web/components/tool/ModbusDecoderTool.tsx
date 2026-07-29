"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bytesToHex,
  decodeModbus,
  parseHex,
  sniff,
  type ModbusProtocol,
} from "@testbench/engine";
import { HexInput } from "@/components/tool/HexInput";
import { useToolText } from "@/components/tool/useToolText";

// Pastel field-link colors (underline on bytes / row accent). No purple (banned).
const FIELD_COLORS = ["#7dd3fc", "#5eead4", "#fcd34d", "#fda4af", "#bef264", "#93c5fd", "#fdba74", "#f9a8d4"];

type ProtocolChoice = "auto" | ModbusProtocol;

export function ModbusDecoderTool() {
  const t = useToolText();
  const [input, setInput] = useState("11 03 00 6B 00 03 76 87");
  const [choice, setChoice] = useState<ProtocolChoice>("auto");
  const [debounced, setDebounced] = useState(input);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(input), 150);
    return () => clearTimeout(h);
  }, [input]);

  const parsed = useMemo(() => parseHex(debounced), [debounced]);
  const bytes = parsed.ok ? parsed.bytes : null;
  const result = useMemo(() => {
    if (!bytes || bytes.length === 0) return null;
    return decodeModbus(bytes, choice === "auto" ? undefined : choice);
  }, [bytes, choice]);
  const sniffed = bytes && bytes.length > 0 && choice === "auto" ? sniff(bytes) : null;

  // Map byte index → field index for color linking
  const owner = useMemo(() => {
    const map = new Map<number, number>();
    result?.fields.forEach((f, fi) => {
      for (let i = f.start; i < f.start + f.length; i++) map.set(i, fi);
    });
    return map;
  }, [result]);

  return (
    <div className="rounded-card border border-line-strong bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <HexInput
            value={input}
            onChange={setInput}
            mode="hex"
            onModeChange={() => {}}
            error={parsed.ok ? undefined : parsed.error}
            label={t("Frame bytes (hex)")}
          />
          <div>
            <label htmlFor="mb-protocol" className="text-xs font-medium uppercase tracking-wide text-mute">
              {t("Protocol")}
            </label>
            <select
              id="mb-protocol"
              value={choice}
              onChange={(e) => setChoice(e.target.value as ProtocolChoice)}
              className="mt-2 w-full rounded-btn border border-line-strong bg-well px-3 py-2 font-mono text-sm text-ink outline-none focus:border-mute md:w-44"
            >
              <option value="auto">{t("Auto-detect")}{sniffed ? ` (${sniffed.toUpperCase()})` : ""}</option>
              <option value="rtu">Modbus RTU</option>
              <option value="tcp">Modbus TCP</option>
            </select>
          </div>
        </div>

        {result && bytes && (
          <>
            {/* status banner */}
            {result.error ? (
              <p className="rounded-btn border border-err/40 px-3 py-2 font-mono text-sm text-err">
                {result.error}
              </p>
            ) : result.exception ? (
              <p className="rounded-btn border border-warn/40 px-3 py-2 font-mono text-sm text-warn">
                {t("Exception response")} — {result.exception.name} ({t("code")}{" "}
                {result.exception.code})
              </p>
            ) : result.crc ? (
              <p
                className={`rounded-btn border px-3 py-2 font-mono text-sm ${
                  result.crc.ok ? "border-ok/40 text-ok" : "border-err/40 text-err"
                }`}
              >
                {result.crc.ok
                  ? t("CRC valid")
                  : `${t("CRC FAIL")} — ${t("received")} 0x${result.crc.received.toString(16).toUpperCase().padStart(4, "0")}, ${t("computed")} 0x${result.crc.computed.toString(16).toUpperCase().padStart(4, "0")}`}
              </p>
            ) : (
              <p className="rounded-btn border border-ok/40 px-3 py-2 font-mono text-sm text-ok">
                {t("MBAP header consistent")}
              </p>
            )}

            {/* color-linked byte strip */}
            <div className="rounded-btn border border-line-soft bg-well p-3 font-mono text-sm leading-loose">
              {Array.from(bytes).map((b, i) => {
                const fi = owner.get(i);
                const color = fi !== undefined ? FIELD_COLORS[fi % FIELD_COLORS.length] : undefined;
                const active = fi !== undefined && fi === hovered;
                return (
                  <span
                    key={i}
                    onMouseEnter={() => setHovered(fi ?? null)}
                    onMouseLeave={() => setHovered(null)}
                    className="mr-1.5 inline-block cursor-default px-0.5 text-ink transition-colors"
                    style={{
                      borderBottom: color ? `2px solid ${color}` : undefined,
                      backgroundColor: active ? `${color}33` : undefined,
                    }}
                  >
                    {b.toString(16).toUpperCase().padStart(2, "0")}
                  </span>
                );
              })}
            </div>

            {/* field table */}
            <div className="overflow-x-auto rounded-btn border border-line-soft">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line-soft text-xs uppercase tracking-wide text-mute">
                    <th className="px-3 py-2 font-medium">{t("Field")}</th>
                    <th className="px-3 py-2 font-medium">{t("Bytes")}</th>
                    <th className="px-3 py-2 font-medium">{t("Value")}</th>
                    <th className="px-3 py-2 font-medium">{t("Meaning")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.fields.map((f, fi) => (
                    <tr
                      key={`${f.name}-${f.start}`}
                      onMouseEnter={() => setHovered(fi)}
                      onMouseLeave={() => setHovered(null)}
                      className={`border-b border-line-soft transition-colors last:border-0 ${
                        hovered === fi ? "bg-elevated" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-body">
                        <span
                          className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                          style={{ backgroundColor: FIELD_COLORS[fi % FIELD_COLORS.length] }}
                        />
                        {f.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-[13px] text-mute">
                        {bytesToHex(bytes.slice(f.start, f.start + f.length))}
                      </td>
                      <td className="px-3 py-2 font-mono text-[13px] text-ink">{f.value}</td>
                      <td className="px-3 py-2 text-mute">{f.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
