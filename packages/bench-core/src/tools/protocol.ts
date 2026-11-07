// Protocol decoders and data converters — the computations behind the
// protocol-decoders and data-converters pages, as bench-core tools.
//
// Each run() repeats the glue of its page component (apps/web/components/tool/)
// around the same engine call: the same input parsing, the same derived values
// the result cards and tables show, returned as plain JSON.

import {
  NMEA_FIELD_LABELS,
  WORD_ORDERS,
  analyzeCanFrame,
  asciiToBytes,
  buildNmea,
  bytesToAscii,
  bytesToHex,
  checksumByteCount,
  checksumHex,
  decodeFrame,
  decodeModbus,
  decodeQ,
  encodeQ,
  float32ToRegisters,
  formatInBase,
  fromSigned,
  nmeaDate,
  nmeaLatitude,
  nmeaLongitude,
  nmeaTime,
  parseHex,
  parseInBase,
  parseMcFrame,
  parseNmea,
  qInfo,
  registersToFloat32,
  reverseBytes,
  sniff,
  swapBytesInWords,
  swapWords,
  toSigned,
  validateLayout,
  type FrameChecksumPreset,
  type FrameEndian,
  type FrameFieldType,
  type FrameLayout,
  type McMode,
  type NumberBase,
  type WordOrder,
} from "@testbench/engine";
import { ToolInputError, hex, readData, str, type ToolDef } from "../define";

const hexDataProp = (description: string) => ({
  type: "string" as const,
  description,
  maxLength: 200000,
});

// ---------------------------------------------------------------------------
// Modbus RTU / TCP frame decoder (ModbusDecoderTool.tsx)
// ---------------------------------------------------------------------------

const modbusDecode: ToolDef = {
  name: "modbus.decode_frame",
  slug: "modbus-frame-decoder",
  category: "protocol-decoders",
  title: "Modbus RTU/TCP frame decoder",
  description:
    "Decode a Modbus RTU or Modbus TCP frame field by field, checking the RTU CRC-16 or the TCP MBAP header, with RTU/TCP auto-detection. Example: data \"11 03 00 6B 00 03 76 87\" → RTU, slave 17, Read Holding Registers from 0x006B, 3 registers, CRC valid.",
  inputSchema: {
    type: "object",
    properties: {
      data: hexDataProp("Frame bytes in hex, e.g. \"11 03 00 6B 00 03 76 87\" (RTU) or \"00 01 00 00 00 06 11 03 00 6B 00 03\" (TCP)."),
      protocol: {
        type: "string",
        enum: ["auto", "rtu", "tcp"],
        default: "auto",
        description: "Framing: auto-detect (a consistent MBAP header wins, then a valid RTU CRC), Modbus RTU or Modbus TCP.",
      },
    },
    required: ["data"],
    additionalProperties: false,
  },
  run: (input) => {
    const bytes = readData(input.data);
    if (bytes.length === 0) throw new ToolInputError("Enter at least one frame byte.");
    const choice = str(input, "protocol");
    const r = decodeModbus(bytes, choice === "auto" ? undefined : (choice as "rtu" | "tcp"));
    const status = r.error
      ? "error"
      : r.exception
        ? "exception"
        : r.crc
          ? (r.crc.ok ? "crcValid" : "crcFail")
          : "mbapConsistent";
    return {
      protocol: r.protocol,
      detectedProtocol: choice === "auto" ? sniff(bytes) : null,
      ok: r.ok,
      status,
      error: r.error ?? null,
      exception: r.exception ? { code: r.exception.code, name: r.exception.name } : null,
      crc: r.crc ? { ok: r.crc.ok, received: hex(r.crc.received, 4), computed: hex(r.crc.computed, 4) } : null,
      fields: r.fields.map((f) => ({
        name: f.name,
        bytes: bytesToHex(bytes.slice(f.start, f.start + f.length)),
        value: f.value,
        meaning: f.note ?? "",
      })),
    };
  },
  examples: [
    { data: "11 03 00 6B 00 03 76 87" },
    { data: "11 03 06 AE 41 56 52 43 40 49 AD" },
    { data: "00 01 00 00 00 06 11 03 00 6B 00 03" },
    { data: "11 83 02 C1 34", protocol: "rtu" },
    { data: "11 03 00 6B 00 03 00 00", protocol: "rtu" },
    { data: "01 06 00 01 00 03 98 0B" },
  ],
};

// ---------------------------------------------------------------------------
// NMEA 0183 decoder (NmeaDecoderTool.tsx)
// ---------------------------------------------------------------------------

