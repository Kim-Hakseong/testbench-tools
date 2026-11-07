import {
  MODE_CODES,
  SSM_BCD,
  SSM_BNR,
  SSM_DISCRETE,
  TdmsParser,
  applyBnrScale,
  buildArinc429,
  decodeCommandWord,
  decodeMessage,
  decodeStatusWord,
  encodeCommandWord,
  hexDumpLines,
  parseArinc429,
  parseCsvNumeric,
  parseIntelHex,
  parseSrec,
  segmentsToBin,
  tdmsToCsv,
  tdmsTypeName,
  toIntelHex,
  toSrec,
  type Arinc429Format,
  type CommandWord,
  type LabelBitOrder,
  type StatusWord,
  type TdmsFile,
  type TdmsPropertyValue,
} from "@testbench/engine";
import type { JsonSchema } from "../schema";
import { ToolInputError, hex, str, type ToolDef } from "../define";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const MAX_BASE64 = 4_000_000; // ≈ 3 MB of binary
const MAX_TEXT = 4_000_000;

const base64Prop = (what: string): JsonSchema => ({
  type: "string",
  maxLength: MAX_BASE64,
  description: `${what}, base64-encoded (standard alphabet, padding optional, whitespace ignored).`,
});

/** Base64 → bytes without node:buffer, so the package also runs in Workers. */
function readBase64(s: unknown): Uint8Array {
  const t = String(s ?? "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t) || t.length % 4 === 1) throw new ToolInputError("contentBase64 is not valid base64");
  let bin: string;
  try {
    bin = atob(t);
  } catch {
    throw new ToolInputError("contentBase64 is not valid base64");
  }
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** NaN/±Infinity cannot travel in JSON. */
const fin = (v: number): number | null => (Number.isFinite(v) ? v : null);

/** The 1553 pages' word box: up to 4 hex digits, optional 0x. */
function read1553Word(text: string): number {
  const t = text.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{1,4}$/.test(t)) throw new ToolInputError("Enter up to 4 hex digits.");
  return parseInt(t, 16);
}

const bin16 = (w: number) => w.toString(2).padStart(16, "0");

function commandJson(c: CommandWord) {
  return {
    word: hex(c.raw, 4),
    binary: bin16(c.raw),
    rtAddress: c.rtAddress,
    broadcast: c.broadcast,
    transmit: c.transmit,
    direction: c.transmit ? "Transmit (RT → BC)" : "Receive (BC → RT)",
    subaddress: c.subaddress,
    isModeCommand: c.isModeCommand,
    wordCount: c.wordCount,
    modeCode: c.modeCode,
    modeName: c.isModeCommand ? (c.mode ? c.mode.name : "reserved / undefined") : null,
    modeDataWord: c.mode ? c.mode.dataWord : null,
    parity: c.parity,
    withParity: `${bin16(c.raw)} ${c.parity}`,
  };
}

// Mil1553StatusTool.tsx's flag table (names verbatim from MIL-STD-1553B).
const STATUS_FLAGS: { key: keyof StatusWord; name: string; bit: number }[] = [
  { key: "messageError", name: "Message Error", bit: 10 },
  { key: "instrumentation", name: "Instrumentation (reserved 0)", bit: 9 },
  { key: "serviceRequest", name: "Service Request", bit: 8 },
  { key: "broadcastReceived", name: "Broadcast Command Received", bit: 4 },
  { key: "busy", name: "Busy", bit: 3 },
  { key: "subsystemFlag", name: "Subsystem Flag", bit: 2 },
  { key: "dynamicBusControlAccept", name: "Dynamic Bus Control Acceptance", bit: 1 },
  { key: "terminalFlag", name: "Terminal Flag", bit: 0 },
];

function statusJson(s: StatusWord) {
  return {
    word: hex(s.raw, 4),
    rtAddress: s.rtAddress,
    messageError: s.messageError,
    instrumentation: s.instrumentation,
    serviceRequest: s.serviceRequest,
    reserved: s.reserved,
    broadcastReceived: s.broadcastReceived,
    busy: s.busy,
    subsystemFlag: s.subsystemFlag,
    dynamicBusControlAccept: s.dynamicBusControlAccept,
    terminalFlag: s.terminalFlag,
    parity: s.parity,
  };
}

const SSM_TABLE: Record<Arinc429Format, readonly string[]> = { bnr: SSM_BNR, bcd: SSM_BCD, discrete: SSM_DISCRETE };

const labelOrderProp: JsonSchema = {
  type: "string",
  enum: ["bit1-msb", "bit8-msb"],
  default: "bit1-msb",
  description: "Which numbered label bit holds the octal label's MSB; sources disagree, and the other reading is always reported too.",
};

function parseTdms(bytes: Uint8Array): TdmsFile {
  try {
    const p = new TdmsParser();
    p.push(bytes);
    return p.finish();
  } catch (e) {
    throw new ToolInputError(e instanceof Error ? e.message : String(e));
  }
}

const propsJson = (p: Record<string, TdmsPropertyValue>) =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === "number" ? fin(v) : v]));

