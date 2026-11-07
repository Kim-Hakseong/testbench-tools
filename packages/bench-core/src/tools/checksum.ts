import {
  CRC_PRESETS,
  buildNmea,
  bytesToHex,
  checksumHex,
  crc,
  crcBytes,
  getPreset,
  identifyFromCatalog,
  parseNmea,
  type CrcParams,
} from "@testbench/engine";
import { ToolInputError, dataProp, encodingProp, hex, readData, str, type ToolDef } from "../define";

/** What the CRC result cards on every CRC page show. */
function crcResult(name: string, p: CrcParams, bytes: Uint8Array) {
  const value = crc(bytes, p);
  const digits = Math.ceil(p.width / 4);
  const b = crcBytes(value, p.width);
  return {
    algorithm: name,
    byteCount: bytes.length,
    crc: hex(value, digits),
    decimal: value,
    bytesLittleEndian: bytesToHex(b.le),
    bytesBigEndian: bytesToHex(b.be),
  };
}

function presetTool(o: {
  name: string;
  slug: string;
  title: string;
  description: string;
  variants: string[];
  examples: Record<string, unknown>[];
}): ToolDef {
  const properties: ToolDef["inputSchema"]["properties"] = { data: dataProp, encoding: encodingProp };
  if (o.variants.length > 1) {
    properties.variant = { type: "string", enum: o.variants, default: o.variants[0], description: "CRC variant." };
  }
  return {
    name: o.name,
    slug: o.slug,
    category: "checksum-crc",
    title: o.title,
    description: o.description,
    inputSchema: { type: "object", properties, required: ["data"], additionalProperties: false },
    run: (input) => {
      const variant = o.variants.length > 1 ? str(input, "variant") : o.variants[0]!;
      return crcResult(variant, getPreset(variant), readData(input.data, input.encoding));
    },
    examples: o.examples,
  };
}

const hexOrNumber = (text: string): number | null => {
  const t = text.trim();
  if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t.slice(2), 16) >>> 0;
  if (/^[0-9a-f]+$/i.test(t) && /[a-f]/i.test(t)) return parseInt(t, 16) >>> 0;
  if (/^\d+$/.test(t)) return Number(t) >>> 0;
  return null;
};