const nmeaDecode: ToolDef = {
  name: "nmea.decode",
  slug: "nmea-0183-decoder",
  category: "protocol-decoders",
  title: "NMEA 0183 sentence decoder",
  description:
    "Split an NMEA 0183 sentence into talker, type and labelled fields and verify its XOR checksum. Example: \"$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\" → talker GP, type GGA, 14 fields, checksum 0x47 valid.",
  inputSchema: {
    type: "object",
    properties: {
      sentence: {
        type: "string",
        maxLength: 10000,
        description: "One NMEA 0183 sentence starting with '$' (or '!'), with or without the *HH checksum.",
      },
    },
    required: ["sentence"],
    additionalProperties: false,
  },
  run: (input) => {
    const s = str(input, "sentence").trim();
    if (s === "") throw new ToolInputError("Enter a sentence.");
    const r = parseNmea(s);
    if (!r.ok) throw new ToolInputError(r.error);
    const x = r.sentence;
    const labels = NMEA_FIELD_LABELS[x.type];
    return {
      talker: x.talker,
      type: x.type,
      address: x.address,
      knownType: labels !== undefined,
      checksum: {
        present: x.received !== null,
        valid: x.valid,
        received: x.received === null ? null : "0x" + checksumHex(x.received),
        computed: "0x" + checksumHex(x.computed),
      },
      fields: x.fields.map((f, i) => ({ index: i + 1, label: labels?.[i] ?? `Field ${i + 1}`, value: f })),
    };
  },
  examples: [
    { sentence: "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47" },
    { sentence: "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A" },
    { sentence: "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*48" },
    { sentence: "$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K" },
    { sentence: "$PTBT,1,hello*39" },
    { sentence: "!AIVDM,1,1,,A,13aEOK?P00PD2wVMdLDRhgvL289?,0*26" },
  ],
};

// ---------------------------------------------------------------------------
// NMEA 0183 generator (NmeaGeneratorTool.tsx)
// ---------------------------------------------------------------------------

const NMEA_TALKERS = ["GP", "GN", "GL", "GA", "BD"];

const nmeaGenerate: ToolDef = {
  name: "nmea.generate",
  slug: "nmea-0183-generator",
  category: "protocol-decoders",
  title: "NMEA 0183 sentence generator",
  description:
    "Build a valid NMEA 0183 GGA or RMC sentence from decimal-degree coordinates (or wrap a custom body), with the checksum computed. Example: GGA, talker GP, latitude 37.5665, longitude 126.978, time 02:30:00, fix 1, 8 satellites, HDOP 0.9, altitude 38 → \"$GPGGA,023000.00,3733.9900,N,12658.6800,E,1,08,0.9,38,M,,M,,*55\".",
  inputSchema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["GGA", "RMC", "custom"], default: "GGA", description: "Sentence to build: GGA fix data, RMC recommended minimum, or a custom body." },
      talker: { type: "string", enum: NMEA_TALKERS, default: "GP", description: "Talker id for GGA/RMC (GP GPS, GN multi-GNSS, GL GLONASS, GA Galileo, BD BeiDou)." },
      latitude: { type: "number", minimum: -90, maximum: 90, default: 37.5665, description: "Latitude in decimal degrees, negative for south (GGA/RMC)." },
      longitude: { type: "number", minimum: -180, maximum: 180, default: 126.978, description: "Longitude in decimal degrees, negative for west (GGA/RMC)." },
      time: { type: "string", default: "02:30:00", description: "UTC time as hh:mm:ss (seconds may have decimals) (GGA/RMC)." },
      date: { type: "string", default: "2026-08-20", description: "UTC date as YYYY-MM-DD (RMC only)." },
      quality: { type: "integer", enum: [0, 1, 2, 4, 5, 6], default: 1, description: "GGA fix quality: 0 invalid, 1 GPS, 2 DGPS, 4 RTK fixed, 5 RTK float, 6 dead reckoning." },
      satellites: { type: "integer", minimum: 0, maximum: 99, default: 8, description: "GGA satellites in use (0–99)." },
      hdop: { type: "number", default: 0.9, description: "GGA horizontal dilution of precision." },
      altitude: { type: "number", default: 38, description: "GGA antenna altitude above mean sea level, metres." },
      speed: { type: "number", default: 0, description: "RMC speed over ground, knots." },
      course: { type: "number", default: 0, description: "RMC course over ground, degrees true." },
      body: { type: "string", maxLength: 10000, default: "PTBT,1,hello", description: "Custom sentence body between '$' and '*' (kind \"custom\")." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const kind = str(input, "kind");
    let sentence: string;
    let conversions: string[] = [];
    if (kind === "custom") {
      const body = str(input, "body").replace(/^\$/, "").trim();
      if (body === "") throw new ToolInputError("Enter the sentence body without the leading $");
      sentence = buildNmea(body);
    } else {
      const talker = str(input, "talker");
      const lat = Number(input.latitude);
      const lon = Number(input.longitude);
      const encLat = nmeaLatitude(lat);
      const encLon = nmeaLongitude(lon);
      if (!encLat.ok) throw new ToolInputError(`Latitude: ${encLat.error}`);
      if (!encLon.ok) throw new ToolInputError(`Longitude: ${encLon.error}`);
      const tm = /^(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(str(input, "time").trim());
      const time = tm ? nmeaTime(Number(tm[1]), Number(tm[2]), Number(tm[3])) : null;
      if (time === null) throw new ToolInputError("Time must be hh:mm:ss UTC");
      conversions = [
        `${lat}° → ${encLat.value.field},${encLat.value.hemisphere}`,
        `${lon}° → ${encLon.value.field},${encLon.value.hemisphere}`,
      ];
      if (kind === "GGA") {
        const sats = Number(input.satellites);
        const body =
          `${talker}GGA,${time},${encLat.value.field},${encLat.value.hemisphere},` +
          `${encLon.value.field},${encLon.value.hemisphere},${Number(input.quality)},` +
          `${String(sats).padStart(2, "0")},${Number(input.hdop)},${Number(input.altitude)},M,,M,,`;
        sentence = buildNmea(body);
      } else {
        const dm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str(input, "date").trim());
        const date = dm ? nmeaDate(Number(dm[3]), Number(dm[2]), Number(dm[1])) : null;
        if (date === null) throw new ToolInputError("Date must be YYYY-MM-DD");
        const body =
          `${talker}RMC,${time},A,${encLat.value.field},${encLat.value.hemisphere},` +
          `${encLon.value.field},${encLon.value.hemisphere},` +
          `${Number(input.speed).toFixed(1)},${Number(input.course).toFixed(1)},${date},,,A`;
        sentence = buildNmea(body);
      }
    }
    const back = parseNmea(sentence);
    return {
      sentence,
      conversions,
      decodesBackAs: back.ok
        ? { address: back.sentence.address, fieldCount: back.sentence.fields.length, checksumOk: back.sentence.valid === true }
        : null,
    };
  },
  examples: [
    {},
    { kind: "RMC", talker: "GN", latitude: -33.8568, longitude: 151.2153, time: "23:59:59.5", date: "2026-01-02", speed: 12.34, course: 270 },
    { kind: "GGA", latitude: 48.1173, longitude: -11.5167, time: "12:35:19", quality: 4, satellites: 12, hdop: 0.6, altitude: 545.4 },
    { kind: "custom", body: "PTBT,1,hello" },
    { kind: "custom", body: "$GPGLL,4916.45,N,12311.12,W,225444,A" },
    { kind: "RMC", latitude: 0, longitude: 0, time: "00:00:00", date: "2000-01-01" },
  ],
};