// Small TDMS files built with packages/engine/src/testutil/tdms-writer.ts.
const TDMS_ONE = "VERTbQ4AAABpEgAAcwAAAAAAAABTAAAAAAAAAAMAAAABAAAAL/////8AAAAACAAAAC8nR3JvdXAn/////wAAAAASAAAALydHcm91cCcvJ1ZvbHRhZ2UnFAAAAAoAAAABAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgPwAAAAAAAPA/AAAAAAAA+D8=";
const TDMS_TWO = "VERTbQ4AAABpEgAAygAAAAAAAACaAAAAAAAAAAQAAAABAAAAL/////8BAAAABQAAAHRpdGxlIAAAAAUAAABSdW4gMQYAAAAvJ0RBUSf/////AAAAAAwAAAAvJ0RBUScvJ2NoMScUAAAACgAAAAEAAAADAAAAAAAAAAEAAAAEAAAAdW5pdCAAAAABAAAAVgwAAAAvJ0RBUScvJ2NoMicUAAAACgAAAAEAAAADAAAAAAAAAAAAAAAAAAAAAADwPwAAAAAAAABAAAAAAAAACEAAAAAAAADwvwAAAAAAAADAAAAAAAAACMA=";
const TDMS_GROUPS = "VERTbQ4AAABpEgAAtQAAAAAAAACNAAAAAAAAAAUAAAABAAAAL/////8AAAAABAAAAC8nQSf/////AAAAAAQAAAAvJ0In/////wAAAAAIAAAALydBJy8neCcUAAAACgAAAAEAAAACAAAAAAAAAAAAAAAIAAAALydCJy8neScUAAAACgAAAAEAAAADAAAAAAAAAAEAAAAEAAAAZ2FpbgoAAAAAAAAAAAAEQAAAAAAAACRAAAAAAAAANECamZmZmZm5P5qZmZmZmck/MzMzMzMz0z8=";
const TDMS_EMPTY = "VERTbQYAAABpEgAAPAAAAAAAAAA8AAAAAAAAAAIAAAABAAAAL/////8BAAAABgAAAGF1dGhvciAAAAAFAAAAYmVuY2gIAAAALydFbXB0eSf/////AAAAAA==";
const TDMS_RAMP = "VERTbQ4AAABpEgAAqAAAAAAAAABIAAAAAAAAAAMAAAABAAAAL/////8AAAAABAAAAC8nRyf/////AAAAAAsAAAAvJ0cnLydyYW1wJxQAAAAKAAAAAQAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAVVVVVVVV1T9VVVVVVVXlPwAAAAAAAPA/VVVVVVVV9T+rqqqqqqr6PwAAAAAAAABAq6qqqqqqAkBVVVVVVVUFQAAAAAAAAAhAq6qqqqqqCkBVVVVVVVUNQA==";

const IHEX_SAMPLE = ":10010000214601360121470136007EFE09D2190140\n:00000001FF";

// ---------------------------------------------------------------------------
// avionics-databus
// ---------------------------------------------------------------------------