export const CHECKSUM_TOOLS: ToolDef[] = [
  presetTool({
    name: "crc.modbus16",
    slug: "crc-16-modbus",
    title: "CRC-16/MODBUS",
    description: "Compute the CRC-16/MODBUS of hex or ASCII bytes, with the two CRC bytes in Modbus RTU transmit order (low byte first). Example: data \"01 03 00 00 00 0A\" → 0xCDC5, sent as C5 CD.",
    variants: ["CRC-16/MODBUS"],
    examples: [
      { data: "01 03 00 00 00 0A" },
      { data: "123456789", encoding: "ascii" },
      { data: "11 03 00 6B 00 03" },
      { data: "" },
      { data: "0x01,0x06,0x00,0x01,0x00,0x03" },
    ],
  }),
  presetTool({
    name: "crc.ccitt16",
    slug: "crc-16-ccitt",
    title: "CRC-16 CCITT family",
    description: "Compute a CRC-16 from the CCITT family (polynomial 0x1021): CCITT-FALSE, XMODEM, KERMIT or IBM-SDLC. Example: data \"123456789\" as ASCII with variant CRC-16/CCITT-FALSE → 0x29B1.",
    variants: ["CRC-16/CCITT-FALSE", "CRC-16/XMODEM", "CRC-16/KERMIT", "CRC-16/IBM-SDLC"],
    examples: [
      { data: "123456789", encoding: "ascii" },
      { data: "123456789", encoding: "ascii", variant: "CRC-16/XMODEM" },
      { data: "123456789", encoding: "ascii", variant: "CRC-16/KERMIT" },
      { data: "123456789", encoding: "ascii", variant: "CRC-16/IBM-SDLC" },
      { data: "7E 10 34 12 FE" },
    ],
  }),
  presetTool({
    name: "crc.crc32",
    slug: "crc-32",
    title: "CRC-32",
    description: "Compute the standard CRC-32 (ISO-HDLC, as used by zip, Ethernet and PNG) of hex or ASCII bytes. Example: data \"123456789\" as ASCII → 0xCBF43926.",
    variants: ["CRC-32"],
    examples: [
      { data: "123456789", encoding: "ascii" },
      { data: "" },
      { data: "00" },
      { data: "FF FF FF FF" },
      { data: "The quick brown fox jumps over the lazy dog", encoding: "ascii" },
    ],
  }),
  presetTool({
    name: "crc.crc8",
    slug: "crc-8",
    title: "CRC-8",
    description: "Compute a CRC-8 (CRC-8 with polynomial 0x07, or CRC-8/MAXIM for 1-Wire). Example: data \"123456789\" as ASCII → 0xF4 (CRC-8) or 0xA1 (CRC-8/MAXIM).",
    variants: ["CRC-8", "CRC-8/MAXIM"],
    examples: [
      { data: "123456789", encoding: "ascii" },
      { data: "123456789", encoding: "ascii", variant: "CRC-8/MAXIM" },
      { data: "80 00 80" },
      { data: "02 1C B8 01 00 00 00", variant: "CRC-8/MAXIM" },
      { data: "" },
    ],
  }),
  {
    name: "crc.custom",
    slug: "custom-crc",
    category: "checksum-crc",
    title: "Custom CRC",
    description: "Compute a fully parameterised CRC (Rocksoft/RevEng model: width, poly, init, refin, refout, xorout). Example: width 16, poly 0x1021, init 0xFFFF, refin false, refout false, xorout 0 over ASCII \"123456789\" → 0x29B1.",
    inputSchema: {
      type: "object",
      properties: {
        data: dataProp,
        encoding: encodingProp,
        width: { type: "integer", minimum: 1, maximum: 32, description: "CRC width in bits (1–32)." },
        poly: { type: "string", pattern: "^(0x)?[0-9A-Fa-f]{1,8}$", description: "Polynomial in hex, normal (non-reflected) form, e.g. \"0x1021\"." },
        init: { type: "string", pattern: "^(0x)?[0-9A-Fa-f]{1,8}$", default: "0", description: "Initial register value in hex." },
        refin: { type: "boolean", default: false, description: "Reflect each input byte." },
        refout: { type: "boolean", default: false, description: "Reflect the final register." },
        xorout: { type: "string", pattern: "^(0x)?[0-9A-Fa-f]{1,8}$", default: "0", description: "Value XORed into the result, in hex." },
      },
      required: ["data", "width", "poly"],
      additionalProperties: false,
    },
    run: (input) => {
      const h = (k: string) => parseInt(str(input, k).replace(/^0x/i, ""), 16) >>> 0;
      const p: CrcParams = {
        width: Number(input.width),
        poly: h("poly"),
        init: h("init"),
        refin: Boolean(input.refin),
        refout: Boolean(input.refout),
        xorout: h("xorout"),
      };
      const match = CRC_PRESETS.find((x) =>
        x.width === p.width && x.poly === p.poly && x.init === p.init && x.refin === p.refin && x.refout === p.refout && x.xorout === p.xorout);
      return { ...crcResult(match?.name ?? "custom", p, readData(input.data, input.encoding)), matchesPreset: match?.name ?? null };
    },
    examples: [
      { data: "123456789", encoding: "ascii", width: 16, poly: "0x1021", init: "0xFFFF" },
      { data: "123456789", encoding: "ascii", width: 16, poly: "0x8005", init: "0xFFFF", refin: true, refout: true },
      { data: "123456789", encoding: "ascii", width: 5, poly: "0x15" },
      { data: "123456789", encoding: "ascii", width: 32, poly: "04C11DB7", init: "FFFFFFFF", refin: true, refout: true, xorout: "FFFFFFFF" },
      { data: "01 02 03", width: 12, poly: "0x80F", init: "0" },
    ],
  },
  {
    name: "crc.identify",
    slug: "crc-identifier",
    category: "checksum-crc",
    title: "CRC identifier",
    description: "Find which catalogue CRC algorithm produced a checksum, from one or more (data, checksum) samples; only algorithms that match every sample are returned. Example: samples [{data: \"123456789\", checksum: \"0x29B1\"}] with encoding ascii → CRC-16/CCITT-FALSE.",
    inputSchema: {
      type: "object",
      properties: {
        samples: {
          type: "array",
          minItems: 1,
          maxItems: 16,
          description: "Data and the checksum observed with it. More samples narrow the answer.",
          items: {
            type: "object",
            properties: {
              data: dataProp,
              checksum: { type: "string", description: "Observed checksum, hex (\"0x29B1\", \"29B1\") or decimal." },
            },
            required: ["data", "checksum"],
            additionalProperties: false,
          },
        },
        encoding: encodingProp,
      },
      required: ["samples"],
      additionalProperties: false,
    },
    run: (input) => {
      const samples = (input.samples as { data: string; checksum: string }[]).map((s, i) => {
        const checksum = hexOrNumber(s.checksum);
        if (checksum === null) throw new ToolInputError(`samples[${i}].checksum is not a number`);
        const data = readData(s.data, input.encoding);
        if (data.length === 0) throw new ToolInputError(`samples[${i}].data is empty`);
        return { data, checksum };
      });
      const matches = identifyFromCatalog(samples);
      return {
        samples: samples.length,
        matches: matches.map((p) => ({
          name: p.name, width: p.width, poly: hex(p.poly, Math.ceil(p.width / 4)), init: hex(p.init, Math.ceil(p.width / 4)),
          refin: p.refin, refout: p.refout, xorout: hex(p.xorout, Math.ceil(p.width / 4)),
        })),
        note: matches.length === 0 ? "No catalogue CRC matches all samples; the site page can also run an exhaustive parameter search." : undefined,
      };
    },
    examples: [
      { samples: [{ data: "123456789", checksum: "0x29B1" }], encoding: "ascii" },
      { samples: [{ data: "123456789", checksum: "0xCBF43926" }], encoding: "ascii" },
      { samples: [{ data: "01 03 00 00 00 0A", checksum: "0xCDC5" }] },
      { samples: [{ data: "123456789", checksum: "0x31C3" }, { data: "A", checksum: "0x58E5" }], encoding: "ascii" },
      { samples: [{ data: "01 02", checksum: "1234" }] },
    ],
  },
  {
    name: "nmea.checksum",
    slug: "nmea-checksum",
    category: "checksum-crc",
    title: "NMEA 0183 checksum",
    description: "Verify or compute the NMEA 0183 checksum (XOR of every character between $ and *). Example: sentence \"$GPGGA,023000.00,3733.9900,N,12658.6800,E,1,08,0.9,38.0,M,,M,,*4B\" → checksum OK, 0x4B.",
    inputSchema: {
      type: "object",
      properties: {
        sentence: { type: "string", maxLength: 1000, description: "A sentence with or without the leading $ and the *HH checksum." },
      },
      required: ["sentence"],
      additionalProperties: false,
    },
    run: (input) => {
      const s = str(input, "sentence").trim();
      const parsed = parseNmea(s.startsWith("$") || s.startsWith("!") ? s : "$" + s);
      if (!parsed.ok) throw new ToolInputError(parsed.error);
      const { sentence } = parsed;
      return {
        status: sentence.valid === null ? "no checksum in input" : sentence.valid ? "VALID" : "FAIL",
        computed: "0x" + checksumHex(sentence.computed),
        received: sentence.received === null ? null : "0x" + checksumHex(sentence.received),
        completeSentence: buildNmea(sentence.address + (sentence.fields.length ? "," + sentence.fields.join(",") : "")),
        talker: sentence.talker,
        type: sentence.type,
      };
    },
    examples: [
      { sentence: "$GPGGA,023000.00,3733.9900,N,12658.6800,E,1,08,0.9,38.0,M,,M,,*4B" },
      { sentence: "$GPGGA,023000.00,3733.9900,N,12658.6800,E,1,08,0.9,38.0,M,,M,,*6A" },
      { sentence: "GPRMC,023000.00,A,3733.9900,N,12658.6800,E,12.5,084.4,051026,,,A" },
      { sentence: "$PMTK220,1000*1F" },
      { sentence: "$GPRMC,023000.00,A,3733.9900,N,12658.6800,E,12.5,084.4,051026,,,A*63" },
    ],
  },
];
