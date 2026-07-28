import { describe, expect, it } from "vitest";
import {
  convertSeries,
  deviceRadix,
  deviceSymbols,
  formatMelsecAddress,
  MELSEC_SERIES,
  nextAddresses,
  parseMelsecAddress,
  radixBase,
  type MelsecAddress,
  type MelsecSeries,
} from "./melsec";
import vectors from "../vectors/melsec.json";

function parsed(series: MelsecSeries, input: string): MelsecAddress {
  const result = parseMelsecAddress(series, input);
  if (!result.ok) throw new Error(`${series} ${input} should parse: ${result.error}`);
  return result.address;
}

describe("MELSEC device radix (from the vendor device lists)", () => {
  for (const series of ["iq-r", "fx5"] as const) {
    const table = vectors.radix[series];
    for (const [symbol, radix] of Object.entries(table)) {
      it(`${series}: ${symbol} is ${radix}`, () => {
        expect(deviceRadix(series, symbol)).toBe(radix);
      });
    }
  }

  it("X and Y differ between the two series — the whole point", () => {
    expect(deviceRadix("fx5", "X")).toBe("octal");
    expect(deviceRadix("iq-r", "X")).toBe("hexadecimal");
    expect(deviceRadix("fx5", "Y")).toBe("octal");
    expect(deviceRadix("iq-r", "Y")).toBe("hexadecimal");
  });

  it("radix bases are 8 / 10 / 16", () => {
    expect(radixBase("octal")).toBe(8);
    expect(radixBase("decimal")).toBe(10);
    expect(radixBase("hexadecimal")).toBe(16);
  });

  it("unknown symbols report null rather than guessing", () => {
    expect(deviceRadix("fx5", "QQ")).toBeNull();
  });

  it("both documented series are offered with their source", () => {
    expect(MELSEC_SERIES).toHaveLength(2);
    for (const s of MELSEC_SERIES) expect(s.source.length).toBeGreaterThan(0);
  });
});

describe("MELSEC address parsing (golden vectors)", () => {
  for (const v of vectors.parse) {
    it(`${v.series}: ${v.input} → ${v.symbol} #${v.index}`, () => {
      const address = parsed(v.series as MelsecSeries, v.input);
      expect(address.symbol).toBe(v.symbol);
      expect(address.radix).toBe(v.radix);
      expect(address.index).toBe(v.index);
    });
  }

  it("longest symbol wins so ST50 is a retentive timer", () => {
    expect(parsed("iq-r", "ST50").symbol).toBe("ST");
    expect(parsed("iq-r", "S50").symbol).toBe("S");
  });

  it("round-trips through the series notation", () => {
    for (const v of vectors.parse) {
      const address = parsed(v.series as MelsecSeries, v.input);
      const text = formatMelsecAddress(address.series, address.symbol, address.index);
      expect(parsed(address.series, text).index).toBe(address.index);
    }
  });
});

describe("MELSEC address rejection", () => {
  for (const v of vectors.rejects) {
    it(`${v.series} rejects "${v.input}" (${v.why})`, () => {
      const result = parseMelsecAddress(v.series as MelsecSeries, v.input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    });
  }

  it("every octal X digit 0-7 parses and 8/9 do not", () => {
    for (let d = 0; d <= 7; d++) {
      expect(parseMelsecAddress("fx5", `X${d}`).ok).toBe(true);
    }
    for (const d of [8, 9]) {
      expect(parseMelsecAddress("fx5", `X${d}`).ok).toBe(false);
    }
  });
});

describe("MELSEC cross-series conversion", () => {
  it("the same text means different points", () => {
    const v = vectors.crossSeries[0]!;
    expect(parsed("fx5", v.text!).index).toBe(v.fx5Index);
    expect(parsed("iq-r", v.text!).index).toBe(v.iqrIndex);
  });

  it("the same point is written differently", () => {
    const v = vectors.crossSeries[1]!;
    expect(formatMelsecAddress("fx5", v.symbol, v.index!)).toBe(v.fx5Text);
    expect(formatMelsecAddress("iq-r", v.symbol, v.index!)).toBe(v.iqrText);
  });

  it("decimal devices are unaffected by the series", () => {
    const v = vectors.crossSeries[2]!;
    expect(formatMelsecAddress("fx5", v.symbol, v.index!)).toBe(v.fx5Text);
    expect(formatMelsecAddress("iq-r", v.symbol, v.index!)).toBe(v.iqrText);
  });

  it("convertSeries preserves the point index", () => {
    const address = parsed("fx5", "X20");
    const converted = convertSeries(address, "iq-r");
    expect(converted.ok).toBe(true);
    if (converted.ok) {
      expect(converted.text).toBe("X10");
      expect(parsed("iq-r", converted.text).index).toBe(address.index);
    }
  });

  it("converting a device the target lacks fails instead of guessing", () => {
    const address = parsed("fx5", "ER10");
    expect(convertSeries(address, "iq-r").ok).toBe(false);
  });
});

describe("MELSEC consecutive devices", () => {
  for (const key of ["fx5X", "iqrX", "d"] as const) {
    const c = vectors.next[key];
    it(`${c.series} ${c.input} +${c.count}`, () => {
      const list = nextAddresses(parsed(c.series as MelsecSeries, c.input), c.count);
      expect(list).toEqual(c.expect);
    });
  }

  it("every generated address parses back to a consecutive index", () => {
    const start = parsed("fx5", "X6");
    nextAddresses(start, 20).forEach((text, i) => {
      expect(parsed("fx5", text).index).toBe(start.index + i);
    });
  });
});

describe("MELSEC device catalogue", () => {
  it("lists longer symbols before their prefixes", () => {
    const symbols = deviceSymbols("iq-r");
    expect(symbols.indexOf("ST")).toBeLessThan(symbols.indexOf("S"));
    expect(symbols.indexOf("SB")).toBeLessThan(symbols.indexOf("S"));
  });

  it("every listed symbol has a radix", () => {
    for (const series of ["iq-r", "fx5"] as const) {
      for (const symbol of deviceSymbols(series)) {
        expect(deviceRadix(series, symbol)).not.toBeNull();
      }
    }
  });
});
