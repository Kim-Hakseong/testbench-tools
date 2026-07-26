// Byte-order and fixed-point utilities. Pure TS, no DOM.

/** Full byte reversal: AB CD EF → EF CD AB (endianness flip). */
export function reverseBytes(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b[b.length - 1 - i]!;
  return out;
}

/** Swap bytes inside each 16-bit word: AB CD EF GH → BA DC FE HG. */
export function swapBytesInWords(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length);
  for (let i = 0; i + 1 < b.length; i += 2) {
    out[i] = b[i + 1]!;
    out[i + 1] = b[i]!;
  }
  if (b.length % 2 === 1) out[b.length - 1] = b[b.length - 1]!;
  return out;
}

/** Swap the two 16-bit words inside each 32-bit group: AB CD EF GH → EF GH AB CD. */
export function swapWords(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length);
  let i = 0;
  for (; i + 3 < b.length; i += 4) {
    out[i] = b[i + 2]!;
    out[i + 1] = b[i + 3]!;
    out[i + 2] = b[i]!;
    out[i + 3] = b[i + 1]!;
  }
  for (; i < b.length; i++) out[i] = b[i]!;
  return out;
}

// ---------------------------------------------------------------------------
// Signed fixed-point Qm.n (1 sign bit + m integer bits + n fraction bits)
// ---------------------------------------------------------------------------

export interface QFormatInfo {
  bits: number;
  min: number;
  max: number;
  resolution: number;
}

export function qInfo(m: number, n: number): QFormatInfo {
  const bits = 1 + m + n;
  const resolution = Math.pow(2, -n);
  return {
    bits,
    min: -Math.pow(2, m),
    max: Math.pow(2, m) - resolution,
    resolution,
  };
}

export interface QEncodeResult {
  /** Two's-complement raw integer (unsigned representation of `bits` width). */
  raw: number;
  /** Signed integer count of 2^-n steps. */
  stepCount: number;
  /** Value actually stored after rounding/clamping. */
  stored: number;
  clamped: boolean;
}

/** Encode a real value into signed Qm.n (round-to-nearest, clamp at range ends). */
export function encodeQ(value: number, m: number, n: number): QEncodeResult {
  const bits = 1 + m + n;
  const lo = -Math.pow(2, m + n);
  const hi = Math.pow(2, m + n) - 1;
  let steps = Math.round(value * Math.pow(2, n));
  let clamped = false;
  if (steps < lo) {
    steps = lo;
    clamped = true;
  } else if (steps > hi) {
    steps = hi;
    clamped = true;
  }
  const raw = steps < 0 ? steps + Math.pow(2, bits) : steps;
  return { raw, stepCount: steps, stored: steps / Math.pow(2, n), clamped };
}

/** Decode a raw two's-complement Qm.n integer back to a real value. */
export function decodeQ(raw: number, m: number, n: number): number {
  const bits = 1 + m + n;
  const half = Math.pow(2, bits - 1);
  const steps = raw >= half ? raw - Math.pow(2, bits) : raw;
  return steps / Math.pow(2, n);
}

// ---------------------------------------------------------------------------
// Bit-field extraction (values up to 64 bit via BigInt)
// ---------------------------------------------------------------------------

export interface BitField {
  name: string;
  /** Least-significant bit position (0-based). */
  lsb: number;
  width: number;
}

export interface ExtractedField extends BitField {
  value: bigint;
  hex: string;
  binary: string;
}

export function extractBits(value: bigint, lsb: number, width: number): bigint {
  return (value >> BigInt(lsb)) & ((1n << BigInt(width)) - 1n);
}

export function extractFields(value: bigint, fields: BitField[]): ExtractedField[] {
  return fields.map((f) => {
    const v = extractBits(value, f.lsb, f.width);
    return {
      ...f,
      value: v,
      hex: "0x" + v.toString(16).toUpperCase(),
      binary: v.toString(2).padStart(f.width, "0"),
    };
  });
}