// ---------------------------------------------------------------------------
// CAN 2.0 frame decoder (CanFrameTool.tsx)
// ---------------------------------------------------------------------------

const canDecode: ToolDef = {
  name: "can.decode_frame",
  slug: "can-frame-decoder",
  category: "protocol-decoders",
  title: "CAN frame decoder",
  description:
    "Check a CAN 2.0 frame's identifier range (11-bit standard or 29-bit extended), DLC and data, and show the identifier in hex, binary and decimal. Example: id \"123\", data \"DE AD BE EF\" → 0x123, binary 00100100011, decimal 291, DLC 4.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", pattern: "^\\s*(0[xX])?[0-9A-Fa-f]{1,8}\\s*$", description: "Identifier in hex, e.g. \"123\" or \"0x18FEF100\"." },
      extended: { type: "boolean", default: false, description: "29-bit extended identifier (CAN 2.0B) instead of 11-bit standard." },
      rtr: { type: "boolean", default: false, description: "Remote transmission request frame (carries no data; `data` is ignored)." },
      data: { type: "string", maxLength: 1000, default: "", description: "Data bytes in hex, 0–8 bytes, e.g. \"DE AD BE EF\"." },
    },
    required: ["id"],
    additionalProperties: false,
  },
  run: (input) => {
    const idClean = str(input, "id").trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,8}$/.test(idClean)) throw new ToolInputError("Identifier must be hex.");
    const rtr = Boolean(input.rtr);
    const parsed = parseHex(rtr ? "" : str(input, "data"));
    if (!parsed.ok) throw new ToolInputError(`Data: invalid character at position ${parsed.error.index}.`);
    const a = analyzeCanFrame(parseInt(idClean, 16), Boolean(input.extended), rtr, parsed.bytes);
    if (a.errors.length > 0) throw new ToolInputError(a.errors.join(" "));
    return {
      id: a.id,
      idHex: a.idHex,
      idBinary: a.idBinary,
      idFormat: a.extended ? "29-bit extended" : "11-bit standard",
      extended: a.extended,
      rtr: a.rtr,
      frameType: a.rtr ? "remote" : "data",
      dlc: a.dlc,
      data: bytesToHex(a.data),
    };
  },
  examples: [
    { id: "123", data: "DE AD BE EF" },
    { id: "0x7FF", data: "" },
    { id: "18FEF100", extended: true, data: "FF FF FF FF 12 34 56 78" },
    { id: "1A0", rtr: true },
    { id: "000", data: "01" },
  ],
};

// ---------------------------------------------------------------------------
// MELSEC MC protocol 3E frame decoder (McProtocolTool.tsx)
// ---------------------------------------------------------------------------

