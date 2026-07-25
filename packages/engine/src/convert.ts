// Data conversion engines: hex parsing, hex↔ASCII, IEEE 754 float word orders,
// number bases, two's complement, BCD. Pure TS, no DOM.

// ---------------------------------------------------------------------------
// Hex parsing
// ---------------------------------------------------------------------------

export interface HexParseError {
  /** Character index in the original string where the invalid token starts. */
  index: number;
  char: string;
}

export type HexParseResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; error: HexParseError };

/** Parse a hex byte string ("01 03 0A", "01,03,0x0A", "01030A"). */
export function parseHex(input: string): HexParseResult {
  const cleaned: number[] = [];
  let nibbleBuf = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (/[0-9a-fA-F]/.test(ch)) {
      nibbleBuf += ch;
      if (nibbleBuf.length === 2) {
        cleaned.push(parseInt(nibbleBuf, 16));
        nibbleBuf = "";
      }
    } else if (/[\s,;:_-]/.test(ch)) {
      if (nibbleBuf.length === 1) {
        // single nibble followed by separator → pad-less byte like "3" is ambiguous; treat as 0x03
        cleaned.push(parseInt(nibbleBuf, 16));
        nibbleBuf = "";
      }
    } else if (ch === "x" || ch === "X") {
      // allow 0x prefixes: "0x1A" — the preceding "0" was buffered; drop it
      if (nibbleBuf === "0") nibbleBuf = "";
      else return { ok: false, error: { index: i, char: ch } };
    } else {
      return { ok: false, error: { index: i, char: ch } };
    }
  }
  if (nibbleBuf.length === 1) cleaned.push(parseInt(nibbleBuf, 16));
  return { ok: true, bytes: new Uint8Array(cleaned) };
}

export function bytesToHex(bytes: Uint8Array | number[], sep = " "): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join(sep);
}

// ---------------------------------------------------------------------------
// Hex ↔ ASCII
// ---------------------------------------------------------------------------

export function asciiToBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/** Bytes → ASCII text; non-printable bytes rendered as "." */
export function bytesToAscii(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    s += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".";
  }
  return s;
}

// ---------------------------------------------------------------------------
// IEEE 754 float ↔ 16-bit registers (Modbus word orders)
// ---------------------------------------------------------------------------

export type WordOrder = "ABCD" | "CDAB" | "BADC" | "DCBA";
export const WORD_ORDERS: WordOrder[] = ["ABCD", "CDAB", "BADC", "DCBA"];

/**
 * Byte layout per order for float bytes A B C D (A = IEEE 754 MSB):
 *   ABCD (big-endian):        reg0 = A B, reg1 = C D
 *   CDAB (word-swapped):      reg0 = C D, reg1 = A B
 *   BADC (byte-swapped):      reg0 = B A, reg1 = D C
 *   DCBA (little-endian):     reg0 = D C, reg1 = B A
 */
export function float32ToRegisters(value: number, order: WordOrder): [number, number] {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setFloat32(0, value, false); // big-endian → bytes A B C D
  const [a, b, c, d] = Array.from(new Uint8Array(buf)) as [number, number, number, number];
  switch (order) {
    case "ABCD": return [(a << 8) | b, (c << 8) | d];
    case "CDAB": return [(c << 8) | d, (a << 8) | b];
    case "BADC": return [(b << 8) | a, (d << 8) | c];
    case "DCBA": return [(d << 8) | c, (b << 8) | a];
  }
}

export function registersToFloat32(regs: [number, number], order: WordOrder): number {
  const [r0, r1] = regs;
  const b0 = (r0 >> 8) & 0xff, b1 = r0 & 0xff, b2 = (r1 >> 8) & 0xff, b3 = r1 & 0xff;
  let a: number, b: number, c: number, d: number;
  switch (order) {
    case "ABCD": [a, b, c, d] = [b0, b1, b2, b3]; break;
    case "CDAB": [a, b, c, d] = [b2, b3, b0, b1]; break;
    case "BADC": [a, b, c, d] = [b1, b0, b3, b2]; break;
    case "DCBA": [a, b, c, d] = [b3, b2, b1, b0]; break;
  }
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint8(0, a); view.setUint8(1, b); view.setUint8(2, c); view.setUint8(3, d);
  return view.getFloat32(0, false);
}

