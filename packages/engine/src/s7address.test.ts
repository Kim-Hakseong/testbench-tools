import { describe, expect, it } from "vitest";
import {
  absoluteBitIndex,
  allocate,
  bitAddressFromIndex,
  byteSpan,
  collidingAddresses,
  coveredBytes,
  formatS7,
  overlaps,
  parseS7Address,
  widthBytes,
  type S7Address,
  type S7Area,
  type S7Width,
} from "./s7address";
import vectors from "../vectors/s7address.json";

function parsed(input: string): S7Address {
  const result = parseS7Address(input);
  if (!result.ok) throw new Error(`${input} should parse: ${result.error}`);
  return result.address;
}

describe("S7 address parsing (golden vectors)", () => {
  for (const v of vectors.parse) {
    it(`${v.input} → ${v.canonical}`, () => {
      const address = parsed(v.input);
      expect(address.area).toBe(v.area);
      expect(address.width).toBe(v.width);
      expect(address.byteOffset).toBe(v.byteOffset);
      if ("bitOffset" in v) expect(address.bitOffset).toBe(v.bitOffset);
      if ("dbNumber" in v) expect(address.dbNumber).toBe(v.dbNumber);
      expect(formatS7(address)).toBe(v.canonical);
      expect(coveredBytes(address)).toEqual(v.bytes);
      expect(absoluteBitIndex(address)).toBe(v.firstBit);
    });
  }

  it("round-trips canonical text", () => {
    for (const v of vectors.parse) {
      expect(formatS7(parsed(v.canonical))).toBe(v.canonical);
    }
  });
});

describe("S7 address rejection", () => {
  for (const v of vectors.rejects) {
    it(`rejects "${v.input}" (${v.why})`, () => {
      const result = parseS7Address(v.input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    });
  }
});

describe("S7 width arithmetic", () => {
  it("bit and byte cover 1, word 2, dword 4", () => {
    expect(widthBytes("X")).toBe(1);
    expect(widthBytes("B")).toBe(1);
    expect(widthBytes("W")).toBe(2);
    expect(widthBytes("D")).toBe(4);
  });

  it("byte span is inclusive", () => {
    expect(byteSpan(parsed("%MD100"))).toEqual({ first: 100, last: 103 });
    expect(byteSpan(parsed("%MB7"))).toEqual({ first: 7, last: 7 });
  });

  it("absolute bit index round-trips", () => {
    for (let index = 0; index < 64; index++) {
      const address = bitAddressFromIndex("M", index);
      expect(absoluteBitIndex(address)).toBe(index);
      expect(address.bitOffset).toBeLessThan(8);
    }
  });
});

describe("S7 overlap detection (golden vectors)", () => {
  for (const v of vectors.overlap) {
    it(`${v.a} vs ${v.b} → ${v.overlaps}`, () => {
      expect(overlaps(parsed(v.a), parsed(v.b))).toBe(v.overlaps);
    });
  }

  it("is symmetric", () => {
    for (const v of vectors.overlap) {
      const a = parsed(v.a);
      const b = parsed(v.b);
      expect(overlaps(a, b)).toBe(overlaps(b, a));
    }
  });

  it("every address overlaps itself", () => {
    for (const text of ["%MW100", "%MB3", "%MD8", "%M2.4", "DB1.DBW20"]) {
      expect(overlaps(parsed(text), parsed(text))).toBe(true);
    }
  });
});

describe("S7 allocation", () => {
  const cases = vectors.allocate;
  for (const key of ["words", "dwords", "bytes", "bits"] as const) {
    const c = cases[key];
    it(`${key}: ${c.count} from ${c.start} → no overlap`, () => {
      const list = allocate(c.area as S7Area, c.width as S7Width, c.start, c.count);
      expect(list.map(formatS7)).toEqual(c.expect);

      // The point of the helper: nothing in the list collides with anything else.
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          expect(overlaps(list[i]!, list[j]!)).toBe(false);
        }
      }
    });
  }
});

describe("S7 colliding addresses", () => {
  it("%MW100 blocks %MW99 and %MW101 but not %MW98/%MW102", () => {
    const collisions = collidingAddresses(parsed("%MW100"), "W").map(formatS7);
    expect(collisions).toContain("%MW99");
    expect(collisions).toContain("%MW101");
    expect(collisions).not.toContain("%MW98");
    expect(collisions).not.toContain("%MW102");
    expect(collisions).not.toContain("%MW100");
  });

  it("every reported collision really overlaps", () => {
    for (const text of ["%MW100", "%MD40", "%MB7"]) {
      const address = parsed(text);
      for (const width of ["B", "W", "D"] as const) {
        for (const other of collidingAddresses(address, width)) {
          expect(overlaps(address, other)).toBe(true);
        }
      }
    }
  });
});