const mcDecode: ToolDef = {
  name: "mc.decode_frame",
  slug: "mc-protocol-decoder",
  category: "protocol-decoders",
  title: "MELSEC MC protocol (3E) frame decoder",
  description:
    "Decode a Mitsubishi MELSEC MC protocol 3E frame (request or response, ASCII or binary code): access route, command, device, points, end code and data length. Example: ASCII \"500000FF03FF000018000A04010000D*0000000005\" → batch read (0x0401) of D0, 5 word points, monitoring timer 2.5 s.",
  inputSchema: {
    type: "object",
    properties: {
      frame: { type: "string", maxLength: 100000, description: "The 3E frame: in ASCII mode the characters as sent; in binary mode hex bytes." },
      mode: { type: "string", enum: ["ascii", "binary"], default: "ascii", description: "MC protocol data code: ASCII code or binary code." },
    },
    required: ["frame"],
    additionalProperties: false,
  },
  run: (input) => {
    const parsed = parseMcFrame(str(input, "frame"), str(input, "mode") as McMode);
    if (!parsed.ok) throw new ToolInputError(parsed.error);
    const f = parsed.frame;
    const common = {
      kind: f.kind,
      mode: f.mode,
      subheader: hex(f.subheader, 4),
      accessRoute: {
        networkNo: hex(f.networkNo, 2),
        pcNo: hex(f.pcNo, 2),
        ioNo: hex(f.ioNo, 4),
        stationNo: hex(f.stationNo, 2),
      },
      dataLength: f.dataLength,
      actualDataLength: f.actualDataLength,
      dataLengthOk: f.dataLengthOk,
      note: f.note ?? null,
    };
    if (f.kind === "request") {
      return {
        ...common,
        command: hex(f.command, 4),
        commandName: f.commandName,
        subcommand: hex(f.subcommand, 4),
        subcommandName: f.subcommandName,
        series: f.series,
        unit: f.unit,
        device: f.device
          ? { text: f.device.text, symbol: f.device.device.symbol, name: f.device.device.name, number: f.device.number }
          : null,
        points: f.points,
        monitoringTimer: f.monitoringTimer,
        monitoringTimerLabel: f.monitoringTimerLabel,
        writeData: f.writeData && f.writeData.length > 0
          ? f.writeData.map((v) => (f.unit === "bit" ? v : hex(v, 4)))
          : null,
        requestData: f.dataText,
      };
    }
    return {
      ...common,
      endCode: hex(f.endCode, 4),
      success: f.success,
      errorInformation: f.errorInformation
        ? {
            networkNo: hex(f.errorInformation.networkNo, 2),
            pcNo: hex(f.errorInformation.pcNo, 2),
            ioNo: hex(f.errorInformation.ioNo, 4),
            stationNo: hex(f.errorInformation.stationNo, 2),
            command: hex(f.errorInformation.command, 4),
            subcommand: hex(f.errorInformation.subcommand, 4),
          }
        : null,
      responseData: f.dataText,
    };
  },
  examples: [
    { frame: "500000FF03FF000018000A04010000D*0000000005" },
    { frame: "50 00 00 FF FF 03 00 18 00 0A 00 01 04 00 00 00 00 00 A8 05 00", mode: "binary" },
    { frame: "D00000FF03FF00000C00001234ABCD" },
    { frame: "D0 00 00 FF FF 03 00 04 00 00 00 34 12", mode: "binary" },
    { frame: "500000FF03FF000020000A14010000D*00010000021234ABCD" },
    { frame: "D00000FF03FF000016C05100FF03FF0004010000" },
  ],
};

// ---------------------------------------------------------------------------
// Frame workbench (FrameWorkbenchTool.tsx)
// ---------------------------------------------------------------------------

const PRESETS: FrameChecksumPreset[] = ["None", "CRC16_MODBUS", "CRC16_CCITT_FALSE", "CRC32", "CRC8", "XOR8", "SUM8"];
const FIELD_TYPES: FrameFieldType[] = ["u8", "s8", "u16", "s16", "u32", "s32", "f32"];

