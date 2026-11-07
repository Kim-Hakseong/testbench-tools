import { describe, expect, it } from "vitest";
import {
  NMEA_FIELD_LABELS, WORD_ORDERS, analyzeCanFrame, asciiToBytes, buildNmea, bytesToAscii, bytesToHex, checksumByteCount,
  checksumHex, decodeFrame, decodeModbus, decodeQ, encodeQ, float32ToRegisters, formatInBase, fromSigned, nmeaDate,
  nmeaLatitude, nmeaLongitude, nmeaTime, parseHex, parseInBase, parseMcFrame, parseNmea, qInfo, registersToFloat32,
  reverseBytes, sniff, swapBytesInWords, swapWords, toSigned,
  type FrameLayout, type McMode, type ModbusProtocol, type NumberBase, type WordOrder,
} from "@testbench/engine";
import { callTool } from "../registry";
import { hx, parity } from "../testing/parity";

const bytesOf = (text: string) => {
  const r = parseHex(text);
  if (!r.ok) throw new Error("bad hex in test");
  return r.bytes;
};

// ModbusDecoderTool.tsx: decodeModbus(bytes, choice) → status banner + field table (bytes, value, meaning).
function modbus(text: string, choice: "auto" | ModbusProtocol = "auto") {
  const bytes = bytesOf(text);
  const result = decodeModbus(bytes, choice === "auto" ? undefined : choice);
  const sniffed = choice === "auto" ? sniff(bytes) : null;
  return {
    protocol: result.protocol,
    detectedProtocol: sniffed,
    ok: result.ok,
    status: result.error ? "error" : result.exception ? "exception" : result.crc ? (result.crc.ok ? "crcValid" : "crcFail") : "mbapConsistent",
    error: result.error ?? null,
    exception: result.exception ?? null,
    crc: result.crc ? { ok: result.crc.ok, received: hx(result.crc.received, 4), computed: hx(result.crc.computed, 4) } : null,
    fields: result.fields.map((f) => ({ name: f.name, bytes: bytesToHex(bytes.slice(f.start, f.start + f.length)), value: f.value, meaning: f.note ?? "" })),
  };
}

// NmeaDecoderTool.tsx: parseNmea → talker · type badge, checksum badge, labelled field table.
function nmeaDec(text: string) {
  const r = parseNmea(text.trim());
  if (!r.ok) throw new Error(r.error);
  const s = r.sentence;
  const labels = NMEA_FIELD_LABELS[s.type];
  return {
    talker: s.talker, type: s.type, address: s.address, knownType: labels !== undefined,
    checksum: {
      present: s.received !== null, valid: s.valid,
      received: s.received === null ? null : `0x${checksumHex(s.received)}`, computed: `0x${checksumHex(s.computed)}`,
    },
    fields: s.fields.map((f, i) => ({ index: i + 1, label: labels?.[i] ?? `Field ${i + 1}`, value: f })),
  };
}

