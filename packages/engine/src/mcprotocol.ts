// Mitsubishi MC protocol (MELSEC Communication Protocol), 3E frame. Pure TS, no DOM.
//
// One request, two encodings — and the encodings disagree about field order:
//
//   binary request data   Command | Subcommand | Head device No. | Device code | No. of points
//   ASCII  request data   Command | Subcommand | Device code | Head device No. | No. of points
//
// On top of that, every numeric field is little-endian in binary (command 0401H
// goes on the wire as 01 04) and upper-digit-first in ASCII ("0401"). Decoding a
// frame with the other mode's rules is the classic MC-protocol bug, so both
// orders live in exactly one place here — writeRequestData() and
// readRequestData() — and the caller never gets to assemble a device field.
//
// Field layouts, commands, subcommands, device codes and point limits are from:
//   MELSEC Communication Protocol Reference Manual, SH(NA)-080008-AB (2022-05)
//   SLMP Reference Manual, SH(NA)-080956ENG-M (2025-05)
//   Q Corresponding Ethernet Interface Module User's Manual (Basic), SH(NA)-080009-X
// See vectors/mcprotocol.json for the manuals' own worked frames.
//
// End codes are deliberately not tabulated. The manuals give 0000H = normal
// completion and redirect to the module's own manual for everything else, so
// this module surfaces the code and refuses to guess what it means.

/** Frame encoding. The 3E frame is defined in both, with different field order. */
export type McMode = "binary" | "ascii";

/**
 * Subcommand family. The CPU series does not change the frame layout — it
 * changes the subcommand numbers and the width of the device fields.
 */
export type McSeries = "q-l" | "iq-r";

/** Access unit of a batch read/write. */
export type McUnit = "word" | "bit";

/** Commands this module builds. */
export type McCommand = "batch-read" | "batch-write";

/** Radix a device number is written in. */
export type McRadix = "decimal" | "hexadecimal";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Request subheader, sent as the two bytes 50H 00H (ASCII "5000"). */
export const MC_SUBHEADER_REQUEST = 0x5000;
/** Response subheader, sent as the two bytes D0H 00H (ASCII "D000"). */
export const MC_SUBHEADER_RESPONSE = 0xd000;

/** Batch read command. */
export const MC_COMMAND_BATCH_READ = 0x0401;
/** Batch write command. */
export const MC_COMMAND_BATCH_WRITE = 0x1401;

/** Network No. of the host station. */
export const MC_HOST_NETWORK_NO = 0x00;
/** PC No. of the host station. */
export const MC_HOST_PC_NO = 0xff;
/** Request destination module I/O No. of the host station's own CPU. */
export const MC_HOST_IO_NO = 0x03ff;
/** Request destination module station No. of the host station. */
export const MC_HOST_STATION_NO = 0x00;

/** Maximum points for a word-unit batch read/write. */
export const MC_MAX_POINTS_WORD = 960;
/** Maximum points for a bit-unit batch read/write in ASCII mode. */
export const MC_MAX_POINTS_BIT_ASCII = 3584;
/** Maximum points for a bit-unit batch read/write in binary mode. */
export const MC_MAX_POINTS_BIT_BINARY = 7168;

/** Normal completion end code. Every other value is module-specific. */
export const MC_END_CODE_NORMAL = 0x0000;

// ---------------------------------------------------------------------------
// Little-endian / ASCII field helpers
//
// The whole binary-vs-ASCII asymmetry for numeric fields is these four
// functions: binary writes the low byte first, ASCII writes the upper digit
// first. Nothing else in the module touches byte order.
// ---------------------------------------------------------------------------

/** Little-endian bytes of a value — low byte first, as every binary field is. */
export function mcLeBytes(value: number, byteCount: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < byteCount; i++) {
    out.push(Math.floor(value / 256 ** i) % 256);
  }
  return out;
}

/** Read a little-endian field. NaN if the field runs past the end of `bytes`. */
export function mcLeValue(bytes: ArrayLike<number>, offset: number, byteCount: number): number {
  if (offset < 0 || offset + byteCount > bytes.length) return NaN;
  let value = 0;
  for (let i = 0; i < byteCount; i++) value += bytes[offset + i]! * 256 ** i;
  return value;
}

/**
 * An ASCII-mode numeric field: uppercase, zero-padded, UPPER DIGIT FIRST —
 * the opposite of the binary order. `base` is 16 for protocol fields and the
 * device's own radix for a head device No.
 */
export function mcAsciiField(value: number, digits: number, base = 16): string {
  return value.toString(base).toUpperCase().padStart(digits, "0");
}

/** Read an ASCII-mode numeric field. NaN if it is short or not a legal digit string. */
export function mcAsciiValue(text: string, offset: number, digits: number, base = 16): number {
  const slice = text.slice(offset, offset + digits);
  if (slice.length !== digits) return NaN;
  const legal = base === 16 ? /^[0-9A-Fa-f]+$/ : /^[0-9]+$/;
  if (!legal.test(slice)) return NaN;
  return parseInt(slice, base);
}