const ARINC_TOOLS: ToolDef[] = [
  {
    name: "arinc429.build",
    slug: "arinc-429-builder",
    category: "avionics-databus",
    title: "ARINC 429 word builder",
    description: "Build a 32-bit ARINC 429 word from an octal label, SDI, SSM and either a 19-bit data field (BNR/discrete) or BCD digits, with odd parity set on bit 32. Example: labelOctal \"205\", sdi 2, ssm 3, format bnr, data 400 → word 0x600642A1 (parity bit 0).",
    inputSchema: {
      type: "object",
      properties: {
        labelOctal: { type: "string", maxLength: 8, description: "Label as 3 octal digits, e.g. \"205\"." },
        labelBitOrder: labelOrderProp,
        format: { type: "string", enum: ["bnr", "bcd", "discrete"], default: "bnr", description: "Data format from your ICD; selects which SSM table applies and whether `data` or `bcdDigits` is used." },
        sdi: { type: "integer", minimum: 0, maximum: 3, default: 0, description: "Source/Destination Identifier, bits 10-9." },
        ssm: { type: "integer", minimum: 0, maximum: 3, default: 0, description: "Sign/Status Matrix code, bits 31-30 (meaning depends on format)." },
        data: { type: "integer", description: "Data field bits 29-11 as an unsigned 19-bit integer (0 - 524287). Used for bnr and discrete." },
        bcdDigits: { type: "string", maxLength: 64, description: "BCD digits, most significant first, separated by spaces or commas, e.g. \"2 5 7 8 6\". Used for bcd." },
      },
      required: ["labelOctal"],
      additionalProperties: false,
    },
    run: (input) => {
      const format = str(input, "format") as Arinc429Format;
      const order = str(input, "labelBitOrder") as LabelBitOrder;
      const common = { labelOctal: str(input, "labelOctal").trim(), labelBitOrder: order, sdi: Number(input.sdi), ssm: Number(input.ssm) };
      let built;
      if (format === "bcd") {
        if (input.data !== undefined) throw new ToolInputError("data applies to bnr/discrete; give bcdDigits for format bcd");
        if (input.bcdDigits === undefined) throw new ToolInputError("bcdDigits is required for format bcd");
        const digits = str(input, "bcdDigits").trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (digits.some((d) => !Number.isInteger(d))) throw new ToolInputError("BCD digits must be whole numbers");
        built = buildArinc429({ ...common, bcdDigits: digits });
      } else {
        if (input.bcdDigits !== undefined) throw new ToolInputError("bcdDigits applies only to format bcd");
        if (input.data === undefined) throw new ToolInputError(`data is required for format ${format}`);
        built = buildArinc429({ ...common, data: Number(input.data) });
      }
      if (!built.ok) throw new ToolInputError(built.error);
      const back = parseArinc429(built.word.raw, { labelBitOrder: order, format });
      if (!back.ok) throw new ToolInputError(back.error);
      const w = back.word;
      return {
        word: built.word.hex,
        decimal: built.word.raw,
        parityBit: built.word.parityBit,
        bits: w.bits,
        format,
        ssmMeaning: SSM_TABLE[format][common.ssm] ?? null,
        decodesBackAs: { labelOctal: w.label.octal, sdi: w.sdi, ssm: w.ssm },
        labelOctalAlternate: w.label.octalAlternate,
      };
    },
    examples: [
      { labelOctal: "205", sdi: 2, ssm: 3, format: "bnr", data: 400 },
      { labelOctal: "205", sdi: 2, ssm: 3, format: "bcd", bcdDigits: "2 5 7 8 6" },
      { labelOctal: "310", ssm: 3, data: 0 },
      { labelOctal: "270", format: "discrete", data: 5, labelBitOrder: "bit8-msb" },
      { labelOctal: "001", sdi: 1, ssm: 0, format: "bcd", bcdDigits: "1,2,3" },
    ],
  },
  {
    name: "arinc429.decode",
    slug: "arinc-429-decoder",
    category: "avionics-databus",
    title: "ARINC 429 word decoder",
    description: "Decode a 32-bit ARINC 429 word into label (octal, under both bit-order conventions), SDI, SSM, the data field read as BNR and BCD, and the odd-parity check. Example: word \"0xE00640A1\" → label 205 (241 read the other way round), SDI 0, SSM 3, BNR value 400, parity valid.",
    inputSchema: {
      type: "object",
      properties: {
        word: { type: "string", maxLength: 64, description: "32-bit word in hex, 0x prefix and spaces allowed, e.g. \"0xE00640A1\" or \"E0 06 40 A1\"." },
        labelBitOrder: labelOrderProp,
        format: { type: "string", enum: ["none", "bnr", "bcd", "discrete"], default: "none", description: "Data format from your ICD; \"none\" reports the SSM under every reading." },
        bnrFullScale: { type: "number", description: "BNR full-scale range from your ICD; when given, the signed BNR value is scaled as signed × fullScale / 2^18." },
      },
      required: ["word"],
      additionalProperties: false,
    },
    run: (input) => {
      const format = str(input, "format");
      const r = parseArinc429(str(input, "word"), {
        labelBitOrder: str(input, "labelBitOrder") as LabelBitOrder,
        ...(format === "none" ? {} : { format: format as Arinc429Format }),
      });
      if (!r.ok) throw new ToolInputError(r.error);
      const w = r.word;
      let scaled: number | null = null;
      if (input.bnrFullScale !== undefined) {
        const fs = Number(input.bnrFullScale);
        if (fs === 0) throw new ToolInputError("bnrFullScale must not be 0");
        scaled = applyBnrScale(w.bnr.signed, fs);
      }
      return {
        word: w.hex,
        bits: w.bits,
        fields: { parity: w.bits.slice(0, 1), ssm: w.bits.slice(1, 3), data: w.bits.slice(3, 22), sdi: w.bits.slice(22, 24), label: w.bits.slice(24, 32) },
        labelOctal: w.label.octal,
        labelOctalAlternate: w.label.octalAlternate,
        labelBitOrder: w.label.bitOrder,
        sdi: w.sdi,
        ssm: w.ssm,
        format: w.format,
        ssmMeaning: w.ssmMeaning,
        ssmReadings: w.ssmReadings,
        parityBit: w.parityBit,
        parityExpected: w.parityExpected,
        parityOk: w.parityOk,
        dataField: hex(w.data, 5),
        bnr: { signed: w.bnr.signed, negative: w.bnr.negative, magnitude: w.bnr.magnitude, scaled },
        bcd: { digits: w.bcd.digits, value: w.bcd.value, invalidDigits: w.bcd.invalidDigits },
      };
    },
    examples: [
      { word: "0xE00640A1" },
      { word: "E0 06 40 A1", format: "bnr", bnrFullScale: 512 },
      { word: "0x60064085", labelBitOrder: "bit8-msb" },
      { word: "0x1", format: "bcd" },
      { word: "FFFFFFFF", format: "discrete" },
    ],
  },
];