const frameDecode: ToolDef = {
  name: "frame.decode",
  slug: "frame-workbench",
  category: "protocol-decoders",
  title: "Binary frame workbench",
  description:
    "Decode binary frames against a layout of one checksum placement plus typed fields at fixed offsets (FrameTerm's .ftproj model), reporting checksum OK/FAIL and every field value per frame. Example: checksum CRC16_MODBUS at the last 2 bytes (LE), field temp s16 BE at offset 3, frame \"A5 06 07 00 E1 01 18 0A\" → checksum ok (0x0A18), temp 225.",
  inputSchema: {
    type: "object",
    properties: {
      checksum: {
        type: "object",
        description: "Checksum placement. Offsets left out put the checksum, and the end of coverage, at the end of the frame.",
        properties: {
          preset: { type: "string", enum: PRESETS, description: "Checksum algorithm (None to skip checking)." },
          offsetFromEnd: { type: "integer", minimum: 0, maximum: 9999, description: "The checksum starts this many bytes before the end of the frame (default: the checksum's width)." },
          byteOrder: { type: "string", enum: ["LE", "BE"], description: "Byte order of the checksum in the frame (default LE, low byte first)." },
          coverageStart: { type: "integer", minimum: 0, maximum: 9999, description: "Coverage runs from this byte offset (default 0)…" },
          coverageEndOffsetFromEnd: { type: "integer", minimum: 0, maximum: 9999, description: "…up to this many bytes before the end (default: the checksum's width)." },
        },
        required: ["preset"],
        additionalProperties: false,
      },
      fields: {
        type: "array",
        maxItems: 256,
        description: "Typed fields at fixed byte offsets.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", maxLength: 200, description: "Field name." },
            offset: { type: "integer", minimum: 0, maximum: 9999, description: "Byte offset from the start of the frame." },
            type: { type: "string", enum: FIELD_TYPES, description: "u8 s8 u16 s16 u32 s32 or f32 (IEEE 754 single)." },
            endian: { type: "string", enum: ["LE", "BE"], description: "Byte order for multi-byte fields (default LE)." },
          },
          required: ["name", "offset", "type"],
          additionalProperties: false,
        },
      },
      frames: {
        type: "array",
        minItems: 1,
        maxItems: 10000,
        description: "Frames to decode, each as hex bytes, e.g. \"A5 06 07 00 E1 01 18 0A\".",
        items: { type: "string", maxLength: 100000 },
      },
    },
    required: ["checksum", "fields", "frames"],
    additionalProperties: false,
  },
  run: (input) => {
    const cs = input.checksum as Record<string, unknown>;
    const preset = cs.preset as FrameChecksumPreset;
    const width = checksumByteCount(preset);
    const layout: FrameLayout = {
      checksum: {
        preset,
        offsetFromEnd: cs.offsetFromEnd === undefined ? width : Number(cs.offsetFromEnd),
        byteOrder: (cs.byteOrder ?? "LE") as FrameEndian,
        coverageStart: cs.coverageStart === undefined ? 0 : Number(cs.coverageStart),
        coverageEndOffsetFromEnd: cs.coverageEndOffsetFromEnd === undefined ? width : Number(cs.coverageEndOffsetFromEnd),
      },
      fields: (input.fields as Record<string, unknown>[]).map((f) => ({
        name: String(f.name),
        offset: Number(f.offset),
        type: f.type as FrameFieldType,
        endian: (f.endian ?? "LE") as FrameEndian,
      })),
    };
    const check = validateLayout(layout);
    if (!check.ok) throw new ToolInputError(check.error);
    let ok = 0;
    let fail = 0;
    const results = (input.frames as string[]).map((text, i) => {
      const parsed = parseHex(text.trim());
      if (!parsed.ok) {
        return { frame: i + 1, ok: false, error: `Invalid character “${parsed.error.char}” at position ${parsed.error.index}` };
      }
      const d = decodeFrame(layout, parsed.bytes);
      const c = d.checksum;
      if (c.status === "ok") ok++;
      else if (c.status === "fail") fail++;
      return {
        frame: i + 1,
        ok: true,
        bytes: bytesToHex(parsed.bytes),
        length: d.length,
        checksum: {
          status: c.status,
          expected: c.expected === undefined ? null : hex(c.expected, width * 2),
          actual: c.actual === undefined ? null : hex(c.actual, width * 2),
          at: c.at ?? null,
          coverage: c.coverage ?? null,
          error: c.error ?? null,
        },
        fields: d.fields.map((f) => ({
          name: f.name,
          available: f.available,
          value: f.value,
          display: f.display,
          range: f.range,
          raw: bytesToHex(f.raw),
        })),
      };
    });
    return {
      summary: preset === "None" ? { frames: results.length, ok: null, fail: null } : { frames: results.length, ok, fail },
      frames: results,
    };
  },
  examples: [
    {
      checksum: { preset: "CRC16_MODBUS", offsetFromEnd: 2, byteOrder: "LE", coverageStart: 0, coverageEndOffsetFromEnd: 2 },
      fields: [
        { name: "seq", offset: 2, type: "u8", endian: "LE" },
        { name: "temp", offset: 3, type: "s16", endian: "BE" },
        { name: "status", offset: 5, type: "u8", endian: "LE" },
      ],
      frames: ["A5 06 07 00 E1 01 18 0A", "A5 06 08 00 EB 00 DC 7E", "A5 06 09 00 F5 00 2B DD"],
    },
    {
      checksum: { preset: "CRC16_MODBUS" },
      fields: [
        { name: "slave", offset: 0, type: "u8" },
        { name: "function", offset: 1, type: "u8" },
        { name: "byteCount", offset: 2, type: "u8" },
        { name: "value", offset: 3, type: "f32", endian: "BE" },
      ],
      frames: ["01 03 04 41 20 00 00 EF C5", "01 03 04 BF C0 00 00 DF DB", "11 03 04 41 BE 00 00 9E EA"],
    },
    {
      checksum: { preset: "None" },
      fields: [{ name: "word", offset: 0, type: "u32", endian: "BE" }, { name: "past", offset: 8, type: "u8" }],
      frames: ["DE AD BE EF", "00 00 00 01"],
    },
    {
      checksum: { preset: "XOR8", offsetFromEnd: 1, coverageStart: 1, coverageEndOffsetFromEnd: 1 },
      fields: [{ name: "cmd", offset: 1, type: "s8" }],
      frames: ["02 41 42 03", "02 FF 00 FF", "02 GG"],
    },
    {
      checksum: { preset: "CRC32", byteOrder: "BE" },
      fields: [{ name: "a", offset: 0, type: "u16", endian: "LE" }],
      frames: ["31 32 33 34 35 36 37 38 39 CB F4 39 26", "01"],
    },
  ],
};