/** Numeric base behind a radix name. */
export function mcRadixBase(radix: McRadix): number {
  return radix === "hexadecimal" ? 16 : 10;
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

/** A device and the three ways the protocol names it. */
export interface McDeviceCode {
  /** Device symbol as MELSEC writes it, e.g. "D", "TN", "ZR". */
  symbol: string;
  name: string;
  /**
   * Binary device code. MELSEC-Q/L sends it as one byte; MELSEC iQ-R sends the
   * same value as a two-byte little-endian field (A8H → 00A8H → A8 00).
   */
  code: number;
  /** ASCII device code, MELSEC-Q/L 2-character form ("D*"). */
  ascii2: string;
  /** ASCII device code, MELSEC iQ-R 4-character form ("D***"). */
  ascii4: string;
  /** Radix the device NUMBER is written in — X/Y/B/W/ZR/SB/SW/DX/DY are hex. */
  radix: McRadix;
}

function device(symbol: string, name: string, code: number, radix: McRadix): McDeviceCode {
  return {
    symbol,
    name,
    code,
    ascii2: symbol.padEnd(2, "*"),
    ascii4: symbol.padEnd(4, "*"),
    radix,
  };
}

/** Device code table. */
export const MC_DEVICE_CODES: McDeviceCode[] = [
  device("D", "Data register", 0xa8, "decimal"),
  device("M", "Internal relay", 0x90, "decimal"),
  device("X", "Input", 0x9c, "hexadecimal"),
  device("Y", "Output", 0x9d, "hexadecimal"),
  device("B", "Link relay", 0xa0, "hexadecimal"),
  device("W", "Link register", 0xb4, "hexadecimal"),
  device("SM", "Special relay", 0x91, "decimal"),
  device("SD", "Special register", 0xa9, "decimal"),
  device("L", "Latch relay", 0x92, "decimal"),
  device("F", "Annunciator", 0x93, "decimal"),
  device("V", "Edge relay", 0x94, "decimal"),
  device("S", "Step relay", 0x98, "decimal"),
  device("TS", "Timer contact", 0xc1, "decimal"),
  device("TC", "Timer coil", 0xc0, "decimal"),
  device("TN", "Timer current value", 0xc2, "decimal"),
  device("CS", "Counter contact", 0xc4, "decimal"),
  device("CC", "Counter coil", 0xc3, "decimal"),
  device("CN", "Counter current value", 0xc5, "decimal"),
  device("Z", "Index register", 0xcc, "decimal"),
  device("R", "File register", 0xaf, "decimal"),
  device("ZR", "File register (serial number access)", 0xb0, "hexadecimal"),
  device("SB", "Link special relay", 0xa1, "hexadecimal"),
  device("SW", "Link special register", 0xb5, "hexadecimal"),
  device("DX", "Direct access input", 0xa2, "hexadecimal"),
  device("DY", "Direct access output", 0xa3, "hexadecimal"),
];

/** Look up a device by symbol. */
export function mcDeviceBySymbol(symbol: string): McDeviceCode | null {
  const upper = symbol.trim().toUpperCase();
  return MC_DEVICE_CODES.find((d) => d.symbol === upper) ?? null;
}

/** Look up a device by its binary device code. */
export function mcDeviceByCode(code: number): McDeviceCode | null {
  return MC_DEVICE_CODES.find((d) => d.code === code) ?? null;
}

/** Look up a device by its ASCII device code, in either the 2- or 4-character form. */
export function mcDeviceByAscii(text: string): McDeviceCode | null {
  const upper = text.toUpperCase();
  return MC_DEVICE_CODES.find((d) => d.ascii2 === upper || d.ascii4 === upper) ?? null;
}

/** A device plus the point it starts at. */
export interface McDeviceRef {
  device: McDeviceCode;
  /** The device number as an ordinary integer. */
  number: number;
  /** The device written the way MELSEC writes it, e.g. "D100" or "X1234". */
  text: string;
}

export type McDeviceParseResult = { ok: true; ref: McDeviceRef } | { ok: false; error: string };

/** Render a device number in the notation its device uses. */
export function formatMcDevice(dev: McDeviceCode, number: number): string {
  return `${dev.symbol}${number.toString(mcRadixBase(dev.radix)).toUpperCase()}`;
}

// Longest symbol first so TN100 is the timer current value rather than T + N100,
// and so ZR/SB/DX beat Z/S/D. A hexadecimal device number contains A-F, so the
// symbol cannot be found by splitting "letters then digits".
const SYMBOLS_LONGEST_FIRST = MC_DEVICE_CODES.map((d) => d.symbol).sort(
  (a, b) => b.length - a.length || a.localeCompare(b),
);

/** Parse a device address such as "D100", "TN100", "X1234" or "ZR1F". */
export function parseMcDevice(input: string): McDeviceParseResult {
  const text = input.trim().toUpperCase().replace(/\s+/g, "");
  if (text === "") return { ok: false, error: "Enter a device, e.g. D100" };

  let prefix: string | undefined;
  for (const symbol of SYMBOLS_LONGEST_FIRST) {
    if (!text.startsWith(symbol)) continue;
    prefix ??= symbol;

    const digits = text.slice(symbol.length);
    if (digits === "") continue;

    const dev = mcDeviceBySymbol(symbol)!;
    const legal = dev.radix === "hexadecimal" ? /^[0-9A-F]+$/ : /^[0-9]+$/;
    if (!legal.test(digits)) continue;

    const number = parseInt(digits, mcRadixBase(dev.radix));
    return { ok: true, ref: { device: dev, number, text: formatMcDevice(dev, number) } };
  }

  if (prefix === undefined) {
    return { ok: false, error: `${text} is not an MC protocol device — try D, M, X, Y, B, W, TN…` };
  }
  const digits = text.slice(prefix.length);
  if (digits === "") return { ok: false, error: `${prefix} needs a device number, e.g. ${prefix}0` };

  const dev = mcDeviceBySymbol(prefix)!;
  const legal = dev.radix === "hexadecimal" ? "0-9 and A-F" : "0-9";
  return {
    ok: false,
    error: `${prefix} is written in ${dev.radix}, so its digits are ${legal} — "${digits}" is not valid`,
  };
}

// ---------------------------------------------------------------------------
// Commands, subcommands, series layout
// ---------------------------------------------------------------------------

/** Subcommand for a series and access unit: Q/L 0000H/0001H, iQ-R 0002H/0003H. */
export function mcSubcommand(series: McSeries, unit: McUnit): number {
  const bit = unit === "bit" ? 1 : 0;
  return series === "iq-r" ? 0x0002 + bit : 0x0000 + bit;
}

/** What a subcommand selects, or null if it is not one of the four defined here. */
export function mcSubcommandMeaning(subcommand: number): { series: McSeries; unit: McUnit } | null {
  switch (subcommand) {
    case 0x0000:
      return { series: "q-l", unit: "word" };
    case 0x0001:
      return { series: "q-l", unit: "bit" };
    case 0x0002:
      return { series: "iq-r", unit: "word" };
    case 0x0003:
      return { series: "iq-r", unit: "bit" };
    default:
      return null;
  }
}

/** Human name for a subcommand value. */
export function mcSubcommandName(subcommand: number): string {
  const m = mcSubcommandMeaning(subcommand);
  if (!m) return `Subcommand ${mcAsciiField(subcommand, 4)}H`;
  const series = m.series === "iq-r" ? "MELSEC iQ-R" : "MELSEC-Q/L";
  return `${m.unit === "bit" ? "Bit" : "Word"} units (${series})`;
}

/** Human name for a command value. */
export function mcCommandName(command: number): string {
  switch (command) {
    case MC_COMMAND_BATCH_READ:
      return "Batch read";
    case MC_COMMAND_BATCH_WRITE:
      return "Batch write";
    default:
      return `Command ${mcAsciiField(command, 4)}H`;
  }
}

/** Widths of the device fields, which are the only thing the series changes. */
export interface McSeriesLayout {
  /** Head device No. bytes in binary mode. */
  deviceNumberBytes: number;
  /** Device code bytes in binary mode. */
  deviceCodeBytes: number;
  /** Head device No. digits in ASCII mode. */
  deviceNumberDigits: number;
  /** Device code characters in ASCII mode. */
  deviceCodeChars: number;
}

/** Field widths for a series. */
export function mcSeriesLayout(series: McSeries): McSeriesLayout {
  return series === "iq-r"
    ? { deviceNumberBytes: 4, deviceCodeBytes: 2, deviceNumberDigits: 8, deviceCodeChars: 4 }
    : { deviceNumberBytes: 3, deviceCodeBytes: 1, deviceNumberDigits: 6, deviceCodeChars: 2 };
}

/** Point limit for an access unit in a mode. */
export function mcMaxPoints(mode: McMode, unit: McUnit): number {
  if (unit === "word") return MC_MAX_POINTS_WORD;
  return mode === "ascii" ? MC_MAX_POINTS_BIT_ASCII : MC_MAX_POINTS_BIT_BINARY;
}

// ---------------------------------------------------------------------------
// Encoded output
// ---------------------------------------------------------------------------

/** One field of a frame, in the order it is transmitted. */
export interface McFrameField {
  /** Field name as the manuals call it. */
  name: string;
  /** The field as transmitted: hex bytes in binary mode, characters in ASCII mode. */
  text: string;
}

/** A built frame or frame section. */
export interface McEncoded {
  ok: true;
  mode: McMode;
  /** Octets on the wire. In ASCII mode these are the ASCII character codes. */
  bytes: Uint8Array;
  /** Binary mode: a spaced uppercase hex dump. ASCII mode: the frame text itself. */
  text: string;
  fields: McFrameField[];
}

/** A built request frame. */
export interface McBuiltRequest extends McEncoded {
  /** Value written into the request data length field. */
  requestDataLength: number;
}

export type McEncodeResult = McEncoded | { ok: false; error: string };
export type McBuildResult = McBuiltRequest | { ok: false; error: string };

function hexDump(bytes: ArrayLike<number>): string {
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    out.push(bytes[i]!.toString(16).toUpperCase().padStart(2, "0"));
  }
  return out.join(" ");
}