// NmeaGeneratorTool.tsx: the page's text fields, its body templates, then the round-trip card.
function nmeaGen(o: {
  kind?: "GGA" | "RMC" | "custom"; talker?: string; latText?: string; lonText?: string; timeText?: string; dateText?: string;
  quality?: number; satsText?: string; hdopText?: string; altText?: string; speedText?: string; courseText?: string; customBody?: string;
}) {
  const p = {
    kind: "GGA", talker: "GP", latText: "37.5665", lonText: "126.9780", timeText: "02:30:00", dateText: "2026-08-20", quality: 1,
    satsText: "8", hdopText: "0.9", altText: "38.0", speedText: "0.0", courseText: "0.0", customBody: "PTBT,1,hello", ...o,
  };
  const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s.trim())) ? null : Number(s.trim()));
  let sentence: string;
  let conversions: string[] = [];
  if (p.kind === "custom") {
    sentence = buildNmea(p.customBody.replace(/^\$/, "").trim());
  } else {
    const lat = num(p.latText)!, lon = num(p.lonText)!;
    const encLat = nmeaLatitude(lat), encLon = nmeaLongitude(lon);
    if (!encLat.ok || !encLon.ok) throw new Error("bad coordinate in test");
    const tm = /^(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(p.timeText.trim())!;
    const time = nmeaTime(Number(tm[1]), Number(tm[2]), Number(tm[3]))!;
    conversions = [`${lat}° → ${encLat.value.field},${encLat.value.hemisphere}`, `${lon}° → ${encLon.value.field},${encLon.value.hemisphere}`];
    if (p.kind === "GGA") {
      const sats = num(p.satsText)!, hdop = num(p.hdopText), alt = num(p.altText);
      sentence = buildNmea(`${p.talker}GGA,${time},${encLat.value.field},${encLat.value.hemisphere},` +
        `${encLon.value.field},${encLon.value.hemisphere},${p.quality},${String(sats).padStart(2, "0")},${hdop ?? ""},${alt ?? ""},M,,M,,`);
    } else {
      const dm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(p.dateText.trim())!;
      const date = nmeaDate(Number(dm[3]), Number(dm[2]), Number(dm[1]))!;
      const speed = num(p.speedText) ?? 0, course = num(p.courseText) ?? 0;
      sentence = buildNmea(`${p.talker}RMC,${time},A,${encLat.value.field},${encLat.value.hemisphere},` +
        `${encLon.value.field},${encLon.value.hemisphere},${speed.toFixed(1)},${course.toFixed(1)},${date},,,A`);
    }
  }
  const back = parseNmea(sentence);
  return {
    sentence, conversions,
    decodesBackAs: back.ok ? { address: back.sentence.address, fieldCount: back.sentence.fields.length, checksumOk: back.sentence.valid === true } : null,
  };
}

// CanFrameTool.tsx: hex id, RTR drops the data box, analyzeCanFrame → result cards.
function can(idText: string, dataText: string, extended = false, rtr = false) {
  const idClean = idText.trim().replace(/^0x/i, "");
  const a = analyzeCanFrame(parseInt(idClean, 16), extended, rtr, bytesOf(rtr ? "" : dataText));
  return {
    id: a.id, idHex: a.idHex, idBinary: a.idBinary, idFormat: a.extended ? "29-bit extended" : "11-bit standard",
    extended: a.extended, rtr: a.rtr, frameType: a.rtr ? "remote" : "data", dlc: a.dlc, data: bytesToHex(a.data),
  };
}

// McProtocolTool.tsx: parseMcFrame(text, mode) → the request or response cards.
function mc(text: string, mode: McMode = "ascii") {
  const parsed = parseMcFrame(text, mode);
  if (!parsed.ok) throw new Error(parsed.error);
  const f = parsed.frame;
  const base = {
    kind: f.kind, mode: f.mode, subheader: hx(f.subheader, 4),
    accessRoute: { networkNo: hx(f.networkNo, 2), pcNo: hx(f.pcNo, 2), ioNo: hx(f.ioNo, 4), stationNo: hx(f.stationNo, 2) },
    dataLength: f.dataLength, actualDataLength: f.actualDataLength, dataLengthOk: f.dataLengthOk, note: f.note ?? null,
  };
  if (f.kind === "request") {
    return {
      ...base,
      command: hx(f.command, 4), commandName: f.commandName, subcommand: hx(f.subcommand, 4), subcommandName: f.subcommandName,
      series: f.series, unit: f.unit,
      device: f.device ? { text: f.device.text, symbol: f.device.device.symbol, name: f.device.device.name, number: f.device.number } : null,
      points: f.points, monitoringTimer: f.monitoringTimer, monitoringTimerLabel: f.monitoringTimerLabel,
      writeData: f.writeData && f.writeData.length > 0 ? f.writeData.map((v) => (f.unit === "bit" ? v : hx(v, 4))) : null,
      requestData: f.dataText,
    };
  }
  const e = f.errorInformation;
  return {
    ...base, endCode: hx(f.endCode, 4), success: f.success,
    errorInformation: e ? { networkNo: hx(e.networkNo, 2), pcNo: hx(e.pcNo, 2), ioNo: hx(e.ioNo, 4), stationNo: hx(e.stationNo, 2), command: hx(e.command, 4), subcommand: hx(e.subcommand, 4) } : null,
    responseData: f.dataText,
  };
}

