import { describe, expect, it } from "vitest";
import { asciiToBytes, parseHex } from "./convert";
import {
  deepSearchRange,
  identifyFromCatalog,
  matchPresetName,
  type CrcSample,
} from "./identify";

const S123 = asciiToBytes("123456789");

function frame(hex: string): Uint8Array {
  const r = parseHex(hex);
  if (!r.ok) throw new Error("bad hex");
  return r.bytes;
}

describe("§9.5 identify golden vectors", () => {
  it("('123456789', 0x4B37) → candidates include CRC-16/MODBUS", () => {
    const names = identifyFromCatalog([{ data: S123, checksum: 0x4b37 }]).map((p) => p.name);
    expect(names).toContain("CRC-16/MODBUS");
  });

  it("('123456789', 0x29B1) → candidates include CRC-16/CCITT-FALSE", () => {
    const names = identifyFromCatalog([{ data: S123, checksum: 0x29b1 }]).map((p) => p.name);
    expect(names).toContain("CRC-16/CCITT-FALSE");
  });

  it("two crossed pairs compress to a single candidate", () => {
    const samples: CrcSample[] = [
      { data: S123, checksum: 0x4b37 },
      { data: frame("01 03 00 00 00 0A"), checksum: 0xcdc5 },
    ];
    const result = identifyFromCatalog(samples);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("CRC-16/MODBUS");
  });

  it("a wrong checksum yields no candidates", () => {
    expect(identifyFromCatalog([{ data: S123, checksum: 0x0000 }])).toHaveLength(0);
  });
});

describe("deep search", () => {
  it("recovers the MODBUS parameter set from samples (poly range around 0x8005)", () => {
    const samples: CrcSample[] = [
      { data: S123, checksum: 0x4b37 },
      { data: frame("01 03 00 00 00 0A"), checksum: 0xcdc5 },
    ];
    const found = deepSearchRange(samples, 16, 0x8000, 0x8010);
    const modbus = found.find(
      (p) => p.poly === 0x8005 && p.init === 0xffff && p.refin && p.refout && p.xorout === 0,
    );
    expect(modbus).toBeDefined();
    expect(matchPresetName(modbus!)).toBe("CRC-16/MODBUS");
  });

  it("skips even polynomials and respects the range", () => {
    const samples: CrcSample[] = [{ data: S123, checksum: 0x4b37 }];
    const found = deepSearchRange(samples, 16, 0x0000, 0x7fff);
    for (const p of found) {
      expect(p.poly & 1).toBe(1);
      expect(p.poly).toBeLessThanOrEqual(0x7fff);
    }
  });

  it("finds CRC-8 (poly 0x07) in an 8-bit sweep", () => {
    const found = deepSearchRange([{ data: S123, checksum: 0xf4 }], 8, 0x00, 0xff);
    expect(found.some((p) => p.poly === 0x07 && p.init === 0 && !p.refin && p.xorout === 0)).toBe(true);
  });
});
