import { describe, expect, it } from "vitest";
import {
  AB_BITS_PER_ELEMENT,
  AB_DEFAULT_FILES,
  AB_MAX_ELEMENT,
  abDefaultFile,
  abFlatBitIndex,
  formatAbAddress,
  parseAbAddress,
  type AbDataAddress,
} from "./abslc";
import {
  formatXgtAddress,
  parseXgtAddress,
  xgtDevice,
  xgtFlatBitIndex,
  xgtNextBits,
  XGT_DEVICES,
  type XgtAddress,
} from "./lsxgt";
import vectors from "../vectors/plc-address-vendors.json";

// ---------------------------------------------------------------------------
// Allen-Bradley SLC 500
// ---------------------------------------------------------------------------

function ab(input: string) {
  const result = parseAbAddress(input);
  if (!result.ok) throw new Error(`${input} should parse: ${result.error}`);
  return result.address;
}

describe("AB SLC 500 default file assignments", () => {
  for (const f of vectors.ab.defaultFiles) {
    it(`file ${f.number} is ${f.name} (${f.type}${f.number})`, () => {
      const found = abDefaultFile(f.number);
      expect(found).not.toBeNull();
      expect(found!.type).toBe(f.type);
      expect(found!.name).toBe(f.name);
    });
  }

  it("files 9 and above are user-assignable", () => {
    expect(abDefaultFile(9)).toBeNull();
    expect(abDefaultFile(255)).toBeNull();
  });

  it("reserves exactly files 0-8", () => {
    expect(AB_DEFAULT_FILES.map((f) => f.number)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("an element is one 16-bit word, elements run to 255", () => {
    expect(AB_BITS_PER_ELEMENT).toBe(16);
    expect(AB_MAX_ELEMENT).toBe(255);
  });
});

describe("AB SLC 500 parsing (golden vectors)", () => {
  for (const v of vectors.ab.parse) {
    it(`${v.input} → ${v.canonical}`, () => {
      const address = ab(v.input);
      expect(address.kind).toBe(v.kind);
      if (address.kind === "data") {
        expect(address.type).toBe(v.type);
        expect(address.file).toBe(v.file);
        expect(address.element).toBe(v.element);
      } else {
        expect(address.type).toBe(v.type);
        expect(address.slot).toBe(v.slot);
        expect(address.word).toBe(v.word);
      }
      expect(address.bit).toBe(v.bit as number | undefined);
      expect(formatAbAddress(address)).toBe(v.canonical);
    });
  }

  it("I:5 and I:5.0 mean the same word", () => {
    expect(formatAbAddress(ab("I:5"))).toBe(formatAbAddress(ab("I:5.0")));
  });
});

describe("AB SLC 500 bit indexing", () => {
  for (const v of vectors.ab.flatBits) {
    it(`${v.input} is flat bit ${v.flat}`, () => {
      expect(abFlatBitIndex(ab(v.input) as AbDataAddress)).toBe(v.flat);
    });
  }

  for (const v of vectors.ab.shorthand) {
    it(`${v.input} shorthand → element ${v.element} bit ${v.bit}`, () => {
      const address = ab(v.input) as AbDataAddress;
      expect(address.element).toBe(v.element);
      expect(address.bit).toBe(v.bit);
    });
  }

  it("shorthand and element/bit forms agree", () => {
    expect(abFlatBitIndex(ab("B3/35") as AbDataAddress)).toBe(
      abFlatBitIndex(ab("B3:2/3") as AbDataAddress),
    );
  });
});

describe("AB SLC 500 rejection", () => {
  for (const v of vectors.ab.rejects) {
    it(`rejects "${v.input}" (${v.why})`, () => {
      const result = parseAbAddress(v.input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    });
  }

  it("accepts every bit 0-15 and refuses 16", () => {
    for (let b = 0; b <= 15; b++) expect(parseAbAddress(`N7:0/${b}`).ok).toBe(true);
    expect(parseAbAddress("N7:0/16").ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LS ELECTRIC XGT (XGK / XGB)
// ---------------------------------------------------------------------------

function ls(input: string): XgtAddress {
  const result = parseXgtAddress(input);
  if (!result.ok) throw new Error(`${input} should parse: ${result.error}`);
  return result.address;
}

describe("LS XGT device classification", () => {
  it("P, M, K, F, L, S are bit devices", () => {
    for (const s of ["P", "M", "K", "F", "L", "S"]) {
      expect(xgtDevice(s)!.kind).toBe("bit");
    }
  });

  it("D, R, Z are word devices", () => {
    for (const s of ["D", "R", "Z"]) {
      expect(xgtDevice(s)!.kind).toBe("word");
    }
  });

  it("unknown areas are not invented", () => {
    expect(xgtDevice("Q")).toBeNull();
    expect(XGT_DEVICES.every((d) => d.name.length > 0)).toBe(true);
  });
});

describe("LS XGT parsing (golden vectors)", () => {
  for (const v of vectors.ls.parse) {
    it(`${v.input} → ${v.canonical}`, () => {
      const address = ls(v.input);
      expect(address.device.symbol).toBe(v.symbol);
      expect(address.device.kind).toBe(v.kind);
      expect(address.word).toBe(v.word);
      expect(address.bit).toBe(v.bit as number | undefined);
      expect(formatXgtAddress(address)).toBe(v.canonical);
    });
  }

  it("the last digit of a bit device is the bit, in hex", () => {
    expect(ls("P0000F").bit).toBe(15);
    expect(ls("P0000A").bit).toBe(10);
    expect(ls("P00009").bit).toBe(9);
  });

  it("a dotted word-device bit is hex too", () => {
    expect(ls("D0011.A").bit).toBe(10);
    expect(ls("D0011.F").bit).toBe(15);
  });
});

describe("LS XGT bit indexing", () => {
  for (const v of vectors.ls.flatBits) {
    it(`${v.input} is flat bit ${v.flat}`, () => {
      expect(xgtFlatBitIndex(ls(v.input))).toBe(v.flat);
    });
  }

  it("consecutive bits roll into the next word", () => {
    const c = vectors.ls.nextBits;
    expect(xgtNextBits(ls(c.input), c.count)).toEqual(c.expect);
  });

  it("every generated bit parses back consecutively", () => {
    const start = ls("P0000D");
    xgtNextBits(start, 40).forEach((text, i) => {
      expect(xgtFlatBitIndex(ls(text))).toBe(xgtFlatBitIndex(start) + i);
    });
  });
});

describe("LS XGT rejection", () => {
  for (const v of vectors.ls.rejects) {
    it(`rejects "${v.input}" (${v.why})`, () => {
      const result = parseXgtAddress(v.input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    });
  }

  it("every hex bit digit 0-F is accepted on a bit device", () => {
    for (const d of "0123456789ABCDEF") {
      expect(parseXgtAddress(`P0000${d}`).ok).toBe(true);
    }
  });
});