// ---------------------------------------------------------------------------
// Integer helpers
// ---------------------------------------------------------------------------

/** Interpret `value` (unsigned) as a two's-complement signed integer of `bits` width. */
export function toSigned(value: number, bits: 8 | 16 | 32): number {
  const mask = bits === 32 ? 0xffffffff : (1 << bits) - 1;
  const v = value & mask;
  const sign = bits === 32 ? 0x80000000 : 1 << (bits - 1);
  return (v & sign) !== 0 ? v - (bits === 32 ? 0x100000000 : (1 << bits)) : v;
}

/** Encode a signed integer into its two's-complement unsigned form of `bits` width. */
export function fromSigned(value: number, bits: 8 | 16 | 32): number {
  if (bits === 32) return value < 0 ? value + 0x100000000 : value >>> 0;
  const mod = 1 << bits;
  return ((value % mod) + mod) % mod;
}

export type NumberBase = 2 | 8 | 10 | 16;

export type BaseParseResult =
  | { ok: true; value: bigint }
  | { ok: false; errorIndex: number };

const BASE_DIGITS: Record<NumberBase, RegExp> = {
  2: /[01]/,
  8: /[0-7]/,
  10: /[0-9]/,
  16: /[0-9a-fA-F]/,
};

/** Parse an integer string in the given base; reports the first invalid character index. */
export function parseInBase(input: string, base: NumberBase): BaseParseResult {
  const s = input.trim();
  if (s.length === 0) return { ok: false, errorIndex: 0 };
  let start = 0;
  let negative = false;
  if (s[0] === "-" || s[0] === "+") {
    negative = s[0] === "-";
    start = 1;
  }
  let body = s.slice(start);
  let bodyOffset = start;
  const prefix = body.slice(0, 2).toLowerCase();
  if (base === 16 && prefix === "0x") { body = body.slice(2); bodyOffset += 2; }
  if (base === 2 && prefix === "0b") { body = body.slice(2); bodyOffset += 2; }
  if (base === 8 && prefix === "0o") { body = body.slice(2); bodyOffset += 2; }
  if (body.length === 0) return { ok: false, errorIndex: input.length };
  const digitRe = BASE_DIGITS[base];
  const trimOffset = input.length - input.trimStart().length;
  let value = 0n;
  const B = BigInt(base);
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (ch === "_" || ch === " ") continue; // digit grouping
    if (!digitRe.test(ch)) {
      return { ok: false, errorIndex: trimOffset + bodyOffset + i };
    }
    value = value * B + BigInt(parseInt(ch, 16));
  }
  return { ok: true, value: negative ? -value : value };
}

export function formatInBase(value: bigint, base: NumberBase): string {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  return (neg ? "-" : "") + abs.toString(base);
}

// ---------------------------------------------------------------------------
// BCD (packed, 4 bits per decimal digit)
// ---------------------------------------------------------------------------

export interface BcdError {
  /** 0-based nibble position counted from the most significant nibble. */
  nibbleIndex: number;
  /** The offending nibble value (0xA..0xF). */
  nibbleValue: number;
}

export type BcdDecodeResult =
  | { ok: true; value: number }
  | { ok: false; error: BcdError };

/** Decode a packed-BCD word (e.g. 0x1234 → 1234). Validates every nibble is 0..9. */
export function bcdToDecimal(word: number, nibbles?: number): BcdDecodeResult {
  const w = word >>> 0;
  let n = nibbles ?? Math.max(1, Math.ceil((32 - Math.clz32(w)) / 4));
  if (w === 0) n = nibbles ?? 1;
  let value = 0;
  for (let i = 0; i < n; i++) {
    const shift = (n - 1 - i) * 4;
    const nib = (w >>> shift) & 0xf;
    if (nib > 9) return { ok: false, error: { nibbleIndex: i, nibbleValue: nib } };
    value = value * 10 + nib;
  }
  return { ok: true, value };
}

/** Encode a non-negative decimal integer as packed BCD (e.g. 5678 → 0x5678). */
export function decimalToBcd(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 99999999) {
    throw new RangeError("decimalToBcd expects an integer in 0..99999999");
  }
  let out = 0;
  let shift = 0;
  let v = value;
  do {
    out |= (v % 10) << shift;
    v = Math.floor(v / 10);
    shift += 4;
  } while (v > 0);
  return out >>> 0;
}