/**
 * Accumulates fields in transmission order. `num` is the only place a numeric
 * field is turned into bytes or characters, so little-endian-vs-upper-digit-first
 * cannot be got wrong per field; the ORDER of the calls is what differs by mode.
 */
class FieldWriter {
  readonly fields: McFrameField[] = [];
  private readonly octets: number[] = [];
  private readonly parts: string[] = [];

  constructor(readonly mode: McMode) {}

  get length(): number {
    return this.octets.length;
  }

  /** A numeric field: little-endian in binary, upper digit first in ASCII. */
  num(name: string, value: number, binaryBytes: number, asciiDigits: number, base = 16): this {
    return this.mode === "binary"
      ? this.pushBytes(name, mcLeBytes(value, binaryBytes))
      : this.pushText(name, mcAsciiField(value, asciiDigits, base));
  }

  /** A field whose two forms are unrelated: subheaders, device codes, data blocks. */
  either(name: string, bytes: number[], text: string): this {
    return this.mode === "binary" ? this.pushBytes(name, bytes) : this.pushText(name, text);
  }

  /** An already-encoded block (write data). */
  block(name: string, part: { bytes: Uint8Array; text: string }): this {
    return this.mode === "binary"
      ? this.pushBytes(name, Array.from(part.bytes))
      : this.pushText(name, part.text);
  }

