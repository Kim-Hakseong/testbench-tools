import { describe, expect, it } from "vitest";
import { parseHex } from "./convert";
import { decodeModbus, decodeRtu, decodeTcp, sniff } from "./modbus";
import vectors from "../vectors/modbus.json";

function bytes(hex: string): Uint8Array {
  const r = parseHex(hex);
  if (!r.ok) throw new Error("vector hex must parse: " + hex);
  return r.bytes;
}

function field(result: { fields: { name: string; value: string; note?: string }[] }, name: string) {
  const f = result.fields.find((x) => x.name.toLowerCase().includes(name.toLowerCase()));
  if (!f) throw new Error(`field not found: ${name}`);
  return f;
}

describe("§9.2 modbus golden vectors", () => {
  it("RTU 11 03 00 6B 00 03 76 87 decodes OK", () => {
    const r = decodeRtu(bytes(vectors.rtuOk.hex));
    expect(r.ok).toBe(true);
    expect(r.crc?.ok).toBe(true);
    expect(field(r, "unit").value).toBe(vectors.rtuOk.unit);
    expect(field(r, "function").value).toBe("0x03");
    expect(field(r, "start address").value).toBe(vectors.rtuOk.address);
    expect(field(r, "quantity").note).toBe(String(vectors.rtuOk.quantity));
  });

  it("RTU ending in 88 fails CRC with expected 0x8776", () => {
    const r = decodeRtu(bytes(vectors.rtuCrcFail.hex));
    expect(r.ok).toBe(false);
    expect(r.crc?.ok).toBe(false);
    expect(r.crc?.computed).toBe(Number(vectors.rtuCrcFail.expectedCrc));
  });

  it("01 83 02 C0 F1 is exception Illegal Data Address", () => {
    const r = decodeRtu(bytes(vectors.exception.hex));
    expect(r.exception?.code).toBe(vectors.exception.code);
    expect(r.exception?.name).toBe(vectors.exception.name);
    expect(r.crc?.ok).toBe(true);
  });

  it("MBAP frame parses as TCP", () => {
    const r = decodeTcp(bytes(vectors.tcp.hex));
    expect(r.ok).toBe(true);
    expect(field(r, "transaction").note).toBe(String(vectors.tcp.transaction));
    expect(field(r, "protocol id").note).toBe("Modbus");
    expect(field(r, "unit").value).toBe(vectors.tcp.unit);
    expect(field(r, "function").value).toBe("0x03");
    expect(field(r, "start address").value).toBe(vectors.tcp.address);
    expect(field(r, "quantity").note).toBe(String(vectors.tcp.quantity));
  });

  it("sniff distinguishes the two frames", () => {
    expect(sniff(bytes(vectors.sniff.rtu))).toBe("rtu");
    expect(sniff(bytes(vectors.sniff.tcp))).toBe("tcp");
    expect(decodeModbus(bytes(vectors.sniff.rtu)).protocol).toBe("rtu");
    expect(decodeModbus(bytes(vectors.sniff.tcp)).protocol).toBe("tcp");
  });
});

describe("modbus decode edges", () => {
  it("rejects frames that are too short", () => {
    expect(decodeRtu(new Uint8Array([0x01, 0x03])).ok).toBe(false);
    expect(decodeTcp(new Uint8Array([0x00, 0x01])).ok).toBe(false);
  });

  it("flags MBAP length mismatch", () => {
    const r = decodeTcp(bytes("00 01 00 00 00 09 11 03 00 6B 00 03"));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/length/i);
  });

  it("field byte ranges cover the RTU frame contiguously", () => {
    const r = decodeRtu(bytes(vectors.rtuOk.hex));
    const covered = r.fields.reduce((n, f) => n + f.length, 0);
    expect(covered).toBe(8);
  });
});