// ---------------------------------------------------------------------------
// IEEE 754 float ↔ Modbus registers (FloatConverterTool.tsx)
// ---------------------------------------------------------------------------

const ORDER_NOTES: Record<WordOrder, string> = {
  ABCD: "big-endian (high word first)",
  CDAB: "word-swapped",
  BADC: "byte-swapped within words",
  DCBA: "little-endian",
};

function parseWordPair(s: string): [number, number] | null {
  const tokens = s.trim().split(/[\s,;]+/).filter(Boolean);
  if (tokens.length !== 2) return null;
  const words = tokens.map((t) => {
    const clean = t.replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,4}$/.test(clean)) return NaN;
    return parseInt(clean, 16);
  });
  if (words.some(Number.isNaN)) return null;
  return [words[0]!, words[1]!];
}

const float32: ToolDef = {
  name: "convert.float32",
  slug: "ieee-754-float",
  category: "data-converters",
  title: "IEEE 754 float ↔ Modbus registers",
  description:
    "Convert a float32 to two 16-bit registers in all four word orders (ABCD, CDAB, BADC, DCBA), or two registers back to a float. Example: value 3.1415927 → ABCD 0x4049 0x0FDB, CDAB 0x0FDB 0x4049.",
  inputSchema: {
    type: "object",
    properties: {
      direction: { type: "string", enum: ["toRegisters", "toFloat"], default: "toRegisters", description: "Float → registers, or registers → float." },
      value: { type: "number", description: "Decimal value to encode (direction \"toRegisters\")." },
      registers: { type: "string", maxLength: 100, description: "Two 16-bit registers in hex, e.g. \"4049 0FDB\" (direction \"toFloat\")." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    if (str(input, "direction") === "toRegisters") {
      if (input.value === undefined) throw new ToolInputError("value is required for direction \"toRegisters\".");
      const v = Number(input.value);
      const stored = registersToFloat32(float32ToRegisters(v, "ABCD"), "ABCD");
      return {
        direction: "toRegisters",
        value: v,
        storedFloat32: stored,
        nearestRepresentable: stored !== v,
        orders: WORD_ORDERS.map((order) => {
          const [r0, r1] = float32ToRegisters(v, order);
          return { order, note: ORDER_NOTES[order], registers: [hex(r0, 4), hex(r1, 4)] };
        }),
      };
    }
    if (input.registers === undefined) throw new ToolInputError("registers is required for direction \"toFloat\".");
    const regs = parseWordPair(str(input, "registers"));
    if (!regs) throw new ToolInputError("Enter two hex words, e.g. “4049 0FDB”.");
    return {
      direction: "toFloat",
      registers: [hex(regs[0], 4), hex(regs[1], 4)],
      orders: WORD_ORDERS.map((order) => {
        const f = registersToFloat32(regs, order);
        return { order, note: ORDER_NOTES[order], value: Number.isFinite(f) ? f : null, display: String(f) };
      }),
    };
  },
  examples: [
    { value: 3.1415927 },
    { direction: "toFloat", registers: "4049 0FDB" },
    { value: -0.1 },
    { direction: "toFloat", registers: "0x0000,0x41C8" },
    { value: 1e20 },
    { direction: "toFloat", registers: "7FC0 0000" },
  ],
};

// ---------------------------------------------------------------------------
// Hex ↔ ASCII (HexAsciiTool.tsx, one component for two pages)
// ---------------------------------------------------------------------------

const hexToAscii: ToolDef = {
  name: "convert.hex_to_ascii",
  slug: "hex-to-ascii",
  category: "data-converters",
  title: "Hex to ASCII",
  description:
    "Convert hex bytes to ASCII text, showing non-printable bytes (outside 0x20–0x7E) as \".\". Example: \"48 69 0D 0A\" → \"Hi..\" (4 bytes).",
  inputSchema: {
    type: "object",
    properties: {
      data: hexDataProp("Hex bytes, e.g. \"48 69\", \"0x48,0x69\" or \"4869\"."),
    },
    required: ["data"],
    additionalProperties: false,
  },
  run: (input) => {
    const r = parseHex(str(input, "data"));
    if (!r.ok) throw new ToolInputError(`Invalid character “${r.error.char}” at position ${r.error.index}`);
    return { text: bytesToAscii(r.bytes), byteCount: r.bytes.length };
  },
  examples: [
    { data: "48 69" },
    { data: "48 69 0D 0A" },
    { data: "0x54,0x65,0x73,0x74" },
    { data: "3132333435363738 39" },
    { data: "" },
  ],
};

const asciiToHex: ToolDef = {
  name: "convert.ascii_to_hex",
  slug: "ascii-to-hex",
  category: "data-converters",
  title: "ASCII to hex",
  description:
    "Convert ASCII text to space-separated uppercase hex bytes (one byte per character, low 8 bits of each code). Example: \"Hi\" → \"48 69\" (2 bytes).",
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", maxLength: 200000, description: "Text to encode, one byte per character." },
    },
    required: ["text"],
    additionalProperties: false,
  },
  run: (input) => {
    const bytes = asciiToBytes(str(input, "text"));
    return { hex: bytesToHex(bytes), byteCount: bytes.length };
  },
  examples: [
    { text: "Hi" },
    { text: "123456789" },
    { text: "AT+GMR\r\n" },
    { text: "" },
    { text: "$GPGGA" },
  ],
};