  append(other: FieldWriter): this {
    for (const f of other.fields) this.fields.push(f);
    for (const b of other.octets) this.octets.push(b);
    for (const p of other.parts) this.parts.push(p);
    return this;
  }

  encoded(): McEncoded {
    const bytes = new Uint8Array(this.octets);
    return {
      ok: true,
      mode: this.mode,
      bytes,
      text: this.mode === "binary" ? hexDump(bytes) : this.parts.join(""),
      fields: this.fields,
    };
  }

  private pushBytes(name: string, bytes: number[]): this {
    this.fields.push({ name, text: hexDump(bytes) });
    for (const b of bytes) this.octets.push(b);
    return this;
  }

  private pushText(name: string, text: string): this {
    this.fields.push({ name, text });
    this.parts.push(text);
    for (let i = 0; i < text.length; i++) this.octets.push(text.charCodeAt(i) & 0xff);
    return this;
  }
}

function encodedText(mode: McMode, octets: number[], parts: string[]): { bytes: Uint8Array; text: string } {
  const bytes = new Uint8Array(octets);
  return { bytes, text: mode === "binary" ? hexDump(bytes) : parts.join("") };
}

// ---------------------------------------------------------------------------
// Read/write data blocks
// ---------------------------------------------------------------------------

/**
 * Word-unit data. Binary: one word per two bytes, low byte first. ASCII: four
 * hex characters per word, upper digit first.
 */
export function encodeMcWordData(mode: McMode, values: readonly number[]): { bytes: Uint8Array; text: string } {
  const octets: number[] = [];
  const parts: string[] = [];
  for (const v of values) {
    const word = v & 0xffff;
    if (mode === "binary") octets.push(...mcLeBytes(word, 2));
    else {
      const s = mcAsciiField(word, 4);
      parts.push(s);
      for (let i = 0; i < s.length; i++) octets.push(s.charCodeAt(i));
    }
  }
  return encodedText(mode, octets, parts);
}

/** Word-unit data back to 16-bit values. */
export function decodeMcWordData(mode: McMode, data: Uint8Array | string): number[] {
  const out: number[] = [];
  if (mode === "binary") {
    const bytes = typeof data === "string" ? parseHexBytes(data) ?? new Uint8Array() : data;
    for (let i = 0; i + 1 < bytes.length; i += 2) out.push(mcLeValue(bytes, i, 2));
    return out;
  }
  const text = typeof data === "string" ? data : latin1(data);
  for (let i = 0; i + 3 < text.length; i += 4) out.push(mcAsciiValue(text, i, 4));
  return out;
}

/**
 * Bit-unit data. Binary packs two points per byte with the HIGH nibble holding
 * the lower-numbered device, padding an odd count with 0. ASCII writes one
 * character per point, '1' = ON.
 */
export function encodeMcBitData(
  mode: McMode,
  bits: readonly (number | boolean)[],
): { bytes: Uint8Array; text: string } {
  const on = bits.map((b) => (b === true || b === 1 ? 1 : 0));
  const octets: number[] = [];
  const parts: string[] = [];

  if (mode === "binary") {
    for (let i = 0; i < on.length; i += 2) {
      octets.push(((on[i]! & 0xf) << 4) | (on[i + 1] ?? 0));
    }
  } else {
    const s = on.map((b) => (b ? "1" : "0")).join("");
    parts.push(s);
    for (let i = 0; i < s.length; i++) octets.push(s.charCodeAt(i));
  }
  return encodedText(mode, octets, parts);
}

