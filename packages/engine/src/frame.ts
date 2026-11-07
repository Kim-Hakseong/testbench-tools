// Frame workbench — decode a binary frame against a declared layout: one
// checksum placement plus typed fields at fixed offsets. Pure TS, no DOM.
//
// The layout model is FrameTerm's (testbench-frameterm, Ft.Core): the same
// checksum presets, the same placement semantics (offset from the end, coverage
// from a start offset to an offset from the end) and the same seven field
// types. That is deliberate — a layout built here exports as a .ftproj that the
// desktop app opens unchanged, and the golden vectors in
// vectors/frame-frameterm.json were produced by running FrameTerm's own C#
// engine, so agreement is checked against an independent implementation.

import { crc, sum8, xor8, type CrcParams } from "./checksum";

export type FrameFieldType = "u8" | "s8" | "u16" | "s16" | "u32" | "s32" | "f32";
export type FrameEndian = "LE" | "BE";
export type FrameChecksumPreset =
  | "None"
  | "CRC16_MODBUS"
  | "CRC16_CCITT_FALSE"
  | "CRC32"
  | "CRC8"
  | "XOR8"
  | "SUM8";

export const FRAME_FIELD_TYPES: FrameFieldType[] = ["u8", "s8", "u16", "s16", "u32", "s32", "f32"];
export const FRAME_CHECKSUM_PRESETS: FrameChecksumPreset[] = [
  "None", "CRC16_MODBUS", "CRC16_CCITT_FALSE", "CRC32", "CRC8", "XOR8", "SUM8",
];

export interface FrameField {
  name: string;
  offset: number;
  type: FrameFieldType;
  endian: FrameEndian;
}

export interface FrameChecksum {
  preset: FrameChecksumPreset;
  /** Checksum starts this many bytes before the end of the frame. */
  offsetFromEnd: number;
  byteOrder: FrameEndian;
  /** Coverage runs from this offset… */
  coverageStart: number;
  /** …up to this many bytes before the end. */
  coverageEndOffsetFromEnd: number;
}

export interface FrameLayout {
  checksum: FrameChecksum;
  fields: FrameField[];
}

/** FrameTerm's preset ids → parameters (Ft.Core ChecksumPresets). */
const CRC_BY_PRESET: Partial<Record<FrameChecksumPreset, CrcParams>> = {
  CRC16_MODBUS: { width: 16, poly: 0x8005, init: 0xffff, refin: true, refout: true, xorout: 0x0000 },
  CRC16_CCITT_FALSE: { width: 16, poly: 0x1021, init: 0xffff, refin: false, refout: false, xorout: 0x0000 },
  CRC32: { width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: true, refout: true, xorout: 0xffffffff },
  CRC8: { width: 8, poly: 0x07, init: 0x00, refin: false, refout: false, xorout: 0x00 },
};

/** Bytes the checksum occupies in the frame (0 for None). */
export function checksumByteCount(preset: FrameChecksumPreset): number {
  if (preset === "None") return 0;
  const p = CRC_BY_PRESET[preset];
  return p ? p.width / 8 : 1;
}

export function fieldByteCount(type: FrameFieldType): number {
  return type === "u8" || type === "s8" ? 1 : type === "u16" || type === "s16" ? 2 : 4;
}

function computeChecksum(preset: FrameChecksumPreset, data: Uint8Array): number {
  if (preset === "XOR8") return xor8(data);
  if (preset === "SUM8") return sum8(data);
  return crc(data, CRC_BY_PRESET[preset]!);
}

function readUnsigned(bytes: Uint8Array, endian: FrameEndian): number {
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = endian === "LE" ? bytes[bytes.length - 1 - i]! : bytes[i]!;
    v = v * 256 + b;
  }
  return v;
}

export type ChecksumStatus = "none" | "ok" | "fail" | "error";

export interface ChecksumResult {
  status: ChecksumStatus;
  /** Set for ok/fail. */
  expected?: number;
  actual?: number;
  /** Byte ranges [start, end) — set for ok/fail. */
  at?: [number, number];
  coverage?: [number, number];
  /** Set for error. */
  error?: string;
}