// ---------------------------------------------------------------------------
// Number base converter (NumberBaseTool.tsx)
// ---------------------------------------------------------------------------

const numberBase: ToolDef = {
  name: "convert.number_base",
  slug: "number-base-converter",
  category: "data-converters",
  title: "Number base converter",
  description:
    "Convert an integer of any size between binary, octal, decimal and hexadecimal (prefixes 0b/0o/0x, a sign and _ digit grouping accepted). Example: value \"255\" in base 10 → binary 11111111, octal 377, hex FF.",
  inputSchema: {
    type: "object",
    properties: {
      value: { type: "string", maxLength: 10000, description: "The integer as written in `base`, e.g. \"255\", \"0xFF\", \"-1010\"." },
      base: { type: "integer", enum: [2, 8, 10, 16], default: 10, description: "Base the value is written in." },
    },
    required: ["value"],
    additionalProperties: false,
  },
  run: (input) => {
    const base = Number(input.base) as NumberBase;
    const text = str(input, "value");
    if (text.trim() === "") throw new ToolInputError("Enter a number.");
    const r = parseInBase(text, base);
    if (!r.ok) throw new ToolInputError(`Invalid digit for base ${base} at position ${r.errorIndex}`);
    return {
      binary: formatInBase(r.value, 2).toUpperCase(),
      octal: formatInBase(r.value, 8).toUpperCase(),
      decimal: formatInBase(r.value, 10).toUpperCase(),
      hexadecimal: formatInBase(r.value, 16).toUpperCase(),
    };
  },
  examples: [
    { value: "255" },
    { value: "0xDEADBEEF", base: 16 },
    { value: "1010_1010", base: 2 },
    { value: "-777", base: 8 },
    { value: "18446744073709551615" },
  ],
};

// ---------------------------------------------------------------------------
// Two's complement (TwosComplementTool.tsx)
// ---------------------------------------------------------------------------

const twosComplement: ToolDef = {
  name: "convert.twos_complement",
  slug: "twos-complement",
  category: "data-converters",
  title: "Two's complement converter",
  description:
    "Convert between a signed decimal integer and its 8-, 16- or 32-bit two's-complement hex form, with the unsigned and binary views. Example: decimal \"-10\" at 16 bits → 0xFFF6 (unsigned 65526, binary 1111111111110110).",
  inputSchema: {
    type: "object",
    properties: {
      value: { type: "string", maxLength: 100, description: "A signed decimal integer (from \"decimal\") or up to width/4 hex digits (from \"hex\")." },
      from: { type: "string", enum: ["decimal", "hex"], default: "decimal", description: "How `value` is written." },
      width: { type: "integer", enum: [8, 16, 32], default: 16, description: "Word width in bits." },
    },
    required: ["value"],
    additionalProperties: false,
  },
  run: (input) => {
    const w = Number(input.width) as 8 | 16 | 32;
    const text = str(input, "value");
    let raw: number;
    if (str(input, "from") === "decimal") {
      const v = parseInt(text.trim(), 10);
      const half = Math.pow(2, w - 1);
      if (text.trim() === "" || Number.isNaN(v)) throw new ToolInputError("Enter a decimal integer.");
      if (v < -half || v > half - 1) throw new ToolInputError(`Out of range for ${w}-bit: ${-half} … ${half - 1}.`);
      raw = parseInt(fromSigned(v, w).toString(16).toUpperCase().padStart(w / 4, "0"), 16);
    } else {
      const h = text.trim().replace(/^0x/i, "");
      if (!new RegExp(`^[0-9a-fA-F]{1,${w / 4}}$`).test(h)) throw new ToolInputError(`Enter up to ${w / 4} hex digits.`);
      raw = parseInt(h, 16);
    }
    return {
      width: w,
      signed: toSigned(raw, w),
      unsigned: raw,
      hex: "0x" + raw.toString(16).toUpperCase().padStart(w / 4, "0"),
      binary: raw.toString(2).padStart(w, "0"),
    };
  },
  examples: [
    { value: "-10" },
    { value: "FFF6", from: "hex" },
    { value: "-128", width: 8 },
    { value: "80", from: "hex", width: 8 },
    { value: "2147483647", width: 32 },
    { value: "7F", from: "hex", width: 8 },
  ],
};