// FrameWorkbenchTool.tsx: one decodeFrame per non-blank line, OK/FAIL summary, checksum as hexN(width).
function frames(layout: FrameLayout, lines: string[]) {
  const n = checksumByteCount(layout.checksum.preset);
  let ok = 0, fail = 0;
  const out = lines.map((text, i) => {
    const parsed = parseHex(text.trim());
    if (!parsed.ok) return { frame: i + 1, ok: false, error: `Invalid character “${parsed.error.char}” at position ${parsed.error.index}` };
    const d = decodeFrame(layout, parsed.bytes);
    if (d.checksum.status === "ok") ok++;
    if (d.checksum.status === "fail") fail++;
    return {
      frame: i + 1, ok: true, bytes: bytesToHex(parsed.bytes), length: d.length,
      checksum: {
        status: d.checksum.status,
        expected: d.checksum.expected === undefined ? null : hx(d.checksum.expected, n * 2),
        actual: d.checksum.actual === undefined ? null : hx(d.checksum.actual, n * 2),
        at: d.checksum.at ?? null, coverage: d.checksum.coverage ?? null, error: d.checksum.error ?? null,
      },
      fields: d.fields.map((f) => ({ name: f.name, available: f.available, value: f.value, display: f.display, range: f.range, raw: bytesToHex(f.raw) })),
    };
  });
  return { summary: layout.checksum.preset === "None" ? { frames: out.length, ok: null, fail: null } : { frames: out.length, ok, fail }, frames: out };
}

// FloatConverterTool.tsx
const NOTES: Record<WordOrder, string> = { ABCD: "big-endian (high word first)", CDAB: "word-swapped", BADC: "byte-swapped within words", DCBA: "little-endian" };
function toRegs(text: string) {
  const v = Number(text.trim());
  const stored = registersToFloat32(float32ToRegisters(v, "ABCD"), "ABCD");
  return {
    direction: "toRegisters", value: v, storedFloat32: stored, nearestRepresentable: stored !== v,
    orders: WORD_ORDERS.map((order) => {
      const [r0, r1] = float32ToRegisters(v, order);
      return { order, note: NOTES[order], registers: [hx(r0, 4), hx(r1, 4)] };
    }),
  };
}
function toFloat(text: string) {
  const regs = text.trim().split(/[\s,;]+/).filter(Boolean).map((t) => parseInt(t.replace(/^0x/i, ""), 16)) as [number, number];
  return {
    direction: "toFloat", registers: [hx(regs[0], 4), hx(regs[1], 4)],
    orders: WORD_ORDERS.map((order) => {
      const f = registersToFloat32(regs, order);
      return { order, note: NOTES[order], value: Number.isFinite(f) ? f : null, display: String(f) };
    }),
  };
}

// NumberBaseTool.tsx: parse in the edited base, every field formatInBase(...).toUpperCase().
function bases(text: string, base: NumberBase) {
  const r = parseInBase(text, base);
  if (!r.ok) throw new Error("bad digit in test");
  return {
    binary: formatInBase(r.value, 2).toUpperCase(), octal: formatInBase(r.value, 8).toUpperCase(),
    decimal: formatInBase(r.value, 10).toUpperCase(), hexadecimal: formatInBase(r.value, 16).toUpperCase(),
  };
}

// TwosComplementTool.tsx: decimal → hex box via fromSigned; the cards read raw back out of the hex box.
function twos(text: string, from: "dec" | "hex", w: 8 | 16 | 32) {
  const hexText = from === "dec" ? fromSigned(parseInt(text.trim(), 10), w).toString(16).toUpperCase().padStart(w / 4, "0") : text.trim();
  const raw = parseInt(hexText.replace(/^0x/i, ""), 16);
  return { width: w, signed: toSigned(raw, w), unsigned: raw, hex: "0x" + raw.toString(16).toUpperCase().padStart(w / 4, "0"), binary: raw.toString(2).padStart(w, "0") };
}