/** Same rules as FrameTerm's ChecksumPlacement.Verify. */
export function verifyFrameChecksum(c: FrameChecksum, frame: Uint8Array): ChecksumResult {
  if (c.preset === "None") return { status: "none" };
  const n = checksumByteCount(c.preset);
  const start = frame.length - c.offsetFromEnd;
  if (start < 0 || start + n > frame.length) {
    return { status: "error", error: "Frame too short for checksum placement." };
  }
  const coverageEnd = frame.length - c.coverageEndOffsetFromEnd;
  if (c.coverageStart < 0 || coverageEnd < c.coverageStart || coverageEnd > frame.length) {
    return { status: "error", error: "Frame too short for checksum coverage." };
  }
  const expected = computeChecksum(c.preset, frame.subarray(c.coverageStart, coverageEnd));
  const actual = readUnsigned(frame.subarray(start, start + n), c.byteOrder);
  return {
    status: expected === actual ? "ok" : "fail",
    expected,
    actual,
    at: [start, start + n],
    coverage: [c.coverageStart, coverageEnd],
  };
}

/**
 * A float32 as FrameTerm prints it (.NET float.ToString("R")): the shortest
 * digits that round-trip, scientific notation below 1e-4 or from 1e9 up, with
 * an at-least-two-digit exponent ("1E-05", "3.4028235E+38").
 */
