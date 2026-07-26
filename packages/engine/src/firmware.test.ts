import { describe, expect, it } from "vitest";
import {
  parseIntelHex,
  parseSrec,
  segmentsToBin,
  toIntelHex,
  toSrec,
} from "./firmware";
import { analyzeCanFrame, hexDumpLines, parseCsvNumeric } from "./filetools";

// Canonical Intel HEX example (published in the format's reference docs):
const IHEX_SAMPLE = `:10010000214601360121470136007EFE09D2190140
:100110002146017E17C20001FF5F16002148011928
:00000001FF`;

describe("Intel HEX", () => {
  it("parses the canonical sample (checksums verified)", () => {
    const r = parseIntelHex(IHEX_SAMPLE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.image.segments).toHaveLength(1); // contiguous 0x0100..0x011F
    expect(r.image.segments[0]!.address).toBe(0x0100);
    expect(r.image.segments[0]!.data.length).toBe(32);
    expect(r.image.segments[0]!.data[0]).toBe(0x21);
  });

  it("rejects a corrupted checksum", () => {
    const bad = IHEX_SAMPLE.replace("D2190140", "D2190141");
    const r = parseIntelHex(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/checksum/i);
  });

  it("binary → ihex → binary roundtrip with extended address", () => {
    const data = new Uint8Array(300).map((_, i) => i & 0xff);
    const hex = toIntelHex([{ address: 0x0801_0000, data }]);
    const r = parseIntelHex(hex);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const bin = segmentsToBin(r.image.segments);
    expect(bin.base).toBe(0x0801_0000);
    expect(Array.from(bin.data)).toEqual(Array.from(data));
  });
});

describe("S-Record", () => {
  it("binary → srec → binary roundtrip", () => {
    const data = new Uint8Array(100).map((_, i) => (i * 7) & 0xff);
    const srec = toSrec([{ address: 0x1000, data }]);
    const r = parseSrec(srec);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const bin = segmentsToBin(r.image.segments);
    expect(bin.base).toBe(0x1000);
    expect(Array.from(bin.data)).toEqual(Array.from(data));
  });

  it("uses S3/S7 records for 32-bit addresses", () => {
    const srec = toSrec([{ address: 0x0800_0000, data: new Uint8Array([1, 2, 3]) }]);
    expect(srec).toContain("S3");
    expect(srec).toContain("S7");
    const r = parseSrec(srec);
    expect(r.ok && r.image.segments[0]!.address).toBe(0x0800_0000);
  });

  it("rejects checksum corruption", () => {
    const srec = toSrec([{ address: 0, data: new Uint8Array([0xaa]) }]);
    const lines = srec.trim().split("\n");
    const tampered = lines
      .map((l, i) => (i === 1 ? l.slice(0, -2) + "00" : l))
      .join("\n");
    expect(parseSrec(tampered).ok).toBe(false);
  });
});

describe("segments → bin", () => {
  it("fills gaps with 0xFF", () => {
    const bin = segmentsToBin([
      { address: 0, data: new Uint8Array([1, 2]) },
      { address: 4, data: new Uint8Array([9]) },
    ]);
    expect(Array.from(bin.data)).toEqual([1, 2, 0xff, 0xff, 9]);
  });
});

describe("csv numeric parsing", () => {
  it("detects headers and delimiter", () => {
    const r = parseCsvNumeric("time;ch1\n0;1.5\n1;2.5\n");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.csv.headers).toEqual(["time", "ch1"]);
    expect(r.csv.delimiter).toBe(";");
    expect(r.csv.columns[1]).toEqual([1.5, 2.5]);
  });

  it("headerless numeric CSV gets generated column names", () => {
    const r = parseCsvNumeric("1,2\n3,4\n");
    expect(r.ok && r.csv.headers[0]).toBe("col 1");
    expect(r.ok && r.csv.rowCount).toBe(2);
  });

  it("rejects non-numeric input", () => {
    expect(parseCsvNumeric("a,b\nx,y\n").ok).toBe(false);
  });
});

describe("hex dump", () => {
  it("formats offset, hex and ascii columns", () => {
    const lines = hexDumpLines(new Uint8Array([0x48, 0x69, 0x00, 0xff]), 0x100);
    expect(lines[0]).toMatch(/^00000100 {2}48 69 00 FF/);
    expect(lines[0]).toContain("|Hi..|");
  });
});

describe("can frame analysis", () => {
  it("standard frame breakdown", () => {
    const a = analyzeCanFrame(0x123, false, false, new Uint8Array([0xde, 0xad]));
    expect(a.idHex).toBe("0x123");
    expect(a.idBinary).toBe("00100100011");
    expect(a.dlc).toBe(2);
    expect(a.errors).toHaveLength(0);
  });

  it("flags out-of-range id and oversized data", () => {
    expect(analyzeCanFrame(0x800, false, false, new Uint8Array(0)).errors.length).toBeGreaterThan(0);
    expect(analyzeCanFrame(1, false, false, new Uint8Array(9)).errors.length).toBeGreaterThan(0);
    expect(analyzeCanFrame(0x800, true, false, new Uint8Array(0)).errors).toHaveLength(0);
  });
});