// EndiannessTool.tsx
function endian(text: string) {
  const b = bytesOf(text);
  return {
    byteCount: b.length, bits: b.length * 8, byteReversed: bytesToHex(reverseBytes(b)),
    byteSwapWords: b.length >= 2 && b.length % 2 === 0 ? bytesToHex(swapBytesInWords(b)) : null,
    wordSwap: b.length >= 4 && b.length % 4 === 0 ? bytesToHex(swapWords(b)) : null,
    original: bytesToHex(b),
  };
}

// QFormatTool.tsx
function qFmt(m: number, n: number) {
  const i = qInfo(m, n);
  return { notation: `Q${m}.${n}`, bits: i.bits, min: i.min, max: i.max, resolution: i.resolution };
}
function qRaw(valText: string, m = 0, n = 15) {
  const v = Number(valText.trim());
  const enc = encodeQ(v, m, n);
  return {
    format: qFmt(m, n), raw: "0x" + enc.raw.toString(16).toUpperCase().padStart(Math.ceil(qInfo(m, n).bits / 4), "0"),
    stepCount: enc.stepCount, stored: enc.stored, quantizationError: enc.stored - v, clamped: enc.clamped,
  };
}
function qVal(rawText: string, m = 0, n = 15) {
  return { format: qFmt(m, n), value: decodeQ(parseInt(rawText.trim().replace(/^0x/i, ""), 16), m, n) };
}

const DEMO: FrameLayout = {
  checksum: { preset: "CRC16_MODBUS", offsetFromEnd: 2, byteOrder: "LE", coverageStart: 0, coverageEndOffsetFromEnd: 2 },
  fields: [
    { name: "seq", offset: 2, type: "u8", endian: "LE" },
    { name: "temp", offset: 3, type: "s16", endian: "BE" },
    { name: "status", offset: 5, type: "u8", endian: "LE" },
  ],
};
const FLOAT_REPLY: FrameLayout = {
  checksum: { preset: "CRC16_MODBUS", offsetFromEnd: 2, byteOrder: "LE", coverageStart: 0, coverageEndOffsetFromEnd: 2 },
  fields: [
    { name: "slave", offset: 0, type: "u8", endian: "LE" },
    { name: "function", offset: 1, type: "u8", endian: "LE" },
    { name: "byteCount", offset: 2, type: "u8", endian: "LE" },
    { name: "value", offset: 3, type: "f32", endian: "BE" },
  ],
};