const MIL1553_TOOLS: ToolDef[] = [
  {
    name: "mil1553.decode_command",
    slug: "mil-1553-command-word",
    category: "avionics-databus",
    title: "MIL-STD-1553 command word",
    description: "Decode a MIL-STD-1553B command word into RT address, T/R, subaddress and word count or mode code, or build one from those fields with mode \"encode\". Example: word \"183E\" → RT 3, receive (BC → RT), subaddress 1, 30 data words.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["decode", "encode"], default: "decode", description: "decode a word, or encode (build) one from fields." },
        word: { type: "string", maxLength: 16, description: "decode: 16-bit command word as up to 4 hex digits, 0x optional." },
        rtAddress: { type: "integer", minimum: 0, maximum: 31, description: "encode: RT address 0-31 (31 = broadcast)." },
        transmit: { type: "boolean", default: false, description: "encode: T/R bit; true = transmit (RT → BC)." },
        subaddress: { type: "integer", minimum: 0, maximum: 31, description: "encode: subaddress 0-31; 0 and 31 make this a mode command." },
        wordCountOrMode: { type: "integer", minimum: 0, maximum: 32, description: "encode: word count 1-32, or the mode code 0-31 when subaddress is 0 or 31." },
      },
      additionalProperties: false,
    },
    run: (input) => {
      if (str(input, "mode") === "decode") {
        if (input.word === undefined) throw new ToolInputError("word is required for mode decode");
        return { mode: "decode", ...commandJson(decodeCommandWord(read1553Word(str(input, "word")))) };
      }
      for (const k of ["rtAddress", "subaddress", "wordCountOrMode"]) {
        if (input[k] === undefined) throw new ToolInputError(`${k} is required for mode encode`);
      }
      const sa = Number(input.subaddress);
      const wcm = Number(input.wordCountOrMode);
      const isMode = sa === 0 || sa === 31;
      if (isMode && wcm > 31) throw new ToolInputError("Mode code must be 0-31 (subaddress 0/31 makes this field a mode code)");
      if (!isMode && wcm < 1) throw new ToolInputError("Word count must be 1-32");
      const built = encodeCommandWord({ rtAddress: Number(input.rtAddress), transmit: Boolean(input.transmit), subaddress: sa, wordCountOrMode: wcm });
      return { mode: "encode", ...commandJson(decodeCommandWord(built)) };
    },
    examples: [
      { word: "183E" },
      { word: "0x2822" },
      { word: "FC02" },
      { mode: "encode", rtAddress: 3, transmit: false, subaddress: 1, wordCountOrMode: 30 },
      { mode: "encode", rtAddress: 5, transmit: true, subaddress: 31, wordCountOrMode: 2 },
      { mode: "encode", rtAddress: 1, subaddress: 2, wordCountOrMode: 32 },
    ],
  },
  {
    name: "mil1553.decode_message",
    slug: "mil-1553-message-decoder",
    category: "avionics-databus",
    title: "MIL-STD-1553 message decoder",
    description: "Lay out a MIL-STD-1553B transfer from its 16-bit words (word 1 is the command), labelling each word as command, data or status and checking the word count against the transfer format. Example: words \"2822 1234 5678 2800\" → BC → RT (receive): command, 2 data words and the RT 5 status word, layout matches.",
    inputSchema: {
      type: "object",
      properties: {
        words: { type: "string", maxLength: 2000, description: "Message words as 16-bit hex (up to 4 digits each, 0x optional), separated by spaces or commas." },
      },
      required: ["words"],
      additionalProperties: false,
    },
    run: (input) => {
      const tokens = str(input, "words").trim().split(/[\s,]+/).filter(Boolean);
      if (tokens.length === 0) throw new ToolInputError("Enter at least one word");
      const words = tokens.map((tok) => {
        const h = tok.replace(/^0x/i, "");
        if (!/^[0-9a-fA-F]{1,4}$/.test(h)) throw new ToolInputError(`Invalid word “${tok}”.`);
        return parseInt(h, 16);
      });
      const msg = decodeMessage(words);
      return {
        type: msg.type,
        ok: msg.ok,
        wordCount: msg.words.length,
        expectedCount: msg.expectedCount,
        note: msg.note ?? null,
        words: msg.words.map((w, i) => {
          const c = w.command;
          const s = w.status;
          const summary = c
            ? `RT ${c.rtAddress} · ${c.transmit ? "Tx" : "Rx"} · SA ${c.subaddress}${c.isModeCommand ? ` · mode ${c.modeCode}` : ` · WC ${c.wordCount}`}`
            : s
              ? `RT ${s.rtAddress}${s.messageError ? " · ME" : ""}${s.busy ? " · Busy" : ""}${s.serviceRequest ? " · SRQ" : ""}${s.terminalFlag ? " · TF" : ""}`
              : `${w.raw} · int16 ${(w.raw << 16) >> 16}`;
          return {
            index: i + 1,
            word: hex(w.raw, 4),
            role: w.role,
            label: w.label,
            summary,
            command: c ? commandJson(c) : null,
            status: s ? statusJson(s) : null,
            value: w.role === "data" ? { unsigned: w.raw, int16: (w.raw << 16) >> 16 } : null,
          };
        }),
      };
    },
    examples: [
      { words: "2822 1234 5678 2800" },
      { words: "1C22 1800 AAAA 5555" },
      { words: "0x1802, 0x1800" },
      { words: "FC22 0001 0002" },
      { words: "2822 1234" },
    ],
  },
  {
    name: "mil1553.mode_codes",
    slug: "mil-1553-mode-codes",
    category: "avionics-databus",
    title: "MIL-STD-1553 mode codes",
    description: "List the MIL-STD-1553B mode codes (used with subaddress 0 or 31) with their required T/R bit and whether a data word follows, optionally filtered by code or name. Example: query \"reset\" → code 8, Reset Remote Terminal, T/R 1, no data word.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 100, default: "", description: "Filter: a decimal code, a binary fragment, a 0x hex code or part of the name (case-insensitive). Empty lists all." },
      },
      additionalProperties: false,
    },
    run: (input) => {
      const q = str(input, "query").trim().toLowerCase();
      const rows = !q
        ? MODE_CODES
        : MODE_CODES.filter((m) =>
            m.name.toLowerCase().includes(q) || String(m.code) === q || m.code.toString(2).includes(q) || ("0x" + m.code.toString(16)).includes(q));
      return {
        count: rows.length,
        modeCodes: rows.map((m) => ({
          code: m.code,
          bits: m.code.toString(2).padStart(5, "0"),
          tr: m.tr,
          direction: m.tr === 1 ? "Tx" : "Rx",
          dataWord: m.dataWord,
          name: m.name,
        })),
        note: "Codes 9–15 and 22–31 are reserved. Mode commands use subaddress 0 or 31.",
      };
    },
    examples: [{}, { query: "reset" }, { query: "2" }, { query: "status" }, { query: "0x10" }, { query: "nothing-matches" }],
  },
  {
    name: "mil1553.decode_status",
    slug: "mil-1553-status-word",
    category: "avionics-databus",
    title: "MIL-STD-1553 status word",
    description: "Decode a MIL-STD-1553B status word into the RT address, each status flag bit and the odd-parity bit. Example: word \"1800\" → RT address 3, no status flags set, parity bit 1.",
    inputSchema: {
      type: "object",
      properties: {
        word: { type: "string", maxLength: 16, description: "16-bit status word as up to 4 hex digits, 0x optional." },
      },
      required: ["word"],
      additionalProperties: false,
    },
    run: (input) => {
      const s = decodeStatusWord(read1553Word(str(input, "word")));
      return {
        ...statusJson(s),
        flags: STATUS_FLAGS.map((f) => ({ bit: f.bit, name: f.name, set: s[f.key] as boolean })),
      };
    },
    examples: [{ word: "1800" }, { word: "0x1C08" }, { word: "FFFF" }, { word: "0" }, { word: "2D01" }],
  },
];

