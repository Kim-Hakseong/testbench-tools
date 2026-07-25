import { describe, expect, it } from "vitest";
import { crc, crcBytes, CRC_PRESETS, getPreset, sum8, xor8 } from "./checksum";
import { asciiToBytes, bytesToHex, parseHex } from "./convert";
import vectors from "../vectors/checksum.json";
import catalogChecks from "../vectors/crc-catalog-checks.json";

const DATA = asciiToBytes("123456789");

describe("§9.1 checksum golden vectors ('123456789')", () => {
  it.each(
    Object.entries(vectors.check123456789).filter(([name]) => name.startsWith("CRC")),
  )("%s = %s", (name, expected) => {
    expect(crc(DATA, getPreset(name))).toBe(Number(expected));
  });

  it("XOR8 = 0x31", () => {
    expect(xor8(DATA)).toBe(Number(vectors.check123456789.XOR8));
  });

  it("SUM8 = 0xDD", () => {
    expect(sum8(DATA)).toBe(Number(vectors.check123456789.SUM8));
  });

  it("custom CRC-8 poly 0xD5 init 0xFF = 0x7C", () => {
    const p = vectors.customCrc8.params;
    const result = crc(DATA, {
      width: p.width,
      poly: Number(p.poly),
      init: Number(p.init),
      refin: p.refin,
      refout: p.refout,
      xorout: Number(p.xorout),
    });
    expect(result).toBe(Number(vectors.customCrc8.check));
  });

  it("Modbus frame 01 03 00 00 00 0A → CRC LE C5 CD", () => {
    const parsed = parseHex(vectors.modbusFrame.bytes);
    if (!parsed.ok) throw new Error("vector hex must parse");
    const value = crc(parsed.bytes, getPreset("CRC-16/MODBUS"));
    expect(value).toBe(Number(vectors.modbusFrame.crc));
    expect(bytesToHex(crcBytes(value, 16).le)).toBe(vectors.modbusFrame.crcLeBytes);
  });
});

describe("§9.5 catalog check snapshot (fixed at W2 — immutable)", () => {
  it("every preset reproduces its pinned check value", () => {
    const pinned = catalogChecks.checks as Record<string, string>;
    expect(Object.keys(pinned).sort()).toEqual(CRC_PRESETS.map((p) => p.name).sort());
    for (const preset of CRC_PRESETS) {
      expect(crc(DATA, preset), preset.name).toBe(Number(pinned[preset.name]));
    }
  });
});

describe("crc engine edges", () => {
  it("empty input returns init/xorout-derived value (CRC-32 of '' = 0x00000000)", () => {
    expect(crc(new Uint8Array(0), getPreset("CRC-32"))).toBe(0x00000000);
  });

  it("width < 8 works (CRC-4/ITU check = 0x7)", () => {
    // CRC-4/ITU: width 4, poly 0x3, init 0x0, refin/refout true, xorout 0x0
    const value = crc(DATA, { width: 4, poly: 0x3, init: 0x0, refin: true, refout: true, xorout: 0x0 });
    expect(value).toBe(0x7);
  });
});
