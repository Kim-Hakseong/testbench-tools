// Mitsubishi MELSEC device address notation. Pure TS, no DOM.
//
// A MELSEC device is a letter symbol plus a device number, and the number's
// radix depends on the device — and on the CPU series. Inputs and outputs are
// the ones that bite: X/Y are OCTAL on iQ-F (FX5) and HEXADECIMAL on iQ-R, so
// the same text "X20" is point 16 on one controller and point 32 on the other.
//
// Every radix below is taken from the vendor's own device list:
//   iQ-R  — CPU Module User's Manual (Application), SH-081264ENG, 22.1 Device List
//   FX5   — FX5 User's Manual (Application), JY997D55401AD, 4.1 List of Devices
// See spec/plc-address-notation.md. Series whose manuals have not been read
// are deliberately absent rather than assumed to match.

/** CPU series whose device notation has been verified against its manual. */
export type MelsecSeries = "iq-r" | "fx5";

/** Radix a device number is written in. */
export type MelsecRadix = "octal" | "decimal" | "hexadecimal";

/** Human label and provenance for a series. */
export interface MelsecSeriesInfo {
  id: MelsecSeries;
  label: string;
  /** Vendor manual the device table came from. */
  source: string;
}

export const MELSEC_SERIES: MelsecSeriesInfo[] = [
  {
    id: "iq-r",
    label: "MELSEC iQ-R",
    source: "SH-081264ENG 22.1 Device List",
  },
  {
    id: "fx5",
    label: "MELSEC iQ-F / FX5",
    source: "JY997D55401AD 4.1 List of Devices",
  },
];

// Device symbol -> radix, per series, straight from the manuals' Notation column.
const IQ_R: Record<string, MelsecRadix> = {
  X: "hexadecimal",
  Y: "hexadecimal",
  M: "decimal",
  B: "hexadecimal",
  F: "decimal",
  SB: "hexadecimal",
  V: "decimal",
  S: "decimal",
  T: "decimal",
  ST: "decimal",
  LT: "decimal",
  LST: "decimal",
  C: "decimal",
  LC: "decimal",
  D: "decimal",
  W: "hexadecimal",
  SW: "hexadecimal",
  L: "decimal",
  SM: "decimal",
  SD: "decimal",
  Z: "decimal",
  LZ: "decimal",
  R: "decimal",
};

const FX5: Record<string, MelsecRadix> = {
  X: "octal",
  Y: "octal",
  M: "decimal",
  L: "decimal",
  B: "hexadecimal",
  F: "decimal",
  SB: "hexadecimal",
  S: "decimal",
  T: "decimal",
  ST: "decimal",
  C: "decimal",
  LC: "decimal",
  D: "decimal",
  W: "hexadecimal",
  SW: "hexadecimal",
  SM: "decimal",
  SD: "decimal",
  Z: "decimal",
  LZ: "decimal",
  R: "decimal",
  ER: "decimal",
};

const TABLES: Record<MelsecSeries, Record<string, MelsecRadix>> = {
  "iq-r": IQ_R,
  fx5: FX5,
};

/** Device symbols a series defines, longest first so "ST" beats "S" when parsing. */
export function deviceSymbols(series: MelsecSeries): string[] {
  return Object.keys(TABLES[series]).sort((a, b) => b.length - a.length || a.localeCompare(b));
}

/** Radix for a device symbol in a series, or null if the series has no such device. */
export function deviceRadix(series: MelsecSeries, symbol: string): MelsecRadix | null {
  return TABLES[series][symbol.toUpperCase()] ?? null;
}

/** Numeric base behind a radix name. */
export function radixBase(radix: MelsecRadix): number {
  switch (radix) {
    case "octal":
      return 8;
    case "decimal":
      return 10;
    case "hexadecimal":
      return 16;
  }
}

/** Digits legal in a radix, for validating input. */
function digitPattern(radix: MelsecRadix): RegExp {
  switch (radix) {
    case "octal":
      return /^[0-7]+$/;
    case "decimal":
      return /^[0-9]+$/;
    case "hexadecimal":
      return /^[0-9A-F]+$/;
  }
}

/** A parsed MELSEC device address. */
export interface MelsecAddress {
  series: MelsecSeries;
  symbol: string;
  radix: MelsecRadix;
  /** The number exactly as written, without the symbol. */
  numberText: string;
  /** The device number as an ordinary integer — the nth point of that device. */
  index: number;
}

/** Result of parsing user input. */
export type MelsecParseResult =
  | { ok: true; address: MelsecAddress }
  | { ok: false; error: string };

/**
 * Parse a device address such as X20, D100 or SB1F for a given series.
 * Case and surrounding whitespace are ignored.
 */
export function parseMelsecAddress(series: MelsecSeries, input: string): MelsecParseResult {
  const text = input.trim().toUpperCase().replace(/\s+/g, "");
  if (text === "") return { ok: false, error: "Enter a device address" };

  if (!/^[A-Z][0-9A-Z]*$/.test(text)) {
    return { ok: false, error: "Write a device letter followed by its number, e.g. X20" };
  }

  // Match the symbol as a prefix, longest first, so ST100 is the retentive timer
  // rather than S + T100. Splitting on "letters then digits" cannot work: a
  // hexadecimal device number contains A-F, so XE would lose its digit.
  const symbols = deviceSymbols(series);
  let prefix: string | undefined;

  for (const symbol of symbols) {
    if (!text.startsWith(symbol)) continue;
    prefix ??= symbol;

    const digits = text.slice(symbol.length);
    if (digits === "") continue;

    const radix = TABLES[series][symbol]!;
    if (!digitPattern(radix).test(digits)) continue;

    return {
      ok: true,
      address: {
        series,
        symbol,
        radix,
        numberText: digits,
        index: parseInt(digits, radixBase(radix)),
      },
    };
  }

  if (prefix === undefined) {
    return {
      ok: false,
      error: `${text} is not a device of this series — try X, Y, M, D, B, W…`,
    };
  }

  const digits = text.slice(prefix.length);
  if (digits === "") {
    return { ok: false, error: `${prefix} needs a device number, e.g. ${prefix}0` };
  }

  const radix = TABLES[series][prefix]!;
  const legal = radix === "octal" ? "0-7" : radix === "decimal" ? "0-9" : "0-9 and A-F";
  return {
    ok: false,
    error: `${prefix} is written in ${radix} on this series, so its digits are ${legal} — "${digits}" is not valid`,
  };
}

/** Render a device number in the notation its series uses. */
export function formatMelsecAddress(
  series: MelsecSeries,
  symbol: string,
  index: number,
): string {
  const radix = deviceRadix(series, symbol);
  if (radix === null) return `${symbol}${index}`;
  return `${symbol}${index.toString(radixBase(radix)).toUpperCase()}`;
}

/**
 * The same physical point written for another series. X20 on FX5 is point 16,
 * which is X10 on iQ-R — the conversion people get wrong when porting a program.
 */
export function convertSeries(
  address: MelsecAddress,
  target: MelsecSeries,
): { ok: true; text: string; radix: MelsecRadix } | { ok: false; error: string } {
  const radix = deviceRadix(target, address.symbol);
  if (radix === null) {
    return { ok: false, error: `${address.symbol} is not a device of the target series` };
  }
  return { ok: true, text: formatMelsecAddress(target, address.symbol, address.index), radix };
}

/** The next `count` consecutive devices, written in the series' own notation. */
export function nextAddresses(address: MelsecAddress, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(formatMelsecAddress(address.series, address.symbol, address.index + i));
  }
  return out;
}
