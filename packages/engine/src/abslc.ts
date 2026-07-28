// Allen-Bradley SLC 500 address notation. Pure TS, no DOM.
//
// SLC memory is a set of numbered files. A data-table address names the file
// type letter, the file number, an element and optionally a bit:
//
//   N7:2      element 2 of integer file 7
//   N7:2/8    bit 8 of that element
//   B3/16     bit 16 of the bit file (bit-only shorthand)
//
// I/O is addressed by slot instead, because the words come from the chassis:
//
//   I:2.1/3   input, slot 2, word 1, bit 3
//   O:5       output, slot 5, word 0
//
// Everything below is from the vendor manual: SLC 500 Instruction Set Reference
// Manual, publication 1747-RM001G-EN-P (November 2008) — Processor Files:
// element 0-255, 16 bits per element, bit 0-15, slot/word I/O form, and the
// default file-number assignments. See spec/plc-address-notation.md.

/** File type letters the SLC uses. */
export type AbFileType = "O" | "I" | "S" | "B" | "T" | "C" | "R" | "N" | "F" | "ST" | "A";

/** A default (reserved) file number and what it holds. */
export interface AbDefaultFile {
  number: number;
  type: AbFileType;
  name: string;
}

/**
 * Files 0-8 are reserved with fixed meanings; 9-255 are user-configurable as
 * bit, timer, counter, control, integer, floating point, ASCII or string.
 */
export const AB_DEFAULT_FILES: AbDefaultFile[] = [
  { number: 0, type: "O", name: "Output" },
  { number: 1, type: "I", name: "Input" },
  { number: 2, type: "S", name: "Status" },
  { number: 3, type: "B", name: "Bit" },
  { number: 4, type: "T", name: "Timer" },
  { number: 5, type: "C", name: "Counter" },
  { number: 6, type: "R", name: "Control" },
  { number: 7, type: "N", name: "Integer" },
  { number: 8, type: "F", name: "Floating point" },
];

/** Human name for a file type letter. */
export const AB_TYPE_NAME: Record<AbFileType, string> = {
  O: "Output",
  I: "Input",
  S: "Status",
  B: "Bit",
  T: "Timer",
  C: "Counter",
  R: "Control",
  N: "Integer",
  F: "Floating point",
  ST: "String",
  A: "ASCII",
};

/** File types a user may assign to files 9-255. */
export const AB_ASSIGNABLE_TYPES: AbFileType[] = ["B", "T", "C", "R", "N", "F", "ST", "A"];

/** Highest element number in a data file. */
export const AB_MAX_ELEMENT = 255;

/** Bits per element — an SLC element is one 16-bit word. */
export const AB_BITS_PER_ELEMENT = 16;

/** A parsed data-table address such as N7:2/8. */
export interface AbDataAddress {
  kind: "data";
  type: AbFileType;
  file: number;
  element: number;
  /** Bit within the element, 0-15, when the address selects one. */
  bit?: number;
  /** True when the file number is one of the reserved 0-8 assignments. */
  isDefaultFile: boolean;
}

/** A parsed I/O address such as I:2.1/3. */
export interface AbIoAddress {
  kind: "io";
  type: "I" | "O";
  slot: number;
  word: number;
  bit?: number;
}

export type AbAddress = AbDataAddress | AbIoAddress;

export type AbParseResult = { ok: true; address: AbAddress } | { ok: false; error: string };

function fail(error: string): AbParseResult {
  return { ok: false, error };
}

function checkBit(bit: number): string | null {
  return bit > AB_BITS_PER_ELEMENT - 1
    ? `Bit must be 0-${AB_BITS_PER_ELEMENT - 1} — an element is one 16-bit word`
    : null;
}

/**
 * Parse an SLC 500 address. Case and spaces are ignored. Both the data-table
 * form (N7:2/8) and the I/O slot form (I:2.1/3) are accepted.
 */
export function parseAbAddress(input: string): AbParseResult {
  const text = input.trim().toUpperCase().replace(/\s+/g, "");
  if (text === "") return fail("Enter an address");

  // I/O: I:slot[.word][/bit]
  const io = /^([IO]):(\d+)(?:\.(\d+))?(?:\/(\d+))?$/.exec(text);
  if (io) {
    const bit = io[4] === undefined ? undefined : Number(io[4]);
    if (bit !== undefined) {
      const bad = checkBit(bit);
      if (bad) return fail(bad);
    }
    return {
      ok: true,
      address: {
        kind: "io",
        type: io[1] as "I" | "O",
        slot: Number(io[2]),
        word: io[3] === undefined ? 0 : Number(io[3]),
        bit,
      },
    };
  }

  // Bit-only shorthand for a bit file: B3/16
  const short = /^(B|N)(\d+)\/(\d+)$/.exec(text);
  if (short) {
    const file = Number(short[2]);
    const flat = Number(short[3]);
    return {
      ok: true,
      address: {
        kind: "data",
        type: short[1] as AbFileType,
        file,
        element: Math.floor(flat / AB_BITS_PER_ELEMENT),
        bit: flat % AB_BITS_PER_ELEMENT,
        isDefaultFile: file <= 8,
      },
    };
  }

  // Data table: <type><file>:<element>[/<bit>]
  const data = /^(ST|[OISBTCRNFA])(\d+):(\d+)(?:\/(\d+))?$/.exec(text);
  if (data) {
    const type = data[1] as AbFileType;
    const file = Number(data[2]);
    const element = Number(data[3]);
    const bit = data[4] === undefined ? undefined : Number(data[4]);

    if (element > AB_MAX_ELEMENT) {
      return fail(`Element must be 0-${AB_MAX_ELEMENT}`);
    }
    if (bit !== undefined) {
      const bad = checkBit(bit);
      if (bad) return fail(bad);
    }

    const reserved = AB_DEFAULT_FILES.find((f) => f.number === file);
    if (reserved && reserved.type !== type) {
      return fail(`File ${file} is the ${reserved.name} file (${reserved.type}${file}), not ${type}${file}`);
    }

    return {
      ok: true,
      address: { kind: "data", type, file, element, bit, isDefaultFile: file <= 8 },
    };
  }

  return fail("Unrecognised address — try N7:2, N7:2/8 or I:2.1/3");
}

/** Canonical text for a parsed address. */
export function formatAbAddress(address: AbAddress): string {
  if (address.kind === "io") {
    const base = `${address.type}:${address.slot}.${address.word}`;
    return address.bit === undefined ? base : `${base}/${address.bit}`;
  }
  const base = `${address.type}${address.file}:${address.element}`;
  return address.bit === undefined ? base : `${base}/${address.bit}`;
}

/**
 * Bit position counted from bit 0 of element 0 of the file — the flat index the
 * B3/16 shorthand uses.
 */
export function abFlatBitIndex(address: AbDataAddress): number {
  return address.element * AB_BITS_PER_ELEMENT + (address.bit ?? 0);
}

/** What a file number holds by default, or null when it is user-assignable. */
export function abDefaultFile(file: number): AbDefaultFile | null {
  return AB_DEFAULT_FILES.find((f) => f.number === file) ?? null;
}
