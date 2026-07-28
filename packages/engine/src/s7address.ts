// Siemens S7 (SIMATIC) address notation. Pure TS, no DOM.
//
// S7 addresses name a byte offset inside a memory area, plus an access width.
// Everything here follows from that one rule — no vendor-specific constants are
// involved, only the arithmetic of the addressing model:
//
//   %M10.3      bit 3 of byte 10 in bit memory
//   %MB10       byte 10
//   %MW10       bytes 10-11   (word, big-endian)
//   %MD10       bytes 10-13   (double word)
//   DB1.DBW20   bytes 20-21 of data block 1
//
// The consequence engineers keep hitting: widths overlap. %MW100 and %MW101
// share byte 101, so a "next" word is +2, not +1. This module makes that
// explicit rather than leaving it to be discovered in commissioning.

/** Memory area. DB is a numbered data block; the rest are global areas. */
export type S7Area = "I" | "Q" | "M" | "DB";

/** Access width: bit, byte, word (2 bytes), double word (4 bytes). */
export type S7Width = "X" | "B" | "W" | "D";

/** A parsed S7 address. */
export interface S7Address {
  area: S7Area;
  /** Data block number — present only when area is "DB". */
  dbNumber?: number;
  width: S7Width;
  /** Offset of the first byte the address covers. */
  byteOffset: number;
  /** Bit within the byte (0-7) — present only when width is "X". */
  bitOffset?: number;
}

/** How many bytes an access width covers. A bit still lives inside one byte. */
export function widthBytes(width: S7Width): number {
  switch (width) {
    case "X":
    case "B":
      return 1;
    case "W":
      return 2;
    case "D":
      return 4;
  }
}

/** Inclusive byte range an address occupies. */
export interface ByteSpan {
  first: number;
  last: number;
}

/** The byte range covered by an address. */
export function byteSpan(address: S7Address): ByteSpan {
  return {
    first: address.byteOffset,
    last: address.byteOffset + widthBytes(address.width) - 1,
  };
}

/** Every byte offset the address touches, in order. */
export function coveredBytes(address: S7Address): number[] {
  const span = byteSpan(address);
  const bytes: number[] = [];
  for (let b = span.first; b <= span.last; b++) bytes.push(b);
  return bytes;
}

/**
 * Absolute bit index counted from bit 0 of byte 0 of the area.
 * Defined for bit addresses; for wider accesses it is the first bit covered.
 */
export function absoluteBitIndex(address: S7Address): number {
  return address.byteOffset * 8 + (address.bitOffset ?? 0);
}

/** Turn an absolute bit index back into a bit address in the given area. */
export function bitAddressFromIndex(area: S7Area, index: number, dbNumber?: number): S7Address {
  return {
    area,
    dbNumber,
    width: "X",
    byteOffset: Math.floor(index / 8),
    bitOffset: index % 8,
  };
}

/** Two addresses refer to the same area (and, for DB, the same block). */
export function sameArea(a: S7Address, b: S7Address): boolean {
  if (a.area !== b.area) return false;
  return a.area !== "DB" || a.dbNumber === b.dbNumber;
}

/**
 * Whether two addresses share storage. Bit addresses overlap a wider access
 * when their byte falls inside it; two bits overlap only at the same bit.
 */
