// ARINC 429 word decoding/encoding. Pure TS, no DOM.
//
// An ARINC 429 word is 32 bits. ARINC numbers them 1 to 32, with bit 1 as the
// LSB of the value and bit 32 as the MSB, and every public description of the
// field map agrees:
//
//   32 | 31  30 | 29 .................. 11 | 10  9 | 8 ............ 1
//    P |  SSM   |           Data           |  SDI  |     Label
//
// Nothing in this module needs to know what a label *means*. Label-to-parameter
// assignments and equipment IDs live in the paid ARINC specification and in
// per-aircraft ICDs, so the decoder surfaces the octal label and stops there —
// the engineer reads the meaning off their own ICD. Likewise the SSM: its
// meaning depends on the data type the label implies, so the caller supplies
// the format and all three readings are reported when they do not.
//
// The label is the trap. Sources agree the label goes out ahead of the rest of
// the word and in the opposite bit order to every other field, but they
// disagree on which *numbered* bit holds the octal label's MSB (see
// LabelBitOrder). The two readings bit-reverse the label byte, which is the
// difference between label 205 and label 241, so the convention is an explicit
// option and both readings are always reported rather than silently guessed.

/** Bit ranges, in ARINC numbering (bit 1 = LSB of the 32-bit value). */
export const ARINC429_FIELDS = {
  label: { first: 1, last: 8 },
  sdi: { first: 9, last: 10 },
  data: { first: 11, last: 29 },
  ssm: { first: 30, last: 31 },
  parity: { first: 32, last: 32 },
} as const;

/** Bit 29 is the BNR sign; bits 28-11 carry the magnitude. */
export const BNR_SIGN_BIT = 29;
export const BNR_MAGNITUDE_BITS = 18;

/** Value of bits `first`..`last` (ARINC numbering) as an unsigned integer. */
function fieldValue(word: number, first: number, last: number): number {
  const width = last - first + 1;
  const mask = width >= 32 ? 0xffffffff : (1 << width) - 1;
  return ((word >>> (first - 1)) & mask) >>> 0;
}

