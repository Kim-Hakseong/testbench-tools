import { describe } from "vitest";
import {
  asciiToBytes, buildNmea, bytesToHex, checksumHex, crc, crcBytes, getPreset, identifyFromCatalog, parseHex, parseNmea,
  type CrcParams,
} from "@testbench/engine";
import { hx, parity, type ParityCase } from "../testing/parity";

// CrcTool.tsx: bytes from the hex/ascii box → crc(bytes, getPreset(name)) → value, LE/BE byte cards.
function crcCard(name: string, p: CrcParams, text: string, ascii = false) {
  const r = ascii ? { ok: true as const, bytes: asciiToBytes(text) } : parseHex(text);
  if (!r.ok) throw new Error("bad hex");
  const v = crc(r.bytes, p);
  return {
    algorithm: name, byteCount: r.bytes.length, crc: hx(v, Math.ceil(p.width / 4)), decimal: v,
    bytesLittleEndian: bytesToHex(crcBytes(v, p.width).le), bytesBigEndian: bytesToHex(crcBytes(v, p.width).be),
  };
}
const preset = (name: string, text: string, ascii = false) => crcCard(name, getPreset(name), text, ascii);

describe("checksum-crc parity", () => {
  parity("crc.modbus16", [
    { input: { data: "01 03 00 00 00 0A" }, expected: preset("CRC-16/MODBUS", "01 03 00 00 00 0A") },
    { input: { data: "123456789", encoding: "ascii" }, expected: preset("CRC-16/MODBUS", "123456789", true) },
    { input: { data: "11 03 00 6B 00 03" }, expected: preset("CRC-16/MODBUS", "11 03 00 6B 00 03") },
    { input: { data: "0x01,0x06,0x00,0x01,0x00,0x03" }, expected: preset("CRC-16/MODBUS", "0x01,0x06,0x00,0x01,0x00,0x03") },
    { input: { data: "" }, expected: preset("CRC-16/MODBUS", "") },
  ]);
  parity("crc.ccitt16", ["CRC-16/CCITT-FALSE", "CRC-16/XMODEM", "CRC-16/KERMIT", "CRC-16/IBM-SDLC"].map((v): ParityCase => (
    { input: { data: "123456789", encoding: "ascii", variant: v }, expected: preset(v, "123456789", true) }
  )).concat([{ input: { data: "7E 10 34 12 FE" }, expected: preset("CRC-16/CCITT-FALSE", "7E 10 34 12 FE") }]));
  parity("crc.crc32", ["", "00", "FF FF FF FF", "DE AD BE EF"].map((d): ParityCase => ({ input: { data: d }, expected: preset("CRC-32", d) }))
    .concat([{ input: { data: "123456789", encoding: "ascii" }, expected: preset("CRC-32", "123456789", true) }]));
  parity("crc.crc8", [
    { input: { data: "123456789", encoding: "ascii" }, expected: preset("CRC-8", "123456789", true) },
    { input: { data: "123456789", encoding: "ascii", variant: "CRC-8/MAXIM" }, expected: preset("CRC-8/MAXIM", "123456789", true) },
    { input: { data: "80 00 80" }, expected: preset("CRC-8", "80 00 80") },
    { input: { data: "02 1C B8 01 00 00 00", variant: "CRC-8/MAXIM" }, expected: preset("CRC-8/MAXIM", "02 1C B8 01 00 00 00") },
    { input: { data: "FF" }, expected: preset("CRC-8", "FF") },
  ]);
  // CustomCrcTool.tsx: free parameters; the page names a matching preset when one exists.
  const custom = (p: CrcParams, text: string, ascii: boolean, match: string | null) =>
    ({ ...crcCard(match ?? "custom", p, text, ascii), matchesPreset: match });
  parity("crc.custom", [
    { input: { data: "123456789", encoding: "ascii", width: 16, poly: "0x1021", init: "0xFFFF" },
      expected: custom({ width: 16, poly: 0x1021, init: 0xffff, refin: false, refout: false, xorout: 0 }, "123456789", true, "CRC-16/CCITT-FALSE") },
    { input: { data: "123456789", encoding: "ascii", width: 5, poly: "0x15" },
      expected: custom({ width: 5, poly: 0x15, init: 0, refin: false, refout: false, xorout: 0 }, "123456789", true, null) },
    { input: { data: "01 02 03", width: 12, poly: "0x80F" },
      expected: custom({ width: 12, poly: 0x80f, init: 0, refin: false, refout: false, xorout: 0 }, "01 02 03", false, null) },
    { input: { data: "123456789", encoding: "ascii", width: 32, poly: "04C11DB7", init: "FFFFFFFF", refin: true, refout: true, xorout: "FFFFFFFF" },
      expected: custom(getPreset("CRC-32"), "123456789", true, "CRC-32") },
    { input: { data: "AA 55", width: 8, poly: "0x31", refin: true, refout: true },
      expected: custom({ width: 8, poly: 0x31, init: 0, refin: true, refout: true, xorout: 0 }, "AA 55", false, "CRC-8/MAXIM") },
  ]);
  // CrcIdentifierTool.tsx: catalogue matches across every sample.
  const ident = (samples: [string, number][], ascii: boolean) => {
    const m = identifyFromCatalog(samples.map(([d, c]) => ({ data: ascii ? asciiToBytes(d) : (parseHex(d) as { bytes: Uint8Array }).bytes, checksum: c })));
    return {
      samples: samples.length,
      matches: m.map((p) => ({ name: p.name, width: p.width, poly: hx(p.poly, p.width / 4), init: hx(p.init, p.width / 4), refin: p.refin, refout: p.refout, xorout: hx(p.xorout, p.width / 4) })),
      ...(m.length ? {} : { note: "No catalogue CRC matches all samples; the site page can also run an exhaustive parameter search." }),
    };
  };
  parity("crc.identify", [
    { input: { samples: [{ data: "123456789", checksum: "0x29B1" }], encoding: "ascii" }, expected: ident([["123456789", 0x29b1]], true) },
    { input: { samples: [{ data: "123456789", checksum: "CBF43926" }], encoding: "ascii" }, expected: ident([["123456789", 0xcbf43926]], true) },
    { input: { samples: [{ data: "01 03 00 00 00 0A", checksum: "0xCDC5" }] }, expected: ident([["01 03 00 00 00 0A", 0xcdc5]], false) },
    { input: { samples: [{ data: "123456789", checksum: "0x31C3" }, { data: "A", checksum: "0x58E5" }], encoding: "ascii" }, expected: ident([["123456789", 0x31c3], ["A", 0x58e5]], true) },
    { input: { samples: [{ data: "01 02", checksum: "1234" }] }, expected: ident([["01 02", 1234]], false) },
  ]);
  // NmeaChecksumTool.tsx
  const nmea = (s: string) => {
    const p = parseNmea(s.startsWith("$") || s.startsWith("!") ? s : "$" + s);
    if (!p.ok) throw new Error(p.error);
    const x = p.sentence;
    return {
      status: x.valid === null ? "no checksum in input" : x.valid ? "VALID" : "FAIL",
      computed: "0x" + checksumHex(x.computed),
      received: x.received === null ? null : "0x" + checksumHex(x.received),
      completeSentence: buildNmea(x.address + (x.fields.length ? "," + x.fields.join(",") : "")),
      talker: x.talker, type: x.type,
    };
  };
  parity("nmea.checksum", [
    "$GPGGA,023000.00,3733.9900,N,12658.6800,E,1,08,0.9,38.0,M,,M,,*4B",
    "$GPGGA,023000.00,3733.9900,N,12658.6800,E,1,08,0.9,38.0,M,,M,,*6A",
    "GPRMC,023000.00,A,3733.9900,N,12658.6800,E,12.5,084.4,051026,,,A",
    "$PMTK220,1000*1F",
    "!AIVDM,1,1,,A,13aEOK?P00PD2wVMdLDRhgvL289?,0*26",
  ].map((s) => ({ input: { sentence: s }, expected: nmea(s) })));
});