// ---------------------------------------------------------------------------
// Endianness converter (EndiannessTool.tsx)
// ---------------------------------------------------------------------------

const endianness: ToolDef = {
  name: "convert.endianness",
  slug: "endianness-converter",
  category: "data-converters",
  title: "Endianness converter",
  description:
    "Show hex bytes fully byte-reversed, byte-swapped within 16-bit words, and 16-bit-word-swapped within 32-bit groups. Example: \"12 34 56 78\" → reversed 78 56 34 12, byte swap 34 12 78 56, word swap 56 78 12 34.",
  inputSchema: {
    type: "object",
    properties: {
      data: hexDataProp("Value as hex bytes, e.g. \"12 34 56 78\"."),
    },
    required: ["data"],
    additionalProperties: false,
  },
  run: (input) => {
    const bytes = readData(input.data);
    if (bytes.length === 0) throw new ToolInputError("Enter at least one byte.");
    return {
      byteCount: bytes.length,
      bits: bytes.length * 8,
      byteReversed: bytesToHex(reverseBytes(bytes)),
      byteSwapWords: bytes.length >= 2 && bytes.length % 2 === 0 ? bytesToHex(swapBytesInWords(bytes)) : null,
      wordSwap: bytes.length >= 4 && bytes.length % 4 === 0 ? bytesToHex(swapWords(bytes)) : null,
      original: bytesToHex(bytes),
    };
  },
  examples: [
    { data: "12 34 56 78" },
    { data: "AB CD" },
    { data: "01 02 03" },
    { data: "0x11223344 55667788" },
    { data: "FF" },
  ],
};

// ---------------------------------------------------------------------------
// Q-format fixed point (QFormatTool.tsx)
// ---------------------------------------------------------------------------

const qFormat: ToolDef = {
  name: "convert.q_format",
  slug: "q-format",
  category: "data-converters",
  title: "Q-format fixed-point converter",
  description:
    "Encode a real value as signed Qm.n fixed point (round to nearest, clamp at the range ends) or decode a raw hex word back to its value. Example: 0.5 in Q0.15 → raw 0x4000 (16384 steps), stored 0.5.",
  inputSchema: {
    type: "object",
    properties: {
      m: { type: "integer", minimum: 0, maximum: 30, default: 0, description: "Integer bits m (Q15 is m 0, n 15)." },
      n: { type: "integer", minimum: 0, maximum: 31, default: 15, description: "Fraction bits n. Total width 1 + m + n must be 2–32." },
      direction: { type: "string", enum: ["toRaw", "toValue"], default: "toRaw", description: "Value → raw word, or raw word → value." },
      value: { type: "number", description: "Real value to encode (direction \"toRaw\")." },
      raw: { type: "string", maxLength: 20, description: "Raw two's-complement word in hex, e.g. \"4000\" (direction \"toValue\")." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const m = Number(input.m);
    const n = Number(input.n);
    const info = qInfo(m, n);
    if (!(info.bits >= 2 && info.bits <= 32)) throw new ToolInputError("1 + m + n must be between 2 and 32 bits.");
    const hexDigits = Math.ceil(info.bits / 4);
    const format = { notation: `Q${m}.${n}`, bits: info.bits, min: info.min, max: info.max, resolution: info.resolution };
    if (str(input, "direction") === "toRaw") {
      if (input.value === undefined) throw new ToolInputError("value is required for direction \"toRaw\".");
      const v = Number(input.value);
      const enc = encodeQ(v, m, n);
      return {
        format,
        raw: "0x" + enc.raw.toString(16).toUpperCase().padStart(hexDigits, "0"),
        stepCount: enc.stepCount,
        stored: enc.stored,
        quantizationError: enc.stored - v,
        clamped: enc.clamped,
      };
    }
    if (input.raw === undefined) throw new ToolInputError("raw is required for direction \"toValue\".");
    const h = str(input, "raw").trim().replace(/^0x/i, "");
    if (!new RegExp(`^[0-9a-fA-F]{1,${hexDigits}}$`).test(h)) throw new ToolInputError(`Enter up to ${hexDigits} hex digits.`);
    return { format, value: decodeQ(parseInt(h, 16), m, n) };
  },
  examples: [
    { value: 0.5 },
    { direction: "toValue", raw: "4000" },
    { value: 1.5 },
    { m: 7, n: 8, value: -3.14159 },
    { m: 15, n: 16, direction: "toValue", raw: "0xFFFF8000" },
    { m: 0, n: 31, value: -1 },
  ],
};

export const PROTOCOL_TOOLS: ToolDef[] = [
  modbusDecode,
  nmeaDecode,
  nmeaGenerate,
  canDecode,
  mcDecode,
  frameDecode,
  float32,
  hexToAscii,
  asciiToHex,
  numberBase,
  twosComplement,
  endianness,
  qFormat,
];
