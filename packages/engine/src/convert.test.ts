import { describe, expect, it } from "vitest";
import {
  asciiToBytes,
  bcdToDecimal,
  bytesToAscii,
  bytesToHex,
  decimalToBcd,
  float32ToRegisters,
  formatInBase,
  fromSigned,
  parseHex,
  parseInBase,
  registersToFloat32,
  toSigned,
  WORD_ORDERS,
  type WordOrder,
} from "./convert";
import vectors from "../vectors/convert.json";
import bcdVectors from "../vectors/bcd.json";

describe("§9.3 float word orders", () => {
  const expected = vectors.float.value;
  const tol = vectors.float.tolerance;

  it.each(WORD_ORDERS)("registers → float (%s)", (order) => {
    const regsHex = vectors.float.registers[order as WordOrder];
    const regs: [number, number] = [Number(regsHex[0]), Number(regsHex[1])];
    expect(Math.abs(registersToFloat32(regs, order) - expected)).toBeLessThan(tol);
  });

  it.each(WORD_ORDERS)("float → registers roundtrip (%s)", (order) => {
    const regsHex = vectors.float.registers[order as WordOrder];
    const regs: [number, number] = [Number(regsHex[0]), Number(regsHex[1])];
    const value = registersToFloat32(regs, order);
    expect(float32ToRegisters(value, order)).toEqual(regs);
  });
});

describe("§9.3 integers and hex/ascii", () => {
  it("0xFFF6 as s16 = -10", () => {
    expect(toSigned(Number(vectors.signed16.raw), 16)).toBe(vectors.signed16.value);
    expect(fromSigned(vectors.signed16.value, 16)).toBe(Number(vectors.signed16.raw));
  });

  it("hex '48 69' ↔ 'Hi'", () => {
    const parsed = parseHex(vectors.hexAscii.hex);
    if (!parsed.ok) throw new Error("vector hex must parse");
    expect(bytesToAscii(parsed.bytes)).toBe(vectors.hexAscii.ascii);
    expect(bytesToHex(asciiToBytes(vectors.hexAscii.ascii))).toBe(vectors.hexAscii.hex);
  });
});

describe("hex parsing", () => {
  it("accepts spaces, commas and 0x prefixes", () => {
    for (const input of ["01 03 0A", "01,03,0x0A", "01030A", "0x01 0x03 0x0A"]) {
      const r = parseHex(input);
      expect(r.ok, input).toBe(true);
      if (r.ok) expect(Array.from(r.bytes)).toEqual([0x01, 0x03, 0x0a]);
    }
  });

  it("reports the index of the first invalid character", () => {
    const r = parseHex("01 0G 03");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.index).toBe(4);
      expect(r.error.char).toBe("G");
    }
  });
});

describe("number bases", () => {
  it("parses and formats across bases", () => {
    const r = parseInBase("0xFF", 16);
    expect(r.ok && r.value).toBe(255n);
    expect(formatInBase(255n, 2)).toBe("11111111");
    expect(formatInBase(255n, 8)).toBe("377");
    expect(formatInBase(255n, 10)).toBe("255");
  });

  it("reports invalid digit index", () => {
    const r = parseInBase("1012", 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorIndex).toBe(3);
  });
});

describe("§9.4 BCD golden vectors", () => {
  it("0x1234 → 1234", () => {
    const r = bcdToDecimal(Number(bcdVectors.decode.word));
    expect(r.ok && r.value).toBe(bcdVectors.decode.value);
  });

  it("5678 → 0x5678", () => {
    expect(decimalToBcd(bcdVectors.encode.value)).toBe(Number(bcdVectors.encode.word));
  });

  it("0x12A4 → error at nibble 2, value 0xA", () => {
    const r = bcdToDecimal(Number(bcdVectors.invalid.word));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.nibbleIndex).toBe(bcdVectors.invalid.nibbleIndex);
      expect(r.error.nibbleValue).toBe(Number(bcdVectors.invalid.nibbleValue));
    }
  });
});