describe("protocol-decoders parity", () => {
  parity("modbus.decode_frame", [
    { input: { data: "11 03 00 6B 00 03 76 87" }, expected: modbus("11 03 00 6B 00 03 76 87") },
    { input: { data: "11 03 06 AE 41 56 52 43 40 49 AD" }, expected: modbus("11 03 06 AE 41 56 52 43 40 49 AD") },
    { input: { data: "00 01 00 00 00 06 11 03 00 6B 00 03" }, expected: modbus("00 01 00 00 00 06 11 03 00 6B 00 03") },
    { input: { data: "11 83 02 C1 34", protocol: "rtu" }, expected: modbus("11 83 02 C1 34", "rtu") },
    { input: { data: "11 03 00 6B 00 03 00 00" }, expected: modbus("11 03 00 6B 00 03 00 00") },
    { input: { data: "00 01 00 00 00 09 11 03 00 6B 00 03", protocol: "tcp" }, expected: modbus("00 01 00 00 00 09 11 03 00 6B 00 03", "tcp") },
    { input: { data: "01 0F 00 13 00 0A 02 CD 01 72 CB" }, expected: modbus("01 0F 00 13 00 0A 02 CD 01 72 CB") },
  ]);

  parity("nmea.decode", [
    "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47",
    "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A",
    "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*48",
    "$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K",
    "  $PTBT,1,hello*41  ",
    "!AIVDM,1,1,,A,13aEOK?P00PD2wVMdLDRhgvL289?,0*26",
  ].map((s) => ({ input: { sentence: s }, expected: nmeaDec(s) })));

  parity("nmea.generate", [
    { input: {}, expected: nmeaGen({}) },
    { input: { kind: "RMC", talker: "GN", latitude: -33.8568, longitude: 151.2153, time: "23:59:59.5", date: "2026-01-02", speed: 12.34, course: 270 },
      expected: nmeaGen({ kind: "RMC", talker: "GN", latText: "-33.8568", lonText: "151.2153", timeText: "23:59:59.5", dateText: "2026-01-02", speedText: "12.34", courseText: "270" }) },
    { input: { latitude: 48.1173, longitude: -11.5167, time: "12:35:19", quality: 4, satellites: 12, hdop: 0.6, altitude: 545.4 },
      expected: nmeaGen({ latText: "48.1173", lonText: "-11.5167", timeText: "12:35:19", quality: 4, satsText: "12", hdopText: "0.6", altText: "545.4" }) },
    { input: { kind: "custom", body: "$GPGLL,4916.45,N,12311.12,W,225444,A" }, expected: nmeaGen({ kind: "custom", customBody: "$GPGLL,4916.45,N,12311.12,W,225444,A" }) },
    { input: { kind: "RMC", latitude: 36.9999999, longitude: -179.99999999, time: "0:0:0", date: "2000-1-1" },
      expected: nmeaGen({ kind: "RMC", latText: "36.9999999", lonText: "-179.99999999", timeText: "0:0:0", dateText: "2000-1-1" }) },
    { input: { kind: "GGA", talker: "BD", quality: 0, satellites: 0 }, expected: nmeaGen({ talker: "BD", quality: 0, satsText: "0" }) },
  ]);

  parity("can.decode_frame", [
    { input: { id: "123", data: "DE AD BE EF" }, expected: can("123", "DE AD BE EF") },
    { input: { id: "0x7FF" }, expected: can("0x7FF", "") },
    { input: { id: "18FEF100", extended: true, data: "FF FF FF FF 12 34 56 78" }, expected: can("18FEF100", "FF FF FF FF 12 34 56 78", true) },
    { input: { id: "1A0", rtr: true, data: "11 22" }, expected: can("1A0", "11 22", false, true) },
    { input: { id: "1FFFFFFF", extended: true, data: "0" }, expected: can("1FFFFFFF", "0", true) },
  ]);

  parity("mc.decode_frame", [
    { input: { frame: "500000FF03FF000018000A04010000D*0000000005" }, expected: mc("500000FF03FF000018000A04010000D*0000000005") },
    { input: { frame: "50 00 00 FF FF 03 00 18 00 0A 00 01 04 00 00 00 00 00 A8 05 00", mode: "binary" },
      expected: mc("50 00 00 FF FF 03 00 18 00 0A 00 01 04 00 00 00 00 00 A8 05 00", "binary") },
    { input: { frame: "D00000FF03FF00000C00001234ABCD" }, expected: mc("D00000FF03FF00000C00001234ABCD") },
    { input: { frame: "D0 00 00 FF FF 03 00 04 00 00 00 34 12", mode: "binary" }, expected: mc("D0 00 00 FF FF 03 00 04 00 00 00 34 12", "binary") },
    { input: { frame: "500000FF03FF000020000A14010000D*00010000021234ABCD" }, expected: mc("500000FF03FF000020000A14010000D*00010000021234ABCD") },
    { input: { frame: "D00000FF03FF000016C05100FF03FF0004010000" }, expected: mc("D00000FF03FF000016C05100FF03FF0004010000") },
    { input: { frame: "500000ff03ff00001c000a14010001M*0000100004 1011" }, expected: mc("500000ff03ff00001c000a14010001M*0000100004 1011") },
  ]);

  parity("frame.decode", [
    { input: { checksum: DEMO.checksum, fields: DEMO.fields, frames: ["A5 06 07 00 E1 01 18 0A", "A5 06 08 00 EB 00 DC 7E", "A5 06 09 00 F5 00 2B DD"] },
      expected: frames(DEMO, ["A5 06 07 00 E1 01 18 0A", "A5 06 08 00 EB 00 DC 7E", "A5 06 09 00 F5 00 2B DD"]) },
    // Offsets and endians left out take the page's defaults: checksum at the end, LE.
    { input: { checksum: { preset: "CRC16_MODBUS" }, fields: FLOAT_REPLY.fields.map((f) => (f.type === "u8" ? { name: f.name, offset: f.offset, type: f.type } : f)),
      frames: ["01 03 04 41 20 00 00 EF C5", "01 03 04 BF C0 00 00 DF DB", "11 03 04 41 BE 00 00 9E EA"] },
      expected: frames(FLOAT_REPLY, ["01 03 04 41 20 00 00 EF C5", "01 03 04 BF C0 00 00 DF DB", "11 03 04 41 BE 00 00 9E EA"]) },
    { input: { checksum: { preset: "None" }, fields: [{ name: "w", offset: 0, type: "u32", endian: "BE" }, { name: "past", offset: 8, type: "u8" }], frames: ["DE AD BE EF", "00 00 00 01"] },
      expected: frames({ checksum: { preset: "None", offsetFromEnd: 0, byteOrder: "LE", coverageStart: 0, coverageEndOffsetFromEnd: 0 },
        fields: [{ name: "w", offset: 0, type: "u32", endian: "BE" }, { name: "past", offset: 8, type: "u8", endian: "LE" }] }, ["DE AD BE EF", "00 00 00 01"]) },
    { input: { checksum: { preset: "XOR8", offsetFromEnd: 1, coverageStart: 1, coverageEndOffsetFromEnd: 1 }, fields: [{ name: "cmd", offset: 1, type: "s8" }], frames: ["02 41 42 03", "02 FF 00 FF", "02 GG"] },
      expected: frames({ checksum: { preset: "XOR8", offsetFromEnd: 1, byteOrder: "LE", coverageStart: 1, coverageEndOffsetFromEnd: 1 },
        fields: [{ name: "cmd", offset: 1, type: "s8", endian: "LE" }] }, ["02 41 42 03", "02 FF 00 FF", "02 GG"]) },
    { input: { checksum: { preset: "CRC32", byteOrder: "BE" }, fields: [{ name: "a", offset: 0, type: "u16", endian: "LE" }], frames: ["31 32 33 34 35 36 37 38 39 CB F4 39 26", "01"] },
      expected: frames({ checksum: { preset: "CRC32", offsetFromEnd: 4, byteOrder: "BE", coverageStart: 0, coverageEndOffsetFromEnd: 4 },
        fields: [{ name: "a", offset: 0, type: "u16", endian: "LE" }] }, ["31 32 33 34 35 36 37 38 39 CB F4 39 26", "01"]) },
    { input: { checksum: { preset: "SUM8" }, fields: [{ name: "f", offset: 0, type: "f32", endian: "LE" }, { name: "s", offset: 0, type: "s32", endian: "BE" }], frames: ["00 00 80 7F FF", "01 00 00 00 01"] },
      expected: frames({ checksum: { preset: "SUM8", offsetFromEnd: 1, byteOrder: "LE", coverageStart: 0, coverageEndOffsetFromEnd: 1 },
        fields: [{ name: "f", offset: 0, type: "f32", endian: "LE" }, { name: "s", offset: 0, type: "s32", endian: "BE" }] }, ["00 00 80 7F FF", "01 00 00 00 01"]) },
  ]);

  it("frame.decode rejects a layout the page flags as invalid", () => {
    expect(callTool("frame.decode", { checksum: { preset: "None" }, fields: [{ name: " ", offset: 0, type: "u8" }], frames: ["00"] }).ok).toBe(false);
  });
});