/** Bit-unit data back to one 0/1 per point. */
export function decodeMcBitData(mode: McMode, data: Uint8Array | string, points: number): number[] {
  const out: number[] = [];
  if (mode === "binary") {
    const bytes = typeof data === "string" ? parseHexBytes(data) ?? new Uint8Array() : data;
    for (let i = 0; i < points; i++) {
      const byte = bytes[Math.floor(i / 2)];
      if (byte === undefined) break;
      out.push(i % 2 === 0 ? (byte >> 4) & 0x0f : byte & 0x0f);
    }
    return out;
  }
  const text = typeof data === "string" ? data : latin1(data);
  for (let i = 0; i < points && i < text.length; i++) out.push(text[i] === "1" ? 1 : 0);
  return out;
}

// ---------------------------------------------------------------------------
// Building requests
// ---------------------------------------------------------------------------

/** Everything from the command field onward. */
export interface McRequestDataOptions {
  mode: McMode;
  /** Subcommand family. Defaults to MELSEC-Q/L. */
  series?: McSeries;
  command: McCommand;
  unit: McUnit;
  /** Device text ("D100") or an explicit symbol and number. */
  device: string | { symbol: string; number: number };
  points: number;
  /** Batch write payload: word values 0-65535, or bits as 0/1/boolean. */
  data?: readonly (number | boolean)[];
}

/** A whole 3E request frame. */
export interface McRequestOptions extends McRequestDataOptions {
  /** Network No., default 00H (host station). */
  networkNo?: number;
  /** PC No., default FFH (host station). */
  pcNo?: number;
  /** Request destination module I/O No., default 03FFH (own CPU). */
  ioNo?: number;
  /** Request destination module station No., default 00H. */
  stationNo?: number;
  /** CPU monitoring timer, default 0000H = wait forever; otherwise ×250 ms. */
  monitoringTimer?: number;
}

function resolveDevice(input: McRequestDataOptions["device"]): McDeviceParseResult {
  if (typeof input === "string") return parseMcDevice(input);
  const dev = mcDeviceBySymbol(input.symbol);
  if (!dev) return { ok: false, error: `${input.symbol} is not an MC protocol device` };
  if (!Number.isInteger(input.number) || input.number < 0) {
    return { ok: false, error: "Device number must be a non-negative integer" };
  }
  return { ok: true, ref: { device: dev, number: input.number, text: formatMcDevice(dev, input.number) } };
}

function checkField(name: string, value: number, max: number): string | null {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    return `${name} must be an integer 0-${max}`;
  }
  return null;
}

/**
 * Append command, subcommand, the device fields and any write data.
 *
 * THE asymmetry: binary sends the head device No. before the device code,
 * ASCII sends the device code before the head device No. Both orders are
 * written out here once, and nowhere else.
 */
function writeRequestData(w: FieldWriter, opts: McRequestDataOptions): string | null {
  const series = opts.series ?? "q-l";
  const layout = mcSeriesLayout(series);

  const resolved = resolveDevice(opts.device);
  if (!resolved.ok) return resolved.error;
  const { device: dev, number } = resolved.ref;

  const limit = mcMaxPoints(w.mode, opts.unit);
  if (!Number.isInteger(opts.points) || opts.points < 1 || opts.points > limit) {
    return `No. of points must be 1-${limit} for ${opts.unit} units in ${w.mode} mode`;
  }

  // The head device No. has to fit the field, and the ASCII field is narrower
  // for a decimal device (6 decimal digits) than the 3 binary bytes.
  const maxNumber =
    w.mode === "binary"
      ? 256 ** layout.deviceNumberBytes - 1
      : mcRadixBase(dev.radix) ** layout.deviceNumberDigits - 1;
  const numberError = checkField(`Head device No. of ${dev.symbol}`, number, maxNumber);
  if (numberError) return numberError;

  const command = opts.command === "batch-read" ? MC_COMMAND_BATCH_READ : MC_COMMAND_BATCH_WRITE;
  w.num("Command", command, 2, 4);
  w.num("Subcommand", mcSubcommand(series, opts.unit), 2, 4);

  // Each field knows both of its forms; the ONLY thing the mode changes is the
  // order the two are sent in.
  const headDeviceNo = () =>
    w.either(
      "Head device No.",
      mcLeBytes(number, layout.deviceNumberBytes),
      mcAsciiField(number, layout.deviceNumberDigits, mcRadixBase(dev.radix)),
    );
  const deviceCode = () =>
    w.either(
      "Device code",
      mcLeBytes(dev.code, layout.deviceCodeBytes),
      series === "iq-r" ? dev.ascii4 : dev.ascii2,
    );

  if (w.mode === "binary") {
    headDeviceNo();
    deviceCode();
  } else {
    deviceCode();
    headDeviceNo();
  }
  w.num("No. of points", opts.points, 2, 4);

  if (opts.command === "batch-read") {
    if (opts.data !== undefined && opts.data.length > 0) {
      return "Batch read carries no write data";
    }
    return null;
  }

  const data = opts.data;
  if (data === undefined) return "Batch write needs write data";
  if (data.length !== opts.points) {
    return `Batch write needs exactly ${opts.points} value${opts.points === 1 ? "" : "s"}, got ${data.length}`;
  }

  if (opts.unit === "word") {
    for (const v of data) {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 0xffff) {
        return "Word write data must be integers 0-65535";
      }
    }
    w.block("Write data", encodeMcWordData(w.mode, data as readonly number[]));
  } else {
    for (const v of data) {
      if (!(v === 0 || v === 1 || v === true || v === false)) {
        return "Bit write data must be 0, 1 or a boolean";
      }
    }
    w.block("Write data", encodeMcBitData(w.mode, data));
  }
  return null;
}