/** Whether an ARINC-numbered bit is set. */
export function arinc429Bit(word: number, bit: number): 0 | 1 {
  return ((word >>> (bit - 1)) & 1) as 0 | 1;
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

/**
 * Which end of the label field (bits 1-8) carries the octal label's MSB.
 *
 * - `bit1-msb` — MSB at bit 1, so the label byte inside the word is the
 *   bit-reverse of the octal number. Holt's HI-35850 bit-mapping table
 *   annotates ARINC bit 1 as "Label (MSB)"; Wikipedia and Holt both give the
 *   example that transmitting label 213 octal (8B hex) means putting D1 hex in
 *   the label octet. Most software decoders do this.
 * - `bit8-msb` — MSB at bit 8, so the label byte reads directly as the octal
 *   number. The transmission order published by AIM, GE/Ballard and MaxT
 *   (8,7,6,5,4,3,2,1,9,10,...,32, label MSB first) puts the MSB at bit 8, and
 *   GE's tabulated discrete word spells out label 005 as bit 1 = 1, bit 3 = 1.
 *
 * The two conventions are irreconcilable from public documentation, so pick the
 * one your capture tool uses. Decoded words always carry both readings.
 */
export type LabelBitOrder = "bit1-msb" | "bit8-msb";

export const DEFAULT_LABEL_BIT_ORDER: LabelBitOrder = "bit1-msb";

/** Reverse the 8 label bits. Self-inverse — applying it twice is identity. */
export function reverseLabelBits(byte: number): number {
  const b = byte & 0xff;
  let out = 0;
  for (let i = 0; i < 8; i++) out |= ((b >>> i) & 1) << (7 - i);
  return out >>> 0;
}

/**
 * The 3-digit octal label for a raw label field (bits 1-8 of the word).
 * The bit-reversal lives here and in octalToLabel and nowhere else, so the two
 * directions cannot drift apart.
 */
export function labelToOctal(labelField: number, order: LabelBitOrder = DEFAULT_LABEL_BIT_ORDER): string {
  const value = order === "bit1-msb" ? reverseLabelBits(labelField) : labelField & 0xff;
  return value.toString(8).padStart(3, "0");
}

export type LabelParseResult = { ok: true; labelField: number } | { ok: false; error: string };

/**
 * Turn an octal label ("205", "0o205", "5") into the raw label field that
 * belongs in bits 1-8 of the word.
 */
export function octalToLabel(octal: string, order: LabelBitOrder = DEFAULT_LABEL_BIT_ORDER): LabelParseResult {
  const text = octal.trim().replace(/^0o/i, "");
  if (text === "") return { ok: false, error: "Enter an octal label, e.g. 205" };
  if (!/^[0-7]{1,3}$/.test(text)) {
    return { ok: false, error: `Octal label must be 1-3 digits 0-7, got "${octal}"` };
  }
  const value = parseInt(text, 8);
  if (value > 0xff) {
    return { ok: false, error: `Label ${text} is above the 377 octal maximum` };
  }
  return { ok: true, labelField: order === "bit1-msb" ? reverseLabelBits(value) : value };
}

// ---------------------------------------------------------------------------
// Parity — odd across all 32 bits, with bit 32 as the parity bit
// ---------------------------------------------------------------------------

/** The bit-32 value that makes the number of 1s in the whole word odd. */
export function arinc429Parity(word: number): 0 | 1 {
  let ones = 0;
  for (let i = 0; i < 31; i++) ones += (word >>> i) & 1;
  return ones % 2 === 0 ? 1 : 0;
}

/** Whether the word as given already carries correct odd parity. */
export function arinc429ParityOk(word: number): boolean {
  return arinc429Bit(word, 32) === arinc429Parity(word);
}

/** Replace bit 32 with the correct odd-parity bit. */
export function withOddParity(word: number): number {
  return (((word >>> 0) & 0x7fffffff) | (arinc429Parity(word) << 31)) >>> 0;
}

// ---------------------------------------------------------------------------
// Sign/Status Matrix — meaning depends on the data type, not on one table
// ---------------------------------------------------------------------------

/** The data type the label implies. Only the label (via an ICD) settles this. */
export type Arinc429Format = "bnr" | "bcd" | "discrete";

/** SSM readings, indexed by (bit 31 << 1) | bit 30. */
export const SSM_BNR = [
  "Failure Warning",
  "No Computed Data",
  "Functional Test",
  "Normal Operation",
] as const;

export const SSM_BCD = [
  "Plus, North, East, Right, To, Above",
  "No Computed Data",
  "Functional Test",
  "Minus, South, West, Left, From, Below",
] as const;

export const SSM_DISCRETE = [
  "Verified Data, Normal Operation",
  "No Computed Data",
  "Functional Test",
  "Failure Warning",
] as const;

/** Every reading of one SSM code, because the format is not always known. */
export interface SsmReadings {
  bnr: string;
  bcd: string;
  discrete: string;
}

export function ssmReadings(code: number): SsmReadings {
  const c = code & 0x3;
  return { bnr: SSM_BNR[c]!, bcd: SSM_BCD[c]!, discrete: SSM_DISCRETE[c]! };
}

export function ssmMeaning(code: number, format: Arinc429Format): string {
  return ssmReadings(code)[format];
}

// ---------------------------------------------------------------------------
// BNR data
// ---------------------------------------------------------------------------

export interface Arinc429Bnr {
  /** Bits 29-11 as an unsigned 19-bit number. */
  field: number;
  /** Bits 29-11 read as a 19-bit two's-complement number. */
  signed: number;
  /** Bit 29 — 1 means negative (South, West, Left, From, Below). */
  negative: boolean;
  /**
   * Bits 28-11 on their own. AIM and GE both document negatives as two's
   * complement, so `signed` is the value to use; this is here for equipment
   * whose ICD documents a sign-magnitude field instead.
   */
  magnitude: number;
}

/** Read the BNR view of a data field (bits 29-11). */
export function decodeBnr(dataField: number): Arinc429Bnr {
  const field = dataField & 0x7ffff;
  const negative = ((field >>> 18) & 1) === 1;
  return {
    field,
    signed: negative ? field - 0x80000 : field,
    negative,
    magnitude: field & 0x3ffff,
  };
}

/** Pack a signed count into the 19-bit two's-complement data field. */
export function encodeBnrField(signed: number): number {
  return (Math.trunc(signed) & 0x7ffff) >>> 0;
}

/**
 * Scale a raw BNR count into engineering units. Bit 28 carries half the
 * parameter's full-scale value, bit 27 a quarter, and so on down to bit 11 —
 * so one count is fullScale / 2^18. The full-scale range comes from the
 * parameter's own definition, which is why the caller supplies it.
 */
export function applyBnrScale(signed: number, fullScale: number): number {
  return (signed * fullScale) / 2 ** BNR_MAGNITUDE_BITS;
}

/**
 * Resolution of a parameter that uses `magnitudeBits` bits below the sign.
 * A parameter using bits 29-19 has 10 magnitude bits, not 18: the unused low
 * bits are padding and do not add resolution.
 */
export function bnrResolution(fullScale: number, magnitudeBits: number): number {
  return fullScale / 2 ** magnitudeBits;
}

// ---------------------------------------------------------------------------
// BCD data
// ---------------------------------------------------------------------------

/**
 * Five subfields. The most significant one is only 3 bits wide, so it tops out
 * at 7 — a value needing a larger leading digit pads bits 29-27 with zeros and
 * lets the second subfield lead, giving 4 digits instead of 5.
 */
export const BCD_SUBFIELDS = [
  { first: 27, last: 29, maxDigit: 7 },
  { first: 23, last: 26, maxDigit: 9 },
  { first: 19, last: 22, maxDigit: 9 },
  { first: 15, last: 18, maxDigit: 9 },
  { first: 11, last: 14, maxDigit: 9 },
] as const;

export interface Arinc429Bcd {
  /** Five digits, most significant first, as read from the bits. */
  digits: number[];
  /** The digits combined, or null when any of them is not a decimal digit. */
  value: number | null;
  /** 1-based positions of subfields holding a non-decimal nibble. */
  invalidDigits: number[];
}

/** Read the BCD view of a data field (bits 29-11). */
export function decodeBcd(dataField: number): Arinc429Bcd {
  const field = dataField & 0x7ffff;
  const digits: number[] = [];
  const invalidDigits: number[] = [];

  BCD_SUBFIELDS.forEach((sub, i) => {
    // Subfields are described in word-bit terms; shift down to bit 11 first.
    const digit = fieldValue(field << 10, sub.first, sub.last);
    digits.push(digit);
    if (digit > sub.maxDigit) invalidDigits.push(i + 1);
  });

  return {
    digits,
    value: invalidDigits.length === 0 ? digits.reduce((acc, d) => acc * 10 + d, 0) : null,
    invalidDigits,
  };
}

export type BcdEncodeResult = { ok: true; dataField: number } | { ok: false; error: string };

/** Pack up to five digits (most significant first) into a data field. */
export function encodeBcd(digits: number[]): BcdEncodeResult {
  if (digits.length === 0 || digits.length > BCD_SUBFIELDS.length) {
    return { ok: false, error: `BCD words hold 1-5 digits, got ${digits.length}` };
  }
  // Short digit lists are right-aligned: the least significant digit always
  // lands in bits 14-11, exactly as a shorter number would be transmitted.
  const padded: number[] = [...new Array<number>(BCD_SUBFIELDS.length - digits.length).fill(0), ...digits];

  let field = 0;
  for (let i = 0; i < BCD_SUBFIELDS.length; i++) {
    const sub = BCD_SUBFIELDS[i]!;
    const digit = padded[i]!;
    if (!Number.isInteger(digit) || digit < 0 || digit > sub.maxDigit) {
      return {
        ok: false,
        error: `Digit ${i + 1} must be 0-${sub.maxDigit} (bits ${sub.first}-${sub.last}), got ${digit}`,
      };
    }
    field |= digit << (sub.first - 11);
  }
  return { ok: true, dataField: field >>> 0 };
}

// ---------------------------------------------------------------------------
// Decoding a whole word
// ---------------------------------------------------------------------------

export interface Arinc429Label {
  /** Bits 1-8 exactly as they sit in the word. */
  field: number;
  /** 3-digit octal label under the selected convention. */
  octal: string;
  /** The same field read under the other convention — see LabelBitOrder. */
  octalAlternate: string;
  bitOrder: LabelBitOrder;
}

export interface Arinc429Word {
  /** The 32-bit word. */
  raw: number;
  hex: string;
  /** 32 characters, bit 32 first. */
  bits: string;
  label: Arinc429Label;
  /** Bits 10-9. Some parameters extend the data field over these. */
  sdi: number;
  /** Bits 29-11, unsigned. */
  data: number;
  ssm: number;
  ssmReadings: SsmReadings;
  /** Reading for the caller-supplied format; null when no format was given. */
  ssmMeaning: string | null;
  format: Arinc429Format | null;
  /** Bit 32 as found in the word. */
  parityBit: 0 | 1;
  /** Bit 32 as odd parity requires it to be. */
  parityExpected: 0 | 1;
  parityOk: boolean;
  bnr: Arinc429Bnr;
  bcd: Arinc429Bcd;
}

export interface Arinc429ParseOptions {
  labelBitOrder?: LabelBitOrder;
  /**
   * The data type the label implies. Left out, the SSM is reported under all
   * three readings and no single one is claimed.
   */
  format?: Arinc429Format;
}

export type Arinc429ParseResult = { ok: true; word: Arinc429Word } | { ok: false; error: string };

function toHex(word: number): string {
  return `0x${(word >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function toBits(word: number): string {
  return (word >>> 0).toString(2).padStart(32, "0");
}

/** Decode a 32-bit word that is already a number. */
export function decodeArinc429(word: number, opts: Arinc429ParseOptions = {}): Arinc429Word {
  const raw = word >>> 0;
  const bitOrder = opts.labelBitOrder ?? DEFAULT_LABEL_BIT_ORDER;
  const other: LabelBitOrder = bitOrder === "bit1-msb" ? "bit8-msb" : "bit1-msb";
  const labelField = fieldValue(raw, ARINC429_FIELDS.label.first, ARINC429_FIELDS.label.last);
  const data = fieldValue(raw, ARINC429_FIELDS.data.first, ARINC429_FIELDS.data.last);
  const ssm = fieldValue(raw, ARINC429_FIELDS.ssm.first, ARINC429_FIELDS.ssm.last);
  const parityExpected = arinc429Parity(raw);
  const parityBit = arinc429Bit(raw, 32);

  return {
    raw,
    hex: toHex(raw),
    bits: toBits(raw),
    label: {
      field: labelField,
      octal: labelToOctal(labelField, bitOrder),
      octalAlternate: labelToOctal(labelField, other),
      bitOrder,
    },
    sdi: fieldValue(raw, ARINC429_FIELDS.sdi.first, ARINC429_FIELDS.sdi.last),
    data,
    ssm,
    ssmReadings: ssmReadings(ssm),
    ssmMeaning: opts.format ? ssmMeaning(ssm, opts.format) : null,
    format: opts.format ?? null,
    parityBit,
    parityExpected,
    parityOk: parityBit === parityExpected,
    bnr: decodeBnr(data),
    bcd: decodeBcd(data),
  };
}

/**
 * Parse a word from hex text or a number. Hex may carry an 0x prefix and any
 * spacing, so a word copied out of an analyser as "E0 06 40 A1" works as-is.
 */
export function parseArinc429(input: string | number, opts: Arinc429ParseOptions = {}): Arinc429ParseResult {
  if (typeof input === "number") {
    if (!Number.isInteger(input) || input < 0 || input > 0xffffffff) {
      return { ok: false, error: `Word must be an integer 0 - 0xFFFFFFFF, got ${input}` };
    }
    return { ok: true, word: decodeArinc429(input, opts) };
  }

  const text = input.trim().replace(/[\s_]/g, "").replace(/^0x/i, "");
  if (text === "") return { ok: false, error: "Enter a 32-bit word in hex, e.g. 0xE00640A1" };
  if (!/^[0-9a-f]+$/i.test(text)) {
    return { ok: false, error: `"${input.trim()}" is not hex — expected up to 8 hex digits` };
  }
  if (text.length > 8) {
    return { ok: false, error: `An ARINC 429 word is 8 hex digits, got ${text.length}` };
  }
  return { ok: true, word: decodeArinc429(parseInt(text, 16), opts) };
}

// ---------------------------------------------------------------------------
// Encoding a whole word
// ---------------------------------------------------------------------------

export interface Arinc429BuildFields {
  /** Octal label as written in an ICD, e.g. "205". */
  labelOctal: string;
  /** Bits 10-9, 0-3. */
  sdi?: number;
  /** Bits 29-11. Either this or bcdDigits, not both. */
  data?: number;
  /** BCD digits, most significant first — an alternative to `data`. */
  bcdDigits?: number[];
  /** Bits 31-30, 0-3. Read it off the SSM table for your data type. */
  ssm?: number;
  labelBitOrder?: LabelBitOrder;
}

export interface Arinc429BuiltWord {
  raw: number;
  hex: string;
  parityBit: 0 | 1;
}

export type Arinc429BuildResult = { ok: true; word: Arinc429BuiltWord } | { ok: false; error: string };

/**
 * Build a word. Bit 32 is always computed here, so there is no way to hand this
 * function a parity bit and no way for it to emit a word with the wrong one.
 */
export function buildArinc429(fields: Arinc429BuildFields): Arinc429BuildResult {
  const label = octalToLabel(fields.labelOctal, fields.labelBitOrder ?? DEFAULT_LABEL_BIT_ORDER);
  if (!label.ok) return label;

  const sdi = fields.sdi ?? 0;
  if (!Number.isInteger(sdi) || sdi < 0 || sdi > 3) {
    return { ok: false, error: `SDI must be 0-3, got ${fields.sdi}` };
  }

  const ssm = fields.ssm ?? 0;
  if (!Number.isInteger(ssm) || ssm < 0 || ssm > 3) {
    return { ok: false, error: `SSM must be 0-3, got ${fields.ssm}` };
  }

  if (fields.data !== undefined && fields.bcdDigits !== undefined) {
    return { ok: false, error: "Give either data or bcdDigits, not both" };
  }

  let data = 0;
  if (fields.bcdDigits !== undefined) {
    const bcd = encodeBcd(fields.bcdDigits);
    if (!bcd.ok) return bcd;
    data = bcd.dataField;
  } else if (fields.data !== undefined) {
    if (!Number.isInteger(fields.data) || fields.data < 0 || fields.data > 0x7ffff) {
      return { ok: false, error: `Data must be an integer 0 - 0x7FFFF (19 bits), got ${fields.data}` };
    }
    data = fields.data;
  }

  const body = ((label.labelField | (sdi << 8) | (data << 10) | (ssm << 29)) & 0x7fffffff) >>> 0;
  const raw = withOddParity(body);
  return { ok: true, word: { raw, hex: toHex(raw), parityBit: arinc429Bit(raw, 32) } };
}