export function formatFloat32(x: number): string {
  if (Number.isNaN(x)) return "NaN";
  if (x === Infinity) return "Infinity";
  if (x === -Infinity) return "-Infinity";
  if (x === 0) return Object.is(x, -0) ? "-0" : "0";
  let digits = "";
  let exp = 0;
  for (let p = 1; p <= 9; p++) {
    const s = x.toExponential(p - 1);
    if (Math.fround(Number(s)) === x || p === 9) {
      const m = /^-?(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(s)!;
      digits = (m[1]! + (m[2] ?? "")).replace(/0+$/, "") || "0";
      exp = Number(m[3]);
      break;
    }
  }
  const sign = x < 0 ? "-" : "";
  if (exp < -4 || exp >= 9) {
    const mant = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
    const e = Math.abs(exp).toString().padStart(2, "0");
    return `${sign}${mant}E${exp < 0 ? "-" : "+"}${e}`;
  }
  if (exp < 0) return `${sign}0.${"0".repeat(-exp - 1)}${digits}`;
  if (digits.length <= exp + 1) return `${sign}${digits}${"0".repeat(exp + 1 - digits.length)}`;
  return `${sign}${digits.slice(0, exp + 1)}.${digits.slice(exp + 1)}`;
}

export interface FieldResult {
  name: string;
  available: boolean;
  value: number | null;
  display: string;
  /** Byte range [start, end) inside the frame. */
  range: [number, number];
  /** The raw bytes as they sit in the frame. */
  raw: number[];
}

/** Same rules as FrameTerm's FieldParser.ParseOne: out of range → "N/A". */
export function decodeFrameField(f: FrameField, frame: Uint8Array): FieldResult {
  const n = fieldByteCount(f.type);
  const range: [number, number] = [f.offset, f.offset + n];
  if (f.offset < 0 || f.offset + n > frame.length) {
    return { name: f.name, available: false, value: null, display: "N/A", range, raw: [] };
  }
  const slice = frame.subarray(f.offset, f.offset + n);
  const u = readUnsigned(slice, f.endian);
  let value: number;
  let display: string;
  switch (f.type) {
    case "s8": value = u >= 0x80 ? u - 0x100 : u; break;
    case "s16": value = u >= 0x8000 ? u - 0x10000 : u; break;
    case "s32": value = u >= 0x80000000 ? u - 0x100000000 : u; break;
    case "f32": {
      const dv = new DataView(new ArrayBuffer(4));
      dv.setUint32(0, u);
      value = dv.getFloat32(0);
      break;
    }
    default: value = u;
  }
  if (f.type === "f32") display = formatFloat32(value);
  else display = String(value);
  return { name: f.name, available: true, value, display, range, raw: Array.from(slice) };
}

export interface FrameDecode {
  length: number;
  checksum: ChecksumResult;
  fields: FieldResult[];
}

export function decodeFrame(layout: FrameLayout, frame: Uint8Array): FrameDecode {
  return {
    length: frame.length,
    checksum: verifyFrameChecksum(layout.checksum, frame),
    fields: layout.fields.map((f) => decodeFrameField(f, frame)),
  };
}

// ---------------------------------------------------------------------------
// Layout validation
// ---------------------------------------------------------------------------

export type LayoutCheck = { ok: true } | { ok: false; error: string };

export function validateLayout(layout: FrameLayout): LayoutCheck {
  const c = layout.checksum;
  if (!FRAME_CHECKSUM_PRESETS.includes(c.preset)) return { ok: false, error: `Unknown checksum preset '${c.preset}'.` };
  for (const k of ["offsetFromEnd", "coverageStart", "coverageEndOffsetFromEnd"] as const) {
    if (!Number.isInteger(c[k]) || c[k] < 0) return { ok: false, error: `Checksum ${k} must be a whole number ≥ 0.` };
  }
  for (const f of layout.fields) {
    if (f.name.trim() === "") return { ok: false, error: "Field name is required." };
    if (!FRAME_FIELD_TYPES.includes(f.type)) return { ok: false, error: `Field '${f.name}': unknown type '${f.type}'.` };
    if (!Number.isInteger(f.offset) || f.offset < 0) return { ok: false, error: `Field '${f.name}': offset must be a whole number ≥ 0.` };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// .ftproj — FrameTerm project files
// ---------------------------------------------------------------------------

/**
 * Write a layout as a FrameTerm project (schemaVersion 1, camelCase — the shape
 * FtProjectSerializer reads). `base` is a previously imported project: its
 * transport, framing, highlights and macros are kept, so importing a project,
 * editing the fields here and exporting again loses nothing.
 */
export function layoutToFtproj(layout: FrameLayout, base?: Record<string, unknown>): string {
  const project: Record<string, unknown> = {
    schemaVersion: 1,
    transport: { type: "Serial", port: "", baud: 115200, parity: "None", dataBits: 8, stopBits: "1", flowControl: "None", host: "127.0.0.1", tcpPort: 5000 },
    framing: { mode: "None", startHex: "", endHex: "", escapeHex: "", length: 8, headerLen: 2, lenOffset: 1, lenSize: 1, endian: "LE", lenAdjust: 0, gapMs: 20, maxFrame: 4096 },
    highlights: [],
    macros: [],
    autoResponds: [],
    ...(base ?? {}),
  };
  project.checksum = { ...layout.checksum };
  project.fields = layout.fields.map((f) => ({ name: f.name, offset: f.offset, type: f.type, endian: f.endian }));
  return JSON.stringify(project, null, 2);
}

export type FtprojImport =
  | { ok: true; layout: FrameLayout; base: Record<string, unknown>; framingMode: string }
  | { ok: false; error: string };

/** Read a FrameTerm project. Property names are matched case-insensitively, as FrameTerm does. */
export function ftprojToLayout(json: string): FtprojImport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "Not a JSON file." };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, error: "Not a FrameTerm project." };
  const pick = (o: unknown, key: string): unknown => {
    if (typeof o !== "object" || o === null) return undefined;
    const hit = Object.keys(o).find((k) => k.toLowerCase() === key.toLowerCase());
    return hit === undefined ? undefined : (o as Record<string, unknown>)[hit];
  };
  const version = pick(raw, "schemaVersion");
  if (typeof version === "number" && version > 1) {
    return { ok: false, error: `Project schema version ${version} is newer than this tool supports.` };
  }
  const cs = pick(raw, "checksum");
  const presetRaw = String(pick(cs, "preset") ?? "None");
  const preset = FRAME_CHECKSUM_PRESETS.find((p) => p.toLowerCase() === presetRaw.toLowerCase());
  if (!preset) return { ok: false, error: `Unknown checksum preset '${presetRaw}'.` };
  const int = (v: unknown, d: number) => (typeof v === "number" && Number.isInteger(v) ? v : d);
  const endian = (v: unknown): FrameEndian => (String(v ?? "LE").toUpperCase() === "BE" ? "BE" : "LE");
  const checksum: FrameChecksum = {
    preset,
    offsetFromEnd: int(pick(cs, "offsetFromEnd"), 2),
    byteOrder: endian(pick(cs, "byteOrder")),
    coverageStart: int(pick(cs, "coverageStart"), 0),
    coverageEndOffsetFromEnd: int(pick(cs, "coverageEndOffsetFromEnd"), 2),
  };
  const fieldsRaw = pick(raw, "fields");
  const fields: FrameField[] = [];
  for (const f of Array.isArray(fieldsRaw) ? fieldsRaw : []) {
    const type = String(pick(f, "type") ?? "u8").toLowerCase() as FrameFieldType;
    fields.push({ name: String(pick(f, "name") ?? ""), offset: int(pick(f, "offset"), 0), type, endian: endian(pick(f, "endian")) });
  }
  const layout = { checksum, fields };
  const check = validateLayout(layout);
  if (!check.ok) return check;
  const base: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!["checksum", "fields"].includes(k.toLowerCase())) base[k] = v;
  }
  return { ok: true, layout, base, framingMode: String(pick(pick(raw, "framing"), "mode") ?? "None") };
}