/**
 * Build only the request data section — command, subcommand, device fields and
 * write data — which is the form the manuals print alongside each command.
 */
export function buildMcRequestData(opts: McRequestDataOptions): McEncodeResult {
  const w = new FieldWriter(opts.mode);
  const error = writeRequestData(w, opts);
  return error ? { ok: false, error } : w.encoded();
}

/** Build a complete 3E request frame. */
export function buildMcRequest(opts: McRequestOptions): McBuildResult {
  const tail = new FieldWriter(opts.mode);
  const error = writeRequestData(tail, opts);
  if (error) return { ok: false, error };

  const networkNo = opts.networkNo ?? MC_HOST_NETWORK_NO;
  const pcNo = opts.pcNo ?? MC_HOST_PC_NO;
  const ioNo = opts.ioNo ?? MC_HOST_IO_NO;
  const stationNo = opts.stationNo ?? MC_HOST_STATION_NO;
  const timer = opts.monitoringTimer ?? 0x0000;

  const headerError =
    checkField("Network No.", networkNo, 0xff) ??
    checkField("PC No.", pcNo, 0xff) ??
    checkField("Request destination module I/O No.", ioNo, 0xffff) ??
    checkField("Request destination module station No.", stationNo, 0xff) ??
    checkField("CPU monitoring timer", timer, 0xffff);
  if (headerError) return { ok: false, error: headerError };

  // The length field counts from the monitoring timer to the end of the request
  // data — bytes in binary mode, transmitted characters in ASCII mode. Both are
  // one octet per unit, so the accumulated octet count is the count either way.
  const timerSize = opts.mode === "binary" ? 2 : 4;
  const requestDataLength = timerSize + tail.length;

  const w = new FieldWriter(opts.mode);
  w.either("Subheader", [0x50, 0x00], "5000");
  w.num("Network No.", networkNo, 1, 2);
  w.num("PC No.", pcNo, 1, 2);
  w.num("Request destination module I/O No.", ioNo, 2, 4);
  w.num("Request destination module station No.", stationNo, 1, 2);
  w.num("Request data length", requestDataLength, 2, 4);
  w.num("CPU monitoring timer", timer, 2, 4);
  w.append(tail);

  return { ...w.encoded(), requestDataLength };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Header fields shared by requests and responses. */
export interface McHeader {
  mode: McMode;
  /**
   * 5000H for a request, D000H for a response — the manuals' names. It is
   * transmitted as two bytes (50H 00H), not as a little-endian 16-bit value.
   */
  subheader: number;
  networkNo: number;
  pcNo: number;
  ioNo: number;
  stationNo: number;
  /** The length field as transmitted. */
  dataLength: number;
  /** What the frame actually carries after that field — bytes, or ASCII characters. */
  actualDataLength: number;
  /** Whether the length field agrees with the frame. */
  dataLengthOk: boolean;
}

/** A parsed 3E request. */
export interface McRequestFrame extends McHeader {
  kind: "request";
  monitoringTimer: number;
  /** Plain-language reading of the monitoring timer. */
  monitoringTimerLabel: string;
  command: number;
  commandName: string;
  subcommand: number;
  subcommandName: string;
  /** Series implied by the subcommand, or null if the subcommand is unknown. */
  series: McSeries | null;
  unit: McUnit | null;
  device: McDeviceRef | null;
  points: number | null;
  /** Batch write payload decoded per unit: word values, or one 0/1 per point. */
  writeData: number[] | null;
  /** Request data exactly as transmitted. */
  dataText: string;
  note?: string;
}

/** Error information appended to an abnormally completed response. */
export interface McErrorInformation {
  networkNo: number;
  pcNo: number;
  ioNo: number;
  stationNo: number;
  command: number;
  subcommand: number;
}

/** A parsed 3E response. */
export interface McResponseFrame extends McHeader {
  kind: "response";
  /** 0000H is normal completion; any other value is defined by the module manual. */
  endCode: number;
  success: boolean;
  /** Present only on abnormal completion. */
  errorInformation: McErrorInformation | null;
  /** Response data octets (ASCII mode: the character codes). */
  data: Uint8Array;
  /** Response data as transmitted. */
  dataText: string;
  note?: string;
}

export type McFrame = McRequestFrame | McResponseFrame;
export type McParseResult = { ok: true; frame: McFrame } | { ok: false; error: string };

function latin1(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return s;
}

/** Hex text to bytes, tolerating spaces, commas and 0x prefixes. Null if not hex. */
function parseHexBytes(input: string): Uint8Array | null {
  const cleaned = input.replace(/0[xX]/g, "").replace(/[\s,_-]/g, "");
  if (cleaned === "" || cleaned.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(cleaned)) return null;
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Sequential field reader. Positions are implicit, so a frame is read in the
 * same order it is written and the binary/ASCII offset difference never has to
 * be spelled out twice.
 */
class FieldCursor {
  pos = 0;

  constructor(
    readonly mode: McMode,
    readonly bytes: Uint8Array,
    readonly text: string,
  ) {}

  /** Octets (binary) or characters (ASCII) in the frame — the same count either way. */
  get size(): number {
    return this.mode === "binary" ? this.bytes.length : this.text.length;
  }

  get remaining(): number {
    return this.size - this.pos;
  }

  /** A numeric field: little-endian in binary, upper digit first in ASCII. */
  num(binaryBytes: number, asciiDigits: number, base = 16): number {
    if (this.mode === "binary") {
      const v = mcLeValue(this.bytes, this.pos, binaryBytes);
      this.pos += binaryBytes;
      return v;
    }
    const v = mcAsciiValue(this.text, this.pos, asciiDigits, base);
    this.pos += asciiDigits;
    return v;
  }

  /** Raw characters (ASCII mode only). */
  chars(count: number): string {
    const s = this.text.slice(this.pos, this.pos + count);
    this.pos += count;
    return s;
  }

  /** Raw octets from the current position to the end. */
  rest(): Uint8Array {
    const out =
      this.mode === "binary"
        ? this.bytes.slice(this.pos)
        : Uint8Array.from(this.text.slice(this.pos), (c) => c.charCodeAt(0) & 0xff);
    this.pos = this.size;
    return out;
  }

  /** How the octets from `start` to `end` appear in the frame. */
  slice(start: number, end: number): string {
    return this.mode === "binary" ? hexDump(this.bytes.slice(start, end)) : this.text.slice(start, end);
  }
}

function normalize(input: Uint8Array | string, mode: McMode): { bytes: Uint8Array; text: string } | null {
  if (mode === "binary") {
    const bytes = typeof input === "string" ? parseHexBytes(input) : input;
    if (!bytes) return null;
    return { bytes, text: "" };
  }
  const text = (typeof input === "string" ? input : latin1(input)).replace(/\s+/g, "").toUpperCase();
  return { bytes: Uint8Array.from(text, (c) => c.charCodeAt(0) & 0xff), text };
}

function monitoringTimerLabel(value: number): string {
  if (value === 0) return "Wait forever (0000H)";
  return `${value} × 250 ms = ${value * 0.25} s`;
}

/**
 * Read the device fields, in the order the mode uses. Mirror image of
 * writeRequestData() — the only other place the asymmetry appears.
 */
function readRequestData(
  c: FieldCursor,
  series: McSeries,
): { device: McDeviceRef | null; points: number } {
  const layout = mcSeriesLayout(series);
  let dev: McDeviceCode | null;
  let number: number;

  if (c.mode === "binary") {
    number = c.num(layout.deviceNumberBytes, 0);
    dev = mcDeviceByCode(c.num(layout.deviceCodeBytes, 0));
  } else {
    dev = mcDeviceByAscii(c.chars(layout.deviceCodeChars));
    const base = dev ? mcRadixBase(dev.radix) : 10;
    number = mcAsciiValue(c.text, c.pos, layout.deviceNumberDigits, base);
    c.pos += layout.deviceNumberDigits;
  }

  const points = c.num(2, 4);
  return {
    device: dev && Number.isFinite(number) ? { device: dev, number, text: formatMcDevice(dev, number) } : null,
    points,
  };
}

/**
 * Decode a 3E frame — request or response — in the given mode. Binary input may
 * be given as bytes or as hex text; ASCII input as the frame text or its bytes.
 */
export function parseMcFrame(input: Uint8Array | string, mode: McMode): McParseResult {
  const src = normalize(input, mode);
  if (!src) return { ok: false, error: "Not valid hex — expected an even number of hex digits" };

  const c = new FieldCursor(mode, src.bytes, src.text);
  const minHeader = mode === "binary" ? 9 : 18;
  if (c.size < minHeader) {
    return {
      ok: false,
      error: `A 3E frame header is ${minHeader} ${mode === "binary" ? "bytes" : "characters"}; got ${c.size}`,
    };
  }

  // The subheader is a fixed byte pair, not a little-endian value.
  const head = c.slice(0, mode === "binary" ? 2 : 4).replace(/\s/g, "");
  c.pos += mode === "binary" ? 2 : 4;
  let subheader: number;
  if (head === "5000") subheader = MC_SUBHEADER_REQUEST;
  else if (head === "D000") subheader = MC_SUBHEADER_RESPONSE;
  else return { ok: false, error: `Subheader ${head} is neither a 3E request (5000) nor a response (D000)` };

  const networkNo = c.num(1, 2);
  const pcNo = c.num(1, 2);
  const ioNo = c.num(2, 4);
  const stationNo = c.num(1, 2);
  const dataLength = c.num(2, 4);
  if ([networkNo, pcNo, ioNo, stationNo, dataLength].some((v) => Number.isNaN(v))) {
    return { ok: false, error: "Header contains a field that is not a valid hex value" };
  }

  const actualDataLength = c.remaining;
  const header: McHeader = {
    mode,
    subheader,
    networkNo,
    pcNo,
    ioNo,
    stationNo,
    dataLength,
    actualDataLength,
    dataLengthOk: dataLength === actualDataLength,
  };

  return subheader === MC_SUBHEADER_REQUEST
    ? parseRequestBody(c, header)
    : parseResponseBody(c, header);
}

function parseRequestBody(c: FieldCursor, header: McHeader): McParseResult {
  const bodyMin = c.mode === "binary" ? 6 : 12; // timer + command + subcommand
  if (c.remaining < bodyMin) {
    return { ok: false, error: "Request ends before the command field" };
  }

  const monitoringTimer = c.num(2, 4);
  const command = c.num(2, 4);
  const subcommand = c.num(2, 4);
  if ([monitoringTimer, command, subcommand].some((v) => Number.isNaN(v))) {
    return { ok: false, error: "Monitoring timer, command or subcommand is not a valid hex value" };
  }

  const meaning = mcSubcommandMeaning(subcommand);
  const dataStart = c.pos;

  const frame: McRequestFrame = {
    ...header,
    kind: "request",
    monitoringTimer,
    monitoringTimerLabel: monitoringTimerLabel(monitoringTimer),
    command,
    commandName: mcCommandName(command),
    subcommand,
    subcommandName: mcSubcommandName(subcommand),
    series: meaning?.series ?? null,
    unit: meaning?.unit ?? null,
    device: null,
    points: null,
    writeData: null,
    dataText: c.slice(dataStart, c.size),
  };

  const isBatch = command === MC_COMMAND_BATCH_READ || command === MC_COMMAND_BATCH_WRITE;
  if (!isBatch || !meaning) {
    frame.note = !isBatch
      ? `${frame.commandName} is not decoded by this engine — its request data is shown raw`
      : `Subcommand ${mcAsciiField(subcommand, 4)}H is not one of the batch read/write subcommands`;
    return { ok: true, frame };
  }

  const layout = mcSeriesLayout(meaning.series);
  const specSize =
    c.mode === "binary"
      ? layout.deviceNumberBytes + layout.deviceCodeBytes + 2
      : layout.deviceCodeChars + layout.deviceNumberDigits + 4;
  if (c.remaining < specSize) {
    frame.note = "Request data ends before the device specification is complete";
    return { ok: true, frame };
  }

  const spec = readRequestData(c, meaning.series);
  frame.device = spec.device;
  frame.points = Number.isNaN(spec.points) ? null : spec.points;
  if (!spec.device) frame.note = "Device code in the request data is not a known device";

  if (command === MC_COMMAND_BATCH_WRITE && frame.points !== null) {
    const payload = c.rest();
    frame.writeData =
      meaning.unit === "word"
        ? decodeMcWordData(c.mode, payload)
        : decodeMcBitData(c.mode, payload, frame.points);
    if (frame.writeData.length !== frame.points) {
      frame.note = `Write data holds ${frame.writeData.length} of the ${frame.points} points the frame asks for`;
    }
  } else if (c.remaining > 0) {
    frame.note = "Batch read carries trailing data";
  }

  return { ok: true, frame };
}

function parseResponseBody(c: FieldCursor, header: McHeader): McParseResult {
  const endSize = c.mode === "binary" ? 2 : 4;
  if (c.remaining < endSize) {
    return { ok: false, error: "Response ends before the end code" };
  }

  const endCode = c.num(2, 4);
  if (Number.isNaN(endCode)) return { ok: false, error: "End code is not a valid hex value" };

  const success = endCode === MC_END_CODE_NORMAL;
  let errorInformation: McErrorInformation | null = null;
  let note: string | undefined;

  if (!success) {
    // Abnormal completion appends access route (5 bytes) + command + subcommand.
    const infoSize = c.mode === "binary" ? 9 : 18;
    if (c.remaining >= infoSize) {
      errorInformation = {
        networkNo: c.num(1, 2),
        pcNo: c.num(1, 2),
        ioNo: c.num(2, 4),
        stationNo: c.num(1, 2),
        command: c.num(2, 4),
        subcommand: c.num(2, 4),
      };
    } else {
      note = "Abnormal completion without the error information block";
    }
  }

  const dataStart = c.pos;
  const data = c.rest();

  return {
    ok: true,
    frame: {
      ...header,
      kind: "response",
      endCode,
      success,
      errorInformation,
      data,
      dataText: c.slice(dataStart, c.size),
      note,
    },
  };
}