export function overlaps(a: S7Address, b: S7Address): boolean {
  if (!sameArea(a, b)) return false;

  const sa = byteSpan(a);
  const sb = byteSpan(b);
  if (sa.last < sb.first || sb.last < sa.first) return false;

  // Same byte, but two distinct bits do not share storage.
  if (a.width === "X" && b.width === "X") {
    return a.byteOffset === b.byteOffset && a.bitOffset === b.bitOffset;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Canonical S7 text for an address, e.g. "%MW100" or "DB1.DBX10.3". */
export function formatS7(address: S7Address): string {
  if (address.area === "DB") {
    const db = `DB${address.dbNumber ?? 0}`;
    if (address.width === "X") {
      return `${db}.DBX${address.byteOffset}.${address.bitOffset ?? 0}`;
    }
    return `${db}.DB${address.width}${address.byteOffset}`;
  }

  if (address.width === "X") {
    return `%${address.area}${address.byteOffset}.${address.bitOffset ?? 0}`;
  }
  return `%${address.area}${address.width}${address.byteOffset}`;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Result of parsing user input. */
export type S7ParseResult =
  | { ok: true; address: S7Address }
  | { ok: false; error: string };

const AREA_LETTERS: Record<string, S7Area> = {
  I: "I",
  E: "I", // German mnemonic (Eingang)
  Q: "Q",
  A: "Q", // German mnemonic (Ausgang)
  M: "M",
};

function fail(error: string): S7ParseResult {
  return { ok: false, error };
}

function buildBit(
  area: S7Area,
  byteOffset: number,
  bitOffset: number,
  dbNumber?: number,
): S7ParseResult {
  if (bitOffset > 7) {
    return fail(`Bit must be 0-7, got ${bitOffset}`);
  }
  return { ok: true, address: { area, dbNumber, width: "X", byteOffset, bitOffset } };
}

/**
 * Parse S7 address text. Accepts the leading "%" or not, either case, and the
 * German I/Q mnemonics (E/A). Data blocks use the DBx.DBWy form.
 */
export function parseS7Address(input: string): S7ParseResult {
  const text = input.trim().toUpperCase().replace(/\s+/g, "");
  if (text === "") return fail("Enter an address");

  // Data block: DB1.DBW20 / DB1.DBX10.3
  const db = /^DB(\d+)\.DB([XBWD])(\d+)(?:\.(\d+))?$/.exec(text);
  if (db) {
    const dbNumber = Number(db[1]);
    const width = db[2] as S7Width;
    const byteOffset = Number(db[3]);
    const bit = db[4];

    if (width === "X") {
      if (bit === undefined) return fail("A bit address needs a bit number, e.g. DB1.DBX10.3");
      return buildBit("DB", byteOffset, Number(bit), dbNumber);
    }
    if (bit !== undefined) return fail(`${width} is not a bit access — drop the ".${bit}"`);
    return { ok: true, address: { area: "DB", dbNumber, width, byteOffset } };
  }

  // Global area: %MW100 / %M10.3 / IB0 / E0.0
  const global = /^%?([IEQAM])([BWD])?(\d+)(?:\.(\d+))?$/.exec(text);
  if (global) {
    // Group 1 is mandatory in the pattern, so it is always present; the
    // fallback keeps the index type honest for the compiler.
    const area = AREA_LETTERS[global[1] ?? ""]!;
    const widthLetter = global[2] as S7Width | undefined;
    const byteOffset = Number(global[3]);
    const bit = global[4];

    if (widthLetter === undefined) {
      // No width letter: a bit address ("%M10.3"), otherwise ambiguous.
      if (bit === undefined) {
        return fail(`Ambiguous — write a width (%${area}B/%${area}W/%${area}D) or a bit (%${area}${byteOffset}.0)`);
      }
      return buildBit(area, byteOffset, Number(bit));
    }

    if (bit !== undefined) return fail(`${widthLetter} is not a bit access — drop the ".${bit}"`);
    return { ok: true, address: { area, width: widthLetter, byteOffset } };
  }

  return fail("Unrecognised address — try %MW100, %M10.3 or DB1.DBW20");
}

// ---------------------------------------------------------------------------
// Allocation
// ---------------------------------------------------------------------------

/**
 * Lay out `count` non-overlapping addresses of one width, starting at
 * `startByte`. Words step by 2 and double words by 4 — the step that stops
 * %MW100 and %MW101 from sharing byte 101.
 */
export function allocate(
  area: S7Area,
  width: S7Width,
  startByte: number,
  count: number,
  dbNumber?: number,
): S7Address[] {
  const step = widthBytes(width);
  const out: S7Address[] = [];
  for (let i = 0; i < count; i++) {
    const byteOffset = startByte + i * step;
    out.push(
      width === "X"
        ? { area, dbNumber, width, byteOffset: startByte + Math.floor(i / 8), bitOffset: i % 8 }
        : { area, dbNumber, width, byteOffset },
    );
  }
  return out;
}

/**
 * The addresses of a given width, in the same area, that would collide with
 * `address`. Useful for showing why %MW101 is not free once %MW100 is used.
 */
export function collidingAddresses(address: S7Address, width: S7Width): S7Address[] {
  const span = byteSpan(address);
  const size = widthBytes(width);
  const out: S7Address[] = [];

  for (let start = Math.max(0, span.first - size + 1); start <= span.last; start++) {
    const candidate: S7Address =
      width === "X"
        ? { area: address.area, dbNumber: address.dbNumber, width, byteOffset: start, bitOffset: 0 }
        : { area: address.area, dbNumber: address.dbNumber, width, byteOffset: start };

    if (width === "X") {
      // Every bit of every covered byte collides with a wider access.
      if (address.width === "X") continue;
      for (let bit = 0; bit < 8; bit++) {
        out.push({ ...candidate, bitOffset: bit });
      }
      continue;
    }
    if (overlaps(address, candidate) && formatS7(candidate) !== formatS7(address)) {
      out.push(candidate);
    }
  }
  return out;
}