// ---------------------------------------------------------------------------
// Share links — the layout (never the frame data) in a URL fragment
// ---------------------------------------------------------------------------

/**
 * Compact text form of a layout for a `#…` fragment. A fragment is not sent to
 * the server, so a shared link carries the layout without it leaving the
 * browser. Frames are deliberately not included: they are the user's data.
 *
 * Form: `v1;<preset>,<offsetFromEnd>,<byteOrder>,<coverageStart>,<coverageEndOffsetFromEnd>;<name>:<offset>:<type>:<endian>;…`
 * with names percent-encoded.
 */
export function encodeLayout(layout: FrameLayout): string {
  const c = layout.checksum;
  const head = `v1;${c.preset},${c.offsetFromEnd},${c.byteOrder},${c.coverageStart},${c.coverageEndOffsetFromEnd}`;
  const fields = layout.fields.map((f) => `${encodeURIComponent(f.name)}:${f.offset}:${f.type}:${f.endian}`);
  return [head, ...fields].join(";");
}

export function decodeLayout(text: string): FrameLayout | null {
  const parts = text.replace(/^#/, "").split(";");
  if (parts[0] !== "v1" || parts.length < 2) return null;
  const c = parts[1]!.split(",");
  if (c.length !== 5) return null;
  const preset = FRAME_CHECKSUM_PRESETS.find((p) => p === c[0]);
  const nums = [c[1], c[3], c[4]].map((s) => (/^\d{1,4}$/.test(s ?? "") ? Number(s) : NaN));
  if (!preset || nums.some(Number.isNaN) || (c[2] !== "LE" && c[2] !== "BE")) return null;
  const fields: FrameField[] = [];
  for (const p of parts.slice(2)) {
    const m = /^([^:]*):(\d{1,4}):(u8|s8|u16|s16|u32|s32|f32):(LE|BE)$/.exec(p);
    if (!m) return null;
    let name: string;
    try { name = decodeURIComponent(m[1]!); } catch { return null; }
    fields.push({ name, offset: Number(m[2]), type: m[3] as FrameFieldType, endian: m[4] as FrameEndian });
  }
  const layout: FrameLayout = {
    checksum: { preset, offsetFromEnd: nums[0]!, byteOrder: c[2] as FrameEndian, coverageStart: nums[1]!, coverageEndOffsetFromEnd: nums[2]! },
    fields,
  };
  return validateLayout(layout).ok ? layout : null;
}
