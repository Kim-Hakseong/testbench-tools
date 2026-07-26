import { describe, expect, it } from "vitest";
import {
  decodeQ,
  encodeQ,
  extractBits,
  extractFields,
  qInfo,
  reverseBytes,
  swapBytesInWords,
  swapWords,
} from "./bits";
import { bytesToHex, parseHex } from "./convert";

function bytes(hex: string): Uint8Array {
  const r = parseHex(hex);
  if (!r.ok) throw new Error("bad hex");
  return r.bytes;
}

describe("endianness swaps", () => {
  it("16-bit byte swap: 12 34 → 34 12", () => {
    expect(bytesToHex(reverseBytes(bytes("12 34")))).toBe("34 12");
  });

  it("32-bit full reverse: 12 34 56 78 → 78 56 34 12", () => {
    expect(bytesToHex(reverseBytes(bytes("12 34 56 78")))).toBe("78 56 34 12");
  });

  it("32-bit word swap: 12 34 56 78 → 56 78 12 34", () => {
    expect(bytesToHex(swapWords(bytes("12 34 56 78")))).toBe("56 78 12 34");
  });

  it("byte swap within 16-bit words: 12 34 56 78 → 34 12 78 56", () => {
    expect(bytesToHex(swapBytesInWords(bytes("12 34 56 78")))).toBe("34 12 78 56");
  });

  it("64-bit full reverse", () => {
    expect(bytesToHex(reverseBytes(bytes("01 23 45 67 89 AB CD EF")))).toBe(
      "EF CD AB 89 67 45 23 01",
    );
  });
});

describe("Q-format", () => {
  it("Q15 (Q0.15): 0.5 → 0x4000, -1 → 0x8000", () => {
    expect(encodeQ(0.5, 0, 15).raw).toBe(0x4000);
    expect(encodeQ(-1, 0, 15).raw).toBe(0x8000);
  });

  it("Q15 max value clamps at 0x7FFF", () => {
    const r = encodeQ(1, 0, 15);
    expect(r.raw).toBe(0x7fff);
    expect(r.clamped).toBe(true);
  });

  it("decode inverts encode (Q7.8)", () => {
    const enc = encodeQ(-3.14159, 7, 8);
    expect(Math.abs(decodeQ(enc.raw, 7, 8) - -3.14159)).toBeLessThan(qInfo(7, 8).resolution);
  });

  it("qInfo(0,15): range [-1, 1-2^-15], resolution 2^-15", () => {
    const info = qInfo(0, 15);
    expect(info.min).toBe(-1);
    expect(info.max).toBeCloseTo(1 - Math.pow(2, -15), 12);
    expect(info.resolution).toBeCloseTo(Math.pow(2, -15), 12);
  });
});

describe("bit fields", () => {
  it("extracts a mid-word field", () => {
    // 0xABCD1234: bits [15:8] = 0x12
    expect(extractBits(0xabcd1234n, 8, 8)).toBe(0x12n);
  });

  it("labels and formats fields", () => {
    const f = extractFields(0b1011_0110n, [
      { name: "low", lsb: 0, width: 4 },
      { name: "high", lsb: 4, width: 4 },
    ]);
    expect(f[0]!.value).toBe(0b0110n);
    expect(f[1]!.value).toBe(0b1011n);
    expect(f[1]!.binary).toBe("1011");
  });
});
