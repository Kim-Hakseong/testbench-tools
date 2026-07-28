// LS ELECTRIC XGT (XGK / XGB) device address notation. Pure TS, no DOM.
//
// XGK splits devices in two, and they are written differently:
//
//   Bit devices   P, M, K, F, L, S and the T/C contacts — no dot. The word
//                 number is decimal and the LAST digit is the bit, in HEX:
//                     P00000  = word 0,    bit 0
//                     P2047F  = word 2047, bit 15
//
//   Word devices  D, R, U, Z and the T/C present values — a dot selects the
//                 bit, and that bit number is also hex:
//                     D0010.1 = D word 10, bit 1
//                     D0011.A = D word 11, bit 10
//
// Both rules and the device classification are from the vendor manual:
// "XGK/XGB Instructions and Programming", LS ELECTRIC, V2.2 — §2.2 (bit data:
// "the lowest place should be marked in hexadecimal"; word device bit: "Word
// device number is displayed in decimal and bit number in hexadecimal") and
// §2.3 Device Area. See spec/plc-address-notation.md.

/** How a device is addressed. */
export type XgtDeviceKind = "bit" | "word";

/** A device area defined by the manual's §2.3 classification. */
export interface XgtDevice {
  symbol: string;
  kind: XgtDeviceKind;
  name: string;
}

/**
 * Device areas. Bit devices carry the bit in their last hex digit; word
 * devices take a dotted hex bit. T and C appear as both because the manual
 * lists their contact as a bit device and their present value as a word device.
 */
export const XGT_DEVICES: XgtDevice[] = [
  { symbol: "P", kind: "bit", name: "I/O relay" },
  { symbol: "M", kind: "bit", name: "Auxiliary relay" },
  { symbol: "K", kind: "bit", name: "Keep relay" },
  { symbol: "F", kind: "bit", name: "Special relay" },
  { symbol: "L", kind: "bit", name: "Link relay" },
  { symbol: "S", kind: "bit", name: "Step control relay" },
  { symbol: "D", kind: "word", name: "Data register" },
  { symbol: "R", kind: "word", name: "File register" },
  { symbol: "Z", kind: "word", name: "Index register" },
];

/** Look up a device area by symbol. */
export function xgtDevice(symbol: string): XgtDevice | null {
  const upper = symbol.toUpperCase();
  return XGT_DEVICES.find((d) => d.symbol === upper) ?? null;
}

/** A parsed XGT address. */
export interface XgtAddress {
  device: XgtDevice;
  /** Word number — always decimal in the source text. */
  word: number;
  /** Bit within the word (0-15), when the address selects one. */
  bit?: number;
  /** The bit as the manual writes it: a single hex digit. */
  bitHex?: string;
}

export type XgtParseResult = { ok: true; address: XgtAddress } | { ok: false; error: string };

function fail(error: string): XgtParseResult {
  return { ok: false, error };
}

/**
 * Parse an XGK/XGB address.
 *
 * Bit devices accept both the concatenated form (P00000) and a word-only form
 * (P0000). Because the trailing hex digit IS the bit, the concatenated form is
 * only unambiguous when the intent is stated — so a bit device with a plain
 * decimal number is read as the manual's bit form when `asBit` is true.
 */
export function parseXgtAddress(input: string, asBit = true): XgtParseResult {
  const text = input.trim().toUpperCase().replace(/\s+/g, "");
  if (text === "") return fail("Enter a device address");

  const match = /^([A-Z])([0-9A-F]+)(?:\.([0-9A-F]))?$/.exec(text);
  if (!match) {
    return fail("Unrecognised address — try P00000, M0010 or D0011.A");
  }

  const device = xgtDevice(match[1]!);
  if (!device) {
    return fail(`${match[1]} is not an XGK device area — try P, M, K, F, L, S, D, R or Z`);
  }

  const digits = match[2]!;
  const dotted = match[3];

  if (device.kind === "word") {
    if (!/^\d+$/.test(digits)) {
      return fail(`${device.symbol} is a word device — its number is decimal, so "${digits}" is not valid`);
    }
    const word = Number(digits);
    if (dotted === undefined) {
      return { ok: true, address: { device, word } };
    }
    return {
      ok: true,
      address: { device, word, bit: parseInt(dotted, 16), bitHex: dotted },
    };
  }

  // Bit device: the manual writes the bit as the lowest digit, in hex.
  if (dotted !== undefined) {
    return fail(`${device.symbol} is a bit device — write the bit as its last digit (e.g. ${device.symbol}00001), not with a dot`);
  }

  if (!asBit) {
    if (!/^\d+$/.test(digits)) {
      return fail(`A word address is decimal, so "${digits}" is not valid`);
    }
    return { ok: true, address: { device, word: Number(digits) } };
  }

  if (digits.length < 2) {
    return fail(`${device.symbol} bit addresses carry the word and the bit, e.g. ${device.symbol}00000`);
  }

  const wordPart = digits.slice(0, -1);
  const bitPart = digits.slice(-1)!;
  if (!/^\d+$/.test(wordPart)) {
    return fail(`The word part is decimal, so "${wordPart}" is not valid`);
  }

  return {
    ok: true,
    address: {
      device,
      word: Number(wordPart),
      bit: parseInt(bitPart, 16),
      bitHex: bitPart,
    },
  };
}

/** Canonical text, following the manual's form for the device kind. */
export function formatXgtAddress(address: XgtAddress, wordDigits = 4): string {
  const { device, word, bit } = address;
  const wordText = String(word).padStart(wordDigits, "0");

  if (bit === undefined) return `${device.symbol}${wordText}`;
  const bitText = bit.toString(16).toUpperCase();

  return device.kind === "bit"
    ? `${device.symbol}${wordText}${bitText}`
    : `${device.symbol}${wordText}.${bitText}`;
}

/** Flat bit position from the start of the device area. */
export function xgtFlatBitIndex(address: XgtAddress): number {
  return address.word * 16 + (address.bit ?? 0);
}

/** The next `count` consecutive bits, rolling into the following word. */
export function xgtNextBits(address: XgtAddress, count: number, wordDigits = 4): string[] {
  const start = xgtFlatBitIndex(address);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const flat = start + i;
    out.push(
      formatXgtAddress(
        { device: address.device, word: Math.floor(flat / 16), bit: flat % 16 },
        wordDigits,
      ),
    );
  }
  return out;
}