describe("data-converters parity", () => {
  parity("convert.float32", [
    { input: { value: 3.1415927 }, expected: toRegs("3.1415927") },
    { input: { value: -0.1 }, expected: toRegs("-0.1") },
    { input: { value: 1e20 }, expected: toRegs("1e20") },
    { input: { direction: "toRegisters", value: 0 }, expected: toRegs("0") },
    { input: { direction: "toFloat", registers: "4049 0FDB" }, expected: toFloat("4049 0FDB") },
    { input: { direction: "toFloat", registers: "0x0000,0x41C8" }, expected: toFloat("0x0000,0x41C8") },
    { input: { direction: "toFloat", registers: "7FC0 0000" }, expected: toFloat("7FC0 0000") },
  ]);

  // HexAsciiTool.tsx, direction="hexToAscii"
  parity("convert.hex_to_ascii", ["48 69", "48 69 0D 0A", "0x54,0x65,0x73,0x74", "3132333435363738 39", "", "7F 80 FF 20"].map((d) => ({
    input: { data: d }, expected: { text: bytesToAscii(bytesOf(d)), byteCount: bytesOf(d).length },
  })));
  // HexAsciiTool.tsx, direction="asciiToHex"
  parity("convert.ascii_to_hex", ["Hi", "123456789", "AT+GMR\r\n", "", "$GPGGA", "é€"].map((t) => ({
    input: { text: t }, expected: { hex: bytesToHex(asciiToBytes(t)), byteCount: asciiToBytes(t).length },
  })));

  parity("convert.number_base", [
    { input: { value: "255" }, expected: bases("255", 10) },
    { input: { value: "0xDEADBEEF", base: 16 }, expected: bases("0xDEADBEEF", 16) },
    { input: { value: "1010_1010", base: 2 }, expected: bases("1010_1010", 2) },
    { input: { value: "-777", base: 8 }, expected: bases("-777", 8) },
    { input: { value: "18446744073709551615" }, expected: bases("18446744073709551615", 10) },
    { input: { value: " +0b11 ", base: 2 }, expected: bases(" +0b11 ", 2) },
  ]);

  parity("convert.twos_complement", [
    { input: { value: "-10" }, expected: twos("-10", "dec", 16) },
    { input: { value: "FFF6", from: "hex" }, expected: twos("FFF6", "hex", 16) },
    { input: { value: "-128", width: 8 }, expected: twos("-128", "dec", 8) },
    { input: { value: "0x7F", from: "hex", width: 8 }, expected: twos("0x7F", "hex", 8) },
    { input: { value: "2147483647", width: 32 }, expected: twos("2147483647", "dec", 32) },
    { input: { value: "-1", width: 32 }, expected: twos("-1", "dec", 32) },
    { input: { value: "80000000", from: "hex", width: 32 }, expected: twos("80000000", "hex", 32) },
  ]);

  parity("convert.endianness", ["12 34 56 78", "AB CD", "01 02 03", "0x11223344 55667788", "FF", "01 02 03 04 05 06"].map((d) => ({
    input: { data: d }, expected: endian(d),
  })));

  parity("convert.q_format", [
    { input: { value: 0.5 }, expected: qRaw("0.5") },
    { input: { value: 1.5 }, expected: qRaw("1.5") },
    { input: { m: 7, n: 8, value: -3.14159 }, expected: qRaw("-3.14159", 7, 8) },
    { input: { m: 0, n: 31, value: -1 }, expected: qRaw("-1", 0, 31) },
    { input: { direction: "toValue", raw: "4000" }, expected: qVal("4000") },
    { input: { m: 15, n: 16, direction: "toValue", raw: "0xFFFF8000" }, expected: qVal("0xFFFF8000", 15, 16) },
    { input: { m: 0, n: 7, direction: "toValue", raw: "80" }, expected: qVal("80", 0, 7) },
  ]);

  it("rejects schema-valid input the pages reject", () => {
    for (const [name, args] of [
      ["modbus.decode_frame", { data: "" }],
      ["nmea.decode", { sentence: "GPGGA" }],
      ["can.decode_frame", { id: "800" }],
      ["can.decode_frame", { id: "1", data: "00 01 02 03 04 05 06 07 08" }],
      ["mc.decode_frame", { frame: "1234" }],
      ["convert.float32", { direction: "toFloat", registers: "4049" }],
      ["convert.hex_to_ascii", { data: "4G" }],
      ["convert.number_base", { value: "12", base: 2 }],
      ["convert.twos_complement", { value: "128", width: 8 }],
      ["convert.twos_complement", { value: "123", from: "hex", width: 8 }],
      ["convert.q_format", { m: 20, n: 20, value: 1 }],
      ["convert.q_format", { direction: "toValue", raw: "12345" }],
      ["nmea.generate", { time: "25:00:00" }],
    ] as const) {
      expect(callTool(name, args).ok, `${name} ${JSON.stringify(args)}`).toBe(false);
    }
  });
});