// ---------------------------------------------------------------------------
// file-tools
// ---------------------------------------------------------------------------

const FILE_TOOLS: ToolDef[] = [
  {
    name: "file.csv_summary",
    slug: "csv-waveform-plotter",
    category: "file-tools",
    title: "CSV waveform summary",
    description: "Parse numeric CSV text the way the waveform plotter does (auto delimiter, optional header row, non-numeric rows skipped) and return per-column min/max/mean, the plot axis ranges and the first rows instead of the plot. Example: text \"t,v\\n0,1\\n1,3\\n2,2\" → 3 rows, column v min 1, max 3, mean 2, plotted against t from 0 to 2.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", maxLength: MAX_TEXT, description: "CSV text; comma, semicolon or tab delimited." },
        firstColumnIsX: { type: "boolean", default: true, description: "Use the first column as the X axis (when there is more than one column), as the page does by default." },
        sampleRows: { type: "integer", minimum: 0, maximum: 100, default: 10, description: "How many leading data rows to return." },
      },
      required: ["text"],
      additionalProperties: false,
    },
    run: (input) => {
      const r = parseCsvNumeric(str(input, "text"));
      if (!r.ok) throw new ToolInputError(r.error);
      const csv = r.csv;
      const xIsFirst = Boolean(input.firstColumnIsX) && csv.headers.length > 1;
      const stats = csv.columns.map((col, i) => {
        const f = col.filter(Number.isFinite);
        return {
          index: i,
          name: csv.headers[i]!,
          finiteCount: f.length,
          min: f.length ? Math.min(...f) : null,
          max: f.length ? Math.max(...f) : null,
          mean: f.length ? f.reduce((a, b) => a + b, 0) / f.length : null,
        };
      });
      // The page plots the first 8 data columns at load, against column 1 or the row index.
      const plotted = csv.headers.map((_, i) => i).filter((i) => !(csv.headers.length > 1 && i === 0)).slice(0, 8);
      let yMin = Infinity, yMax = -Infinity;
      for (const c of plotted) for (const v of csv.columns[c]!) if (Number.isFinite(v)) { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); }
      if (Number.isFinite(yMin) && yMin === yMax) { yMin -= 1; yMax += 1; }
      const xFinite = xIsFirst ? csv.columns[0]!.filter(Number.isFinite) : [];
      const n = Math.min(Number(input.sampleRows), csv.rowCount);
      return {
        headers: csv.headers,
        rowCount: csv.rowCount,
        delimiter: csv.delimiter === "\t" ? "TAB" : csv.delimiter,
        skippedRows: csv.skippedRows,
        columns: stats,
        plot: {
          xAxis: xIsFirst ? csv.headers[0]! : "row index",
          xMin: xIsFirst ? (xFinite.length ? Math.min(...xFinite) : null) : 0,
          xMax: xIsFirst ? (xFinite.length ? Math.max(...xFinite) : null) : csv.rowCount - 1,
          series: plotted.map((i) => csv.headers[i]!),
          yMin: fin(yMin),
          yMax: fin(yMax),
        },
        firstRows: Array.from({ length: n }, (_, row) => csv.columns.map((col) => fin(col[row]!))),
        truncated: n < csv.rowCount,
      };
    },
    examples: [
      { text: "t,v\n0,1\n1,3\n2,2" },
      { text: "time;ch1;ch2\n0;0.1;-0.1\n0.001;0.2;-0.2\n0.002;0.3;-0.3", sampleRows: 2 },
      { text: "1\n2\n3\n4" },
      { text: "x\ty\n0\t5\n1\t5\nfoo\tbar\n2\t5" },
      { text: "a,b,c\n1,,3\n4,5,x\n7,8,9", firstColumnIsX: false },
    ],
  },
  {
    name: "file.hex_dump",
    slug: "hex-file-viewer",
    category: "file-tools",
    title: "Hex file viewer",
    description: "Hex dump of a binary file (offset, 16 hex bytes, ASCII column), returned in windows of up to 64 KB with the next offset to continue from. Example: contentBase64 \"SGVsbG8sIFdvcmxkIQ==\" (\"Hello, World!\") → 13 bytes, one line starting \"00000000  48 65 6C 6C 6F\" and ending \"|Hello, World!|\".",
    inputSchema: {
      type: "object",
      properties: {
        contentBase64: base64Prop("The file's bytes"),
        offset: { type: "integer", minimum: 0, default: 0, description: "Byte offset to start the dump at." },
        length: { type: "integer", minimum: 1, maximum: 65536, default: 16384, description: "Bytes to dump from offset (the page shows 16 KB at a time)." },
      },
      required: ["contentBase64"],
      additionalProperties: false,
    },
    run: (input) => {
      const bytes = readBase64(input.contentBase64);
      const offset = Number(input.offset);
      if (offset > bytes.length) throw new ToolInputError(`offset ${offset} is past the end of the ${bytes.length}-byte file`);
      const chunk = bytes.subarray(offset, offset + Number(input.length));
      const next = offset + chunk.length;
      return {
        totalBytes: bytes.length,
        offset,
        shownBytes: chunk.length,
        remainingBytes: bytes.length - next,
        truncated: next < bytes.length,
        nextOffset: next < bytes.length ? next : null,
        lines: hexDumpLines(chunk, offset),
      };
    },
    examples: [
      { contentBase64: "SGVsbG8sIFdvcmxkIQ==" },
      { contentBase64: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=" },
      { contentBase64: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=", offset: 8, length: 16 },
      { contentBase64: "" },
      { contentBase64: "f0VMRgIBAQAAAAAAAAAAAA", length: 4 },
    ],
  },
  {
    name: "file.hex_srec_convert",
    slug: "hex-srec-bin",
    category: "file-tools",
    title: "Intel HEX / S-Record / BIN converter",
    description: "Convert Intel HEX or Motorola S-Record text to a flat binary (gaps filled with 0xFF, returned as base64 with its segment map), or a binary to Intel HEX or S-Record at a base address. Example: direction toBin, text \":10010000214601360121470136007EFE09D2190140\\n:00000001FF\" → one 16-byte segment 0x00000100-0x0000010F, binBase64 \"IUYBNgEhRwE2AH7+CdIZAQ==\".",
    inputSchema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["toBin", "toHex"], default: "toBin", description: "toBin: HEX/SREC text → binary. toHex: binary → HEX/SREC text." },
        text: { type: "string", maxLength: MAX_TEXT, description: "toBin: Intel HEX (lines start with ':') or S-Record (lines start with 'S') text." },
        contentBase64: base64Prop("toHex: the binary file"),
        baseAddress: { type: "string", pattern: "^(0x|0X)?[0-9A-Fa-f]{1,8}$", default: "08000000", description: "toHex: load address of the first byte, hex." },
        outputFormat: { type: "string", enum: ["ihex", "srec"], default: "ihex", description: "toHex: Intel HEX or Motorola S-Record output." },
        maxOutputBytes: { type: "integer", minimum: 0, maximum: 1048576, default: 65536, description: "toBin: at most this many binary bytes are returned in binBase64." },
        maxOutputLines: { type: "integer", minimum: 1, maximum: 200000, default: 5000, description: "toHex: at most this many output lines are returned." },
      },
      additionalProperties: false,
    },
    run: (input) => {
      if (str(input, "direction") === "toBin") {
        if (input.contentBase64 !== undefined) throw new ToolInputError("contentBase64 is for direction toHex; give text for toBin");
        const trimmed = str(input, "text").trim();
        if (trimmed === "") throw new ToolInputError("text is required for direction toBin");
        const r = trimmed.startsWith(":") ? parseIntelHex(trimmed) : parseSrec(trimmed);
        if (!r.ok) throw new ToolInputError(`Line ${r.line}: ${r.error}`);
        const img = r.image;
        const bin = segmentsToBin(img.segments);
        const max = Number(input.maxOutputBytes);
        return {
          format: img.format === "ihex" ? "Intel HEX" : "S-Record",
          segments: img.segments.map((s) => ({ start: hex(s.address, 8), end: hex(s.address + s.data.length - 1, 8), bytes: s.data.length })),
          baseAddress: hex(bin.base, 8),
          startAddress: img.startAddress === null ? null : hex(img.startAddress, 8),
          gapFill: "0xFF",
          binLength: bin.data.length,
          binBase64: toBase64(bin.data.subarray(0, max)),
          truncated: bin.data.length > max,
        };
      }
      if (input.text !== undefined) throw new ToolInputError("text is for direction toBin; give contentBase64 for toHex");
      if (input.contentBase64 === undefined) throw new ToolInputError("contentBase64 is required for direction toHex");
      const data = readBase64(input.contentBase64);
      const base = parseInt(str(input, "baseAddress").replace(/^0x/i, ""), 16);
      const kind = str(input, "outputFormat");
      const segments = [{ address: base, data }];
      const out = kind === "ihex" ? toIntelHex(segments) : toSrec(segments);
      const lines = out.split("\n").filter((l) => l !== "");
      const max = Number(input.maxOutputLines);
      return {
        format: kind === "ihex" ? "Intel HEX" : "S-Record",
        baseAddress: hex(base, 8),
        inputBytes: data.length,
        lineCount: lines.length,
        text: lines.slice(0, max).join("\n") + "\n",
        truncated: lines.length > max,
      };
    },
    examples: [
      { text: IHEX_SAMPLE },
      { text: ":020000040800F2\n:04000000DEADBEEFC4\n:0400100001020304E2\n:0400000508000101ED\n:00000001FF" },
      { text: "S0050000544264\nS106200011223373\nS9032000DC", maxOutputBytes: 2 },
      { direction: "toHex", contentBase64: "3q2+7w==" },
      { direction: "toHex", contentBase64: "AAECAwQFBgcICQoLDA0ODxAREhM=", baseAddress: "0x1000", outputFormat: "srec" },
    ],
  },
  {
    name: "file.tdms_to_csv",
    slug: "tdms-to-csv",
    category: "file-tools",
    title: "TDMS to CSV",
    description: "Convert an NI TDMS file's channels to CSV, one column per channel headed \"group/channel\", with rows padded where channel lengths differ and capped at maxRows. Example: a TDMS with channel DAQ/ch1 = [1, 2, 3] and DAQ/ch2 = [-1, -2, -3] → \"DAQ/ch1,DAQ/ch2\\n1,-1\\n2,-2\\n3,-3\\n\".",
    inputSchema: {
      type: "object",
      properties: {
        contentBase64: base64Prop("The .tdms file"),
        channels: {
          type: "array",
          maxItems: 1000,
          items: { type: "string", maxLength: 1000 },
          description: "Channels to include, as \"group/channel\" or a TDMS path like \"/'group'/'channel'\". Omit for every channel, in file order.",
        },
        maxRows: { type: "integer", minimum: 0, maximum: 100000, default: 1000, description: "At most this many data rows (after the header) are returned." },
      },
      required: ["contentBase64"],
      additionalProperties: false,
    },
    run: (input) => {
      const file = parseTdms(readBase64(input.contentBase64));
      const all = file.groups.flatMap((g) => g.channels);
      let chosen = all;
      if (input.channels !== undefined) {
        const want = input.channels as string[];
        chosen = want.map((w) => {
          const c = all.find((x) => x.path === w || `${x.group}/${x.name}` === w);
          if (!c) throw new ToolInputError(`No channel "${w}" in the file; it has ${all.map((x) => `${x.group}/${x.name}`).join(", ") || "no channels"}`);
          return c;
        });
      }
      if (chosen.length === 0) throw new ToolInputError("The file has no channels to convert");
      const lines = tdmsToCsv(chosen).split("\n");
      lines.pop(); // trailing newline
      const rows = lines.length - 1;
      const max = Number(input.maxRows);
      return {
        groups: file.groups.length,
        channelsInFile: all.length,
        totalSamples: all.reduce((n, c) => n + c.data.length, 0),
        selected: chosen.map((c) => ({ path: c.path, group: c.group, name: c.name, dtype: tdmsTypeName(c.dtype), samples: c.data.length })),
        rowCount: rows,
        csv: lines.slice(0, max + 1).join("\n") + "\n",
        truncated: rows > max,
      };
    },
    examples: [
      { contentBase64: TDMS_TWO },
      { contentBase64: TDMS_ONE },
      { contentBase64: TDMS_GROUPS },
      { contentBase64: TDMS_GROUPS, channels: ["B/y"] },
      { contentBase64: TDMS_RAMP, maxRows: 5 },
      { contentBase64: TDMS_TWO, channels: ["/'DAQ'/'ch2'", "DAQ/ch1"] },
    ],
  },
  {
    name: "file.tdms_inspect",
    slug: "tdms-viewer",
    category: "file-tools",
    title: "TDMS viewer",
    description: "List an NI TDMS file's properties, groups and channels with each channel's data type, sample count, properties and first 10 samples. Example: a TDMS with group DAQ, channels ch1 (unit V) and ch2 of 3 f64 samples each → 1 group, 2 channels, ch1 properties {unit: \"V\"} and firstSamples [1, 2, 3].",
    inputSchema: {
      type: "object",
      properties: {
        contentBase64: base64Prop("The .tdms file"),
      },
      required: ["contentBase64"],
      additionalProperties: false,
    },
    run: (input) => {
      const file = parseTdms(readBase64(input.contentBase64));
      const all = file.groups.flatMap((g) => g.channels);
      return {
        properties: propsJson(file.properties),
        groupCount: file.groups.length,
        channelCount: all.length,
        totalSamples: all.reduce((n, c) => n + c.data.length, 0),
        groups: file.groups.map((g) => ({
          name: g.name,
          path: g.path,
          properties: propsJson(g.properties),
          channels: g.channels.map((c) => ({
            name: c.name,
            path: c.path,
            dtype: tdmsTypeName(c.dtype),
            samples: c.data.length,
            properties: propsJson(c.properties),
            firstSamples: c.data.slice(0, 10).map((v) => fin(Number(v.toPrecision(7)))),
            more: c.data.length > 10,
          })),
        })),
      };
    },
    examples: [
      { contentBase64: TDMS_TWO },
      { contentBase64: TDMS_ONE },
      { contentBase64: TDMS_GROUPS },
      { contentBase64: TDMS_EMPTY },
      { contentBase64: TDMS_RAMP },
    ],
  },
];

export const AVIONICS_TOOLS: ToolDef[] = [...ARINC_TOOLS, ...MIL1553_TOOLS, ...FILE_TOOLS];
