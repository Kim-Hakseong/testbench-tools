// PLC & industrial tools: one ToolDef per site page under the "plc-industrial"
// category. Each run() mirrors the page component's glue in
// apps/web/components/tool/ — same engine calls, same input parsing, same
// derived values its result cards show — and returns plain JSON.

import {
  ANALOG_PRESETS,
  AB_TYPE_NAME,
  ENTITY_LABEL,
  MELSEC_SERIES,
  abDefaultFile,
  abFlatBitIndex,
  absoluteBitIndex,
  allocate,
  applyCal,
  bcdToDecimal,
  buildXgtFrame,
  byteSpan,
  collidingAddresses,
  convertSeries,
  coveredBytes,
  decimalToBcd,
  formatAbAddress,
  formatS7,
  formatXgtAddress,
  invertCal,
  loopBudget,
  modbusAddressViews,
  nextAddresses,
  overlaps,
  parseAbAddress,
  parseDataModelAddress,
  parseMelsecAddress,
  parseS7Address,
  parseXgtAddress,
  parseXgtFrame,
  radixBase,
  scale,
  scaleCurrent,
  twoPointCal,
  widthBytes,
  xgtDataTypeName,
  xgtFlatBitIndex,
  xgtNextBits,
  type LoopStatus,
  type MelsecSeries,
  type ModbusEntity,
  type S7Address,
  type S7Width,
  type XgtBuildInput,
  type XgtRequestCommand,
} from "@testbench/engine";
import { ToolInputError, hex, num, str, type ToolDef } from "../define";

const CATEGORY = "plc-industrial" as const;

// ---------------------------------------------------------------------------
// 4-20 mA scaling — FourTwentyTool.tsx
// ---------------------------------------------------------------------------

const LOOP_STATUS_TEXT: Record<LoopStatus, string> = {
  "open-loop": "OPEN LOOP — check wiring / transmitter",
  "under-range": "Under-range (3.8–4 mA)",
  ok: "In range",
  "over-range": "Over-range (> 20.5 mA)",
};

const fourTwenty: ToolDef = {
  name: "plc.scale_4_20ma",
  slug: "4-20ma-scaling",
  category: CATEGORY,
  title: "4-20 mA scaling",
  description:
    "Convert a 4-20 mA loop current to a process value on a linear range (with open-loop / under-range / over-range judgement), or a process value back to mA. Example: value 12 mA with range 0…200 → 100, 50 % of span, status ok.",
  inputSchema: {
    type: "object",
    properties: {
      direction: { type: "string", enum: ["toPv", "toMa"], default: "toPv", description: "\"toPv\": loop current (mA) → process value; \"toMa\": process value → loop current." },
      value: { type: "number", description: "Loop current in mA when direction is toPv, otherwise the process value." },
      rangeLow: { type: "number", default: 0, description: "Process value at 4 mA." },
      rangeHigh: { type: "number", default: 200, description: "Process value at 20 mA." },
      unit: { type: "string", default: "°C", maxLength: 40, description: "Unit label of the process value (echoed back only)." },
    },
    required: ["value"],
    additionalProperties: false,
  },
  run: (input) => {
    const lo = num(input, "rangeLow");
    const hi = num(input, "rangeHigh");
    const v = num(input, "value");
    if (hi === lo) throw new ToolInputError("rangeLow and rangeHigh must differ");
    const unit = str(input, "unit");
    if (input.direction === "toPv") {
      const r = scaleCurrent(v, lo, hi);
      return { direction: "toPv", mA: v, processValue: r.value, unit, percentOfSpan: r.percentOfSpan, status: r.status, statusText: LOOP_STATUS_TEXT[r.status] };
    }
    return { direction: "toMa", processValue: v, unit, mA: scale(v, lo, hi, 4, 20), percentOfSpan: scale(v, lo, hi, 0, 100) };
  },
  examples: [
    { value: 12 },
    { value: 3.5, rangeLow: 0, rangeHigh: 10, unit: "bar" },
    { direction: "toMa", value: 150 },
    { value: 20.8, rangeLow: -50, rangeHigh: 150 },
    { direction: "toMa", value: 25, rangeLow: 0, rangeHigh: 100, unit: "%" },
  ],
};

// ---------------------------------------------------------------------------
// PLC analog scaling — PlcScalingTool.tsx
// ---------------------------------------------------------------------------

const PRESET_IDS = ANALOG_PRESETS.map((p) => p.id);

const analogScaling: ToolDef = {
  name: "plc.analog_scaling",
  slug: "plc-analog-scaling",
  category: CATEGORY,
  title: "PLC analog scaling",
  description:
    "Scale a PLC analog-module raw count to engineering units or back, using a vendor module preset (Siemens, Mitsubishi, Allen-Bradley raw ranges) or a custom raw range. Example: preset s7 (0…27648), engineering 0…100, raw 13824 → 50.",
  inputSchema: {
    type: "object",
    properties: {
      preset: { type: "string", enum: [...PRESET_IDS, "custom"], default: "s7", description: "Analog module raw-range preset id, or \"custom\" to give rawMin/rawMax yourself." },
      direction: { type: "string", enum: ["toEng", "toRaw"], default: "toEng", description: "\"toEng\": raw count → engineering value; \"toRaw\": engineering value → raw count (rounded)." },
      value: { type: "number", description: "Raw count (toEng) or engineering value (toRaw)." },
      rawMin: { type: "number", description: "Raw count at the low end. Only with preset \"custom\"." },
      rawMax: { type: "number", description: "Raw count at the high end. Only with preset \"custom\"." },
      engMin: { type: "number", default: 0, description: "Engineering value at rawMin." },
      engMax: { type: "number", default: 100, description: "Engineering value at rawMax." },
    },
    required: ["value"],
    additionalProperties: false,
  },
  run: (input) => {
    const id = str(input, "preset");
    const preset = ANALOG_PRESETS.find((p) => p.id === id);
    let rawMin: number;
    let rawMax: number;
    if (preset) {
      if (input.rawMin !== undefined || input.rawMax !== undefined) {
        throw new ToolInputError(`rawMin/rawMax come from preset "${id}"; use preset "custom" to set them`);
      }
      rawMin = preset.rawMin;
      rawMax = preset.rawMax;
    } else {
      if (input.rawMin === undefined || input.rawMax === undefined) {
        throw new ToolInputError("preset \"custom\" needs rawMin and rawMax");
      }
      rawMin = num(input, "rawMin");
      rawMax = num(input, "rawMax");
    }
    const engMin = num(input, "engMin");
    const engMax = num(input, "engMax");
    const v = num(input, "value");
    if (rawMax === rawMin) throw new ToolInputError("rawMin and rawMax must differ");
    if (engMax === engMin) throw new ToolInputError("engMin and engMax must differ");
    const toEng = input.direction === "toEng";
    const result = toEng ? scale(v, rawMin, rawMax, engMin, engMax) : Math.round(scale(v, engMin, engMax, rawMin, rawMax));
    const [inLo, inHi] = toEng ? [rawMin, rawMax] : [engMin, engMax];
    return {
      preset: preset ? preset.id : "custom",
      presetLabel: preset ? preset.label : null,
      module: preset ? preset.module : null,
      rawMin, rawMax, engMin, engMax,
      direction: toEng ? "toEng" : "toRaw",
      input: v,
      ...(toEng ? { engineeringValue: result } : { rawValue: result }),
      percentOfSpan: scale(v, inLo, inHi, 0, 100),
      outOfRange: v < Math.min(inLo, inHi) || v > Math.max(inLo, inHi),
      note: preset?.note ?? null,
      source: preset ? preset.source : null,
    };
  },
  examples: [
    { value: 13824 },
    { preset: "s7", direction: "toRaw", value: 75 },
    { preset: "slc-ni4-4-20ma", value: 9830.5, engMin: 4, engMax: 20 },
    { preset: "custom", rawMin: 0, rawMax: 4095, value: 2048, engMin: 0, engMax: 10 },
    { preset: "q64ad-high-0-10v", value: 17000, engMin: 0, engMax: 10 },
  ],
};

// ---------------------------------------------------------------------------
// Signal converter — SignalConverterTool.tsx (the page's conventional spans)
// ---------------------------------------------------------------------------

const SIGNAL_RANGES = [
  { id: "4-20ma", label: "4–20 mA", lo: 4, hi: 20, unit: "mA" },
  { id: "0-20ma", label: "0–20 mA", lo: 0, hi: 20, unit: "mA" },
  { id: "1-5v", label: "1–5 V", lo: 1, hi: 5, unit: "V" },
  { id: "0-5v", label: "0–5 V", lo: 0, hi: 5, unit: "V" },
  { id: "0-10v", label: "0–10 V", lo: 0, hi: 10, unit: "V" },
  { id: "3-15psi", label: "3–15 psi", lo: 3, hi: 15, unit: "psi" },
] as const;
const SIGNAL_IDS = SIGNAL_RANGES.map((r) => r.id as string);

const signalConvert: ToolDef = {
  name: "plc.signal_convert",
  slug: "signal-converter",
  category: CATEGORY,
  title: "Instrument signal converter",
  description:
    "Convert a value between standard instrumentation signal spans (4–20 mA, 0–20 mA, 1–5 V, 0–5 V, 0–10 V, 3–15 psi) by linear mapping. Example: 12 mA from 4-20ma to 1-5v → 3 V, 50 % of span.",
  inputSchema: {
    type: "object",
    properties: {
      from: { type: "string", enum: SIGNAL_IDS, default: "4-20ma", description: "Signal span the value is in." },
      to: { type: "string", enum: SIGNAL_IDS, default: "1-5v", description: "Signal span to convert to." },
      value: { type: "number", description: "Value in the units of `from`." },
    },
    required: ["value"],
    additionalProperties: false,
  },
  run: (input) => {
    const from = SIGNAL_RANGES.find((r) => r.id === input.from)!;
    const to = SIGNAL_RANGES.find((r) => r.id === input.to)!;
    const v = num(input, "value");
    return {
      from: from.id,
      to: to.id,
      value: v,
      fromUnit: from.unit,
      converted: scale(v, from.lo, from.hi, to.lo, to.hi),
      toUnit: to.unit,
      percentOfSpan: scale(v, from.lo, from.hi, 0, 100),
      outsideSpan: v < from.lo || v > from.hi,
      spanMapping: `${from.label} → ${to.label}`,
    };
  },
  examples: [
    { value: 12 },
    { from: "0-10v", to: "4-20ma", value: 7.5 },
    { from: "3-15psi", to: "4-20ma", value: 9 },
    { from: "4-20ma", to: "0-10v", value: 2 },
    { from: "1-5v", to: "0-20ma", value: 5 },
  ],
};

// ---------------------------------------------------------------------------
// Two-point calibration — TwoPointCalTool.tsx
// ---------------------------------------------------------------------------

const twoPoint: ToolDef = {
  name: "plc.two_point_cal",
  slug: "two-point-calibration",
  category: CATEGORY,
  title: "Two-point calibration",
  description:
    "Derive the slope (gain) and offset of a linear calibration from two reference points, optionally applying it to a value in both directions. Example: (4, 0) and (20, 200) → slope 12.5, offset −50, so x = 12 gives y = 100.",
  inputSchema: {
    type: "object",
    properties: {
      x1: { type: "number", description: "First reference input." },
      y1: { type: "number", description: "Output at x1." },
      x2: { type: "number", description: "Second reference input (must differ from x1)." },
      y2: { type: "number", description: "Output at x2." },
      value: { type: "number", description: "Optional: evaluate y at x = value, and x at y = value." },
    },
    required: ["x1", "y1", "x2", "y2"],
    additionalProperties: false,
  },
  run: (input) => {
    const cal = twoPointCal(num(input, "x1"), num(input, "y1"), num(input, "x2"), num(input, "y2"));
    if (!cal) throw new ToolInputError("x1 and x2 must differ");
    const v = input.value === undefined ? null : num(input, "value");
    return {
      slope: cal.slope,
      offset: cal.offset,
      equation: `y = ${cal.slope.toPrecision(6)}·x ${cal.offset >= 0 ? "+" : "−"} ${Math.abs(cal.offset).toPrecision(6)}`,
      value: v,
      yAtValue: v === null ? null : applyCal(cal, v),
      xAtValue: v === null ? null : invertCal(cal, v),
    };
  },
  examples: [
    { x1: 4, y1: 0, x2: 20, y2: 200, value: 12 },
    { x1: 0, y1: 0, x2: 27648, y2: 100 },
    { x1: 0.5, y1: 0, x2: 4.5, y2: 1000, value: 2.5 },
    { x1: 1, y1: 5, x2: 3, y2: 5, value: 5 },
    { x1: 100, y1: 98.7, x2: 0, y2: 0.4, value: 50 },
  ],
};

// ---------------------------------------------------------------------------
// Loop burden — LoopBurdenTool.tsx
// ---------------------------------------------------------------------------

const loopBurden: ToolDef = {
  name: "plc.loop_burden",
  slug: "loop-burden",
  category: CATEGORY,
  title: "4-20 mA loop burden",
  description:
    "Check a 4-20 mA loop voltage budget at 20 mA full scale: supply minus the drop across sense resistor, wiring and other series burden must cover the transmitter's minimum voltage. Example: 24 V supply, 12 V transmitter minimum, 250 Ω + 50 Ω → 18 V at the transmitter, 6 V margin, max 600 Ω.",
  inputSchema: {
    type: "object",
    properties: {
      supply: { type: "number", default: 24, description: "Loop supply voltage (V)." },
      minTransmitterV: { type: "number", default: 12, description: "Transmitter minimum operating (lift-off) voltage from its datasheet (V)." },
      senseResistor: { type: "number", default: 250, description: "Sense / input resistor (Ω)." },
      wireResistance: { type: "number", default: 50, description: "Total wire resistance, both conductors (Ω)." },
      otherResistance: { type: "number", default: 0, description: "Other series drops expressed as resistance — barriers, indicators (Ω)." },
    },
    required: [],
    additionalProperties: false,
  },
  run: (input) => {
    const totalR = num(input, "senseResistor") + num(input, "wireResistance") + num(input, "otherResistance");
    const r = loopBudget({ supply: num(input, "supply"), minTransmitterV: num(input, "minTransmitterV"), loopResistance: totalR });
    return {
      ok: r.ok,
      status: r.ok ? `OK — ${r.margin.toFixed(2)} V margin at full scale` : `INSUFFICIENT — ${(-r.margin).toFixed(2)} V short at full scale`,
      currentMa: 20,
      loopResistance: totalR,
      vDrop: r.vDrop,
      vAtTransmitter: r.vAtTransmitter,
      margin: r.margin,
      maxResistance: r.maxResistance,
    };
  },
  examples: [
    {},
    { supply: 24, minTransmitterV: 12, senseResistor: 250, wireResistance: 50 },
    { supply: 24, minTransmitterV: 15, senseResistor: 250, wireResistance: 100, otherResistance: 300 },
    { supply: 12, minTransmitterV: 9, senseResistor: 100, wireResistance: 10 },
    { supply: 30, minTransmitterV: 10.5, senseResistor: 250, wireResistance: 25, otherResistance: 340 },
  ],
};

// ---------------------------------------------------------------------------
// BCD — BcdTool.tsx
// ---------------------------------------------------------------------------

const bcd: ToolDef = {
  name: "plc.bcd",
  slug: "bcd-converter",
  category: CATEGORY,
  title: "BCD converter",
  description:
    "Convert a packed BCD word (hex, up to 8 nibbles) to decimal, or a decimal integer (0–99999999) to packed BCD, rejecting nibbles A–F. Example: BCD 0x1234 → 1234; decimal 5678 → 0x5678.",
  inputSchema: {
    type: "object",
    properties: {
      direction: { type: "string", enum: ["toDec", "toBcd"], default: "toDec", description: "\"toDec\": BCD word → decimal; \"toBcd\": decimal → BCD word." },
      value: { type: "string", maxLength: 20, description: "BCD word as hex (\"1234\" or \"0x1234\") for toDec, or a decimal integer for toBcd." },
    },
    required: ["value"],
    additionalProperties: false,
  },
  run: (input) => {
    if (input.direction === "toDec") {
      const raw = str(input, "value").trim().replace(/^0x/i, "");
      if (!/^[0-9a-fA-F]{1,8}$/.test(raw)) throw new ToolInputError("Enter a hex word, e.g. 1234.");
      const word = parseInt(raw, 16) >>> 0;
      const r = bcdToDecimal(word, raw.length);
      if (!r.ok) {
        throw new ToolInputError(
          `Invalid BCD: nibble ${r.error.nibbleIndex} (from the most significant) is 0x${r.error.nibbleValue.toString(16).toUpperCase()} — BCD nibbles must be 0–9.`,
        );
      }
      return { direction: "toDec", bcd: "0x" + raw.toUpperCase(), decimal: r.value };
    }
    const raw = str(input, "value").trim();
    if (!/^\d{1,8}$/.test(raw)) throw new ToolInputError("Enter a decimal integer (0–99999999).");
    const value = parseInt(raw, 10);
    const word = decimalToBcd(value);
    return {
      direction: "toBcd",
      decimal: value,
      bcd: "0x" + word.toString(16).toUpperCase(),
      binary: word.toString(2).padStart(Math.max(4, raw.length * 4), "0"),
    };
  },
  examples: [
    { value: "1234" },
    { value: "0x0099" },
    { direction: "toBcd", value: "5678" },
    { direction: "toBcd", value: "99999999" },
    { value: "00250001" },
  ],
};

// ---------------------------------------------------------------------------
// Modbus address — ModbusAddressTool.tsx
// ---------------------------------------------------------------------------

const ENTITIES = Object.keys(ENTITY_LABEL) as ModbusEntity[];

const modbusAddress: ToolDef = {
  name: "plc.modbus_address",
  slug: "modbus-address-converter",
  category: CATEGORY,
  title: "Modbus address converter",
  description:
    "Convert between Modbus data-model notation (0xxxx/1xxxx/3xxxx/4xxxx, 5 or 6 digits) and the 0-based protocol address sent on the wire. Example: 40011 → holding register, protocol address 10, 6-digit 400011.",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string", maxLength: 20, description: "Data-model address (\"40011\", \"300001\") or, with notation \"protocol\", a 0-based address 0…65535." },
      notation: { type: "string", enum: ["data-model", "protocol"], default: "data-model", description: "How `address` is written." },
      entity: { type: "string", enum: ENTITIES, default: "holding-register", description: "Entity type for a protocol address (ignored for data-model notation, whose first digit names it)." },
    },
    required: ["address"],
    additionalProperties: false,
  },
  run: (input) => {
    const s = str(input, "address").trim();
    let views;
    if (input.notation === "data-model") {
      views = parseDataModelAddress(s);
      if (!views) throw new ToolInputError("Use 5 or 6 digits starting with 0, 1, 3 or 4.");
    } else {
      views = /^\d{1,5}$/.test(s) ? modbusAddressViews(str(input, "entity") as ModbusEntity, Number(s)) : null;
      if (!views) throw new ToolInputError("Enter an integer 0…65535.");
    }
    return {
      entity: views.entity,
      entityLabel: ENTITY_LABEL[views.entity],
      protocolAddress: views.protocol,
      oneBased: views.oneBased,
      fiveDigit: views.fiveDigit,
      sixDigit: views.sixDigit,
    };
  },
  examples: [
    { address: "40011" },
    { address: "300001" },
    { address: "100005" },
    { address: "9999", notation: "protocol", entity: "coil" },
    { address: "65535", notation: "protocol" },
  ],
};

// ---------------------------------------------------------------------------
// Allen-Bradley SLC 500 address — AbAddressTool.tsx
// ---------------------------------------------------------------------------

const abAddress: ToolDef = {
  name: "plc.ab_slc_address",
  slug: "ab-slc-address-converter",
  category: CATEGORY,
  title: "Allen-Bradley SLC 500 address converter",
  description:
    "Parse an Allen-Bradley SLC 500 / MicroLogix data-table address (N7:2/8, B3/16) or I/O address (I:2.1/3) into file, element, bit and flat bit index. Example: N7:2/8 → integer file 7, element 2, bit 8, bit 40 from file start.",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string", maxLength: 40, description: "SLC address, e.g. \"N7:2/8\", \"B3/16\", \"T4:0.ACC\", \"I:2.1/3\"." },
    },
    required: ["address"],
    additionalProperties: false,
  },
  run: (input) => {
    const parsed = parseAbAddress(str(input, "address"));
    if (!parsed.ok) throw new ToolInputError(parsed.error);
    const a = parsed.address;
    if (a.kind === "data") {
      const flat = abFlatBitIndex(a);
      return {
        canonical: formatAbAddress(a),
        kind: "data",
        fileType: a.type,
        fileTypeName: AB_TYPE_NAME[a.type],
        file: a.file,
        reservedFile: abDefaultFile(a.file) !== null,
        element: a.element,
        bit: a.bit ?? null,
        bitFromStartOfFile: flat,
        bitShorthand: a.bit === undefined ? null : `${a.type}${a.file}/${flat}`,
      };
    }
    return {
      canonical: formatAbAddress(a),
      kind: "io",
      direction: a.type === "I" ? "Input" : "Output",
      slot: a.slot,
      word: a.word,
      bit: a.bit ?? null,
      terminal: a.bit === undefined ? null : a.word * 16 + a.bit,
    };
  },
  examples: [
    { address: "N7:2/8" },
    { address: "B3/16" },
    { address: "I:2.1/3" },
    { address: "F8:10" },
    { address: "O:1/15" },
  ],
};

// ---------------------------------------------------------------------------
// LS ELECTRIC XGT (XGK/XGB) address — XgtAddressTool.tsx
// ---------------------------------------------------------------------------

const xgtAddress: ToolDef = {
  name: "plc.xgt_address",
  slug: "ls-xgt-address-converter",
  category: CATEGORY,
  title: "LS ELECTRIC XGT address converter",
  description:
    "Parse an LS ELECTRIC XGK/XGB device address (bit devices P/M/K/F/L/S with a trailing hex bit, word devices D/R/Z with a dotted hex bit) into word, bit and flat bit index, plus the next consecutive bits. Example: P00105 → I/O relay word 10, bit 5, bit 165 from the start of the area.",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string", maxLength: 40, description: "XGK device address, e.g. \"P00105\", \"M0000F\", \"D0011.A\"." },
    },
    required: ["address"],
    additionalProperties: false,
  },
  run: (input) => {
    const parsed = parseXgtAddress(str(input, "address"));
    if (!parsed.ok) throw new ToolInputError(parsed.error);
    const a = parsed.address;
    return {
      canonical: formatXgtAddress(a),
      device: a.device.symbol,
      deviceName: a.device.name,
      deviceKind: a.device.kind,
      word: a.word,
      bit: a.bit ?? null,
      bitHex: a.bitHex ?? null,
      bitFromStartOfArea: a.bit === undefined ? null : xgtFlatBitIndex(a),
      wordAddress: formatXgtAddress({ device: a.device, word: a.word }),
      nextBits: a.bit === undefined ? [] : xgtNextBits(a, 8),
    };
  },
  examples: [
    { address: "P00105" },
    { address: "M0000F" },
    { address: "D0011.A" },
    { address: "D100" },
    { address: "K0012C" },
  ],
};

// ---------------------------------------------------------------------------
// Mitsubishi MELSEC address — MelsecAddressTool.tsx
// ---------------------------------------------------------------------------

const MELSEC_IDS = MELSEC_SERIES.map((s) => s.id as string);

const melsecAddress: ToolDef = {
  name: "plc.melsec_address",
  slug: "mitsubishi-address-converter",
  category: CATEGORY,
  title: "Mitsubishi MELSEC address converter",
  description:
    "Decode a Mitsubishi MELSEC device address for iQ-F (FX5) or iQ-R, where X/Y are octal on FX5 but hexadecimal on iQ-R, and give the same point on the other series. Example: X20 on fx5 → point 16 (octal), written X10 on iQ-R.",
  inputSchema: {
    type: "object",
    properties: {
      series: { type: "string", enum: MELSEC_IDS, default: "fx5", description: "CPU series: \"fx5\" (MELSEC iQ-F) or \"iq-r\" (MELSEC iQ-R)." },
      address: { type: "string", maxLength: 40, description: "Device address, e.g. \"X20\", \"D100\", \"M50\", \"W1F\"." },
    },
    required: ["address"],
    additionalProperties: false,
  },
  run: (input) => {
    const series = str(input, "series") as MelsecSeries;
    const text = str(input, "address");
    const parsed = parseMelsecAddress(series, text);
    if (!parsed.ok) throw new ToolInputError(parsed.error);
    const a = parsed.address;
    const other: MelsecSeries = series === "fx5" ? "iq-r" : "fx5";
    const otherLabel = MELSEC_SERIES.find((s) => s.id === other)!.label;
    const converted = convertSeries(a, other);
    const elsewhere = parseMelsecAddress(other, text);
    const same = elsewhere.ok ? elsewhere.address : null;
    return {
      series,
      device: a.symbol,
      numberText: a.numberText,
      radix: a.radix,
      base: radixBase(a.radix),
      index: a.index,
      binary: a.index.toString(2),
      otherSeries: other,
      sameOnOtherSeries: converted.ok ? converted.text : null,
      warning: same && same.index !== a.index
        ? `"${a.symbol}${a.numberText}" is also valid on ${otherLabel}, but there it means point ${same.index}, not ${a.index}.`
        : null,
      next: nextAddresses(a, 8),
    };
  },
  examples: [
    { address: "X20" },
    { series: "iq-r", address: "X20" },
    { address: "D100" },
    { series: "iq-r", address: "W1F" },
    { address: "Y17" },
  ],
};

// ---------------------------------------------------------------------------
// Siemens S7 address — S7AddressTool.tsx
// ---------------------------------------------------------------------------

const S7_AREA_LABEL: Record<string, string> = {
  I: "Input (%I / %E)",
  Q: "Output (%Q / %A)",
  M: "Bit memory (%M)",
  DB: "Data block",
};
const S7_WIDTH_LABEL: Record<S7Width, string> = {
  X: "Bit",
  B: "Byte (8 bit)",
  W: "Word (16 bit)",
  D: "Double word (32 bit)",
};

function s7Covers(address: S7Address): string {
  const span = byteSpan(address);
  const area = address.area === "DB" ? `DB${address.dbNumber}` : `%${address.area}`;
  if (address.width === "X") return `bit ${address.bitOffset} of byte ${address.byteOffset} in ${area}`;
  return span.first === span.last ? `byte ${span.first} in ${area}` : `bytes ${span.first}–${span.last} in ${area}`;
}

const s7Address: ToolDef = {
  name: "plc.s7_address",
  slug: "s7-address-converter",
  category: CATEGORY,
  title: "Siemens S7 address converter",
  description:
    "Parse a Siemens S7 address (%MW100, %M10.3, DB1.DBW20, German E/A accepted) into area, width and covered bytes, check overlap with a second address, and lay out non-overlapping successors. Example: %MW100 → bytes 100–101, overlaps %MW101, next words %MW100 %MW102 %MW104 %MW106.",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string", maxLength: 40, description: "S7 address, e.g. \"%MW100\", \"%M10.3\", \"DB1.DBW20\"." },
      compareWith: { type: "string", maxLength: 40, description: "Optional second address to check for shared storage." },
      count: { type: "integer", minimum: 1, maximum: 32, default: 4, description: "How many non-overlapping addresses of the same width to lay out from `address`." },
    },
    required: ["address"],
    additionalProperties: false,
  },
  run: (input) => {
    const parsed = parseS7Address(str(input, "address"));
    if (!parsed.ok) throw new ToolInputError(parsed.error);
    const a = parsed.address;
    let overlap: { with: string; overlaps: boolean } | null = null;
    if (input.compareWith !== undefined) {
      const other = parseS7Address(str(input, "compareWith"));
      if (!other.ok) throw new ToolInputError(`compareWith: ${other.error}`);
      overlap = { with: formatS7(other.address), overlaps: overlaps(a, other.address) };
    }
    return {
      canonical: formatS7(a),
      area: a.area,
      areaLabel: S7_AREA_LABEL[a.area] ?? a.area,
      dbNumber: a.dbNumber ?? null,
      width: a.width,
      widthLabel: S7_WIDTH_LABEL[a.width],
      widthBytes: widthBytes(a.width),
      byteOffset: a.byteOffset,
      bitOffset: a.bitOffset ?? null,
      covers: s7Covers(a),
      bitIndex: absoluteBitIndex(a),
      bytesUsed: coveredBytes(a),
      overlap,
      layout: allocate(a.area, a.width, a.byteOffset, num(input, "count"), a.dbNumber).map(formatS7),
      blocks: a.width === "X" ? [] : collidingAddresses(a, a.width).map(formatS7),
    };
  },
  examples: [
    { address: "%MW100", compareWith: "%MW101" },
    { address: "%M10.3" },
    { address: "DB1.DBD20", compareWith: "DB1.DBX22.5", count: 3 },
    { address: "EB0", compareWith: "%QB0" },
    { address: "%ID4", count: 1 },
  ],
};

// ---------------------------------------------------------------------------
// XGT Cnet frame builder — XgtCnetBuilderTool.tsx
// ---------------------------------------------------------------------------

const xgtCnetBuild: ToolDef = {
  name: "plc.xgt_cnet_build",
  slug: "xgt-cnet-builder",
  category: CATEGORY,
  title: "LS XGT Cnet frame builder",
  description:
    "Build an LS ELECTRIC XGT Cnet dedicated-protocol request (RSS, RSB, WSS, WSB) with the BCC appended when the lowercase command calls for one. Example: RSS, station 20, device %MW100 → <ENQ>20rSS0106%MW100<EOT>A4.",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string", enum: ["RSS", "RSB", "WSS", "WSB"], default: "RSS", description: "RSS read individually, RSB read continuously, WSS write individually, WSB write continuously." },
      station: { type: "string", pattern: "^[0-9A-Fa-f]{1,2}$", default: "20", description: "Station number in hex, e.g. \"20\" or \"0A\"." },
      useBcc: { type: "boolean", default: true, description: "Append a BCC; this also selects the lowercase command letter (r/w)." },
      devices: {
        type: "array",
        minItems: 1,
        maxItems: 32,
        items: { type: "string", maxLength: 40 },
        description: "Device (variable) names such as \"%MW100\". RSS/WSS take one block per name; RSB/WSB take exactly one name.",
      },
      count: { type: "integer", minimum: 0, maximum: 255, default: 2, description: "Number of data for RSB/WSB." },
      data: { type: "string", maxLength: 1000, default: "00FF", description: "Write data as ASCII hex characters, e.g. \"00FF\" for one word (WSS: same data for every block; WSB: all data)." },
    },
    required: ["devices"],
    additionalProperties: false,
  },
  run: (input) => {
    const st = Number.parseInt(str(input, "station"), 16);
    const list = (input.devices as string[]).map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) throw new ToolInputError("Enter at least one device name");
    const command = str(input, "command") as XgtRequestCommand;
    if ((command === "RSB" || command === "WSB") && list.length > 1) {
      throw new ToolInputError(`${command} is a continuous command and takes exactly one device name`);
    }
    const n = num(input, "count");
    const data = str(input, "data").trim().toUpperCase();
    const common = { station: st, useBcc: Boolean(input.useBcc) };
    let req: XgtBuildInput;
    if (command === "RSS") req = { ...common, command, variables: list };
    else if (command === "RSB") req = { ...common, command, name: list[0]!, count: n };
    else if (command === "WSS") req = { ...common, command, blocks: list.map((name) => ({ name, data })) };
    else req = { ...common, command, name: list[0]!, count: n, data };
    const built = buildXgtFrame(req);
    if (!built.ok) throw new ToolInputError(built.error);
    const f = built.frame;
    return {
      frame: f.display,
      body: f.body,
      dataArea: f.dataArea,
      bcc: f.bcc,
      hexBytes: f.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" "),
      byteCount: f.bytes.length,
      notes: f.notes,
    };
  },
  examples: [
    { devices: ["%MW100"] },
    { command: "RSS", station: "01", devices: ["%MW100", "%MW200"], useBcc: false },
    { command: "RSB", devices: ["%DW000"], count: 5 },
    { command: "WSS", devices: ["%MW100"], data: "00FF" },
    { command: "WSB", station: "0A", devices: ["%MW100"], count: 2, data: "00FF1234" },
  ],
};

// ---------------------------------------------------------------------------
// XGT Cnet frame decoder — XgtCnetDecoderTool.tsx
// ---------------------------------------------------------------------------

const XGT_BCC_NOTE: Record<string, string> = {
  valid: "BCC matches",
  mismatch: "BCC does not match",
  missing: "Lowercase command, but no BCC was sent",
  "not-required": "Uppercase command — no BCC expected",
  unexpected: "Uppercase command, but a BCC was appended",
};

const xgtCnetDecode: ToolDef = {
  name: "plc.xgt_cnet_decode",
  slug: "xgt-cnet-decoder",
  category: CATEGORY,
  title: "LS XGT Cnet frame decoder",
  description:
    "Decode an LS ELECTRIC XGT Cnet dedicated-protocol frame (ENQ request, ACK/NAK response) given as hex bytes or text with <ENQ> markers, checking the BCC against the letter-case rule and naming NAK error codes. Example: \"05 32 30 72 53 53 30 31 30 36 25 4D 57 31 30 30 04 41 34\" → ENQ request, station 0x20, rSS read of %MW100, BCC A4 valid.",
  inputSchema: {
    type: "object",
    properties: {
      frame: { type: "string", maxLength: 20000, description: "Frame as hex bytes (\"05 32 30 …\"), raw text, or text with <ENQ>/<EOT>/<ACK>/<NAK>/<ETX> markers." },
    },
    required: ["frame"],
    additionalProperties: false,
  },
  run: (input) => {
    const parsed = parseXgtFrame(str(input, "frame"));
    if (!parsed.ok) throw new ToolInputError(parsed.error);
    const f = parsed.frame;
    return {
      kind: f.kind,
      direction: f.direction,
      isError: f.isError,
      station: f.station,
      stationHex: hex(f.station, 2),
      command: f.command.raw,
      commandName: f.command.name,
      commandType: f.commandType,
      commandCode: f.commandCode ?? null,
      mode: f.mode,
      registrationNumber: f.registrationNumber ?? null,
      registered: f.registered ?? null,
      bccStatus: f.bccStatus,
      bccStatusText: XGT_BCC_NOTE[f.bccStatus] ?? f.bccStatus,
      bccRequired: f.bccRequired,
      bccPresent: f.bccPresent,
      bcc: f.bcc ?? null,
      expectedBcc: f.expectedBcc,
      bccValid: f.bccValid,
      errorCode: f.errorCode ?? null,
      errorText: f.errorCode ? f.errorText ?? "not in the published table" : null,
      dataArea: f.dataArea,
      blocks: f.blocks.map((b) => ({
        name: b.name ?? null,
        variableSize: b.variableSize ?? null,
        dataType: b.dataType ?? null,
        dataTypeName: b.dataType ? xgtDataTypeName(b.dataType) : null,
        count: b.count ?? null,
        data: b.data ?? null,
      })),
      display: f.display,
      notes: f.notes,
    };
  },
  examples: [
    { frame: "05 32 30 72 53 53 30 31 30 36 25 4D 57 31 30 30 04 41 34" },
    { frame: "<ENQ>20RSS0106%MW100<EOT>" },
    { frame: "<ENQ>20rSS0106%MW100<EOT>FF" },
    { frame: "<NAK>20rSS1132<ETX>" },
    { frame: "<ACK>20RSS0102ABCD<ETX>" },
  ],
};

export const PLC_TOOLS: ToolDef[] = [
  fourTwenty,
  abAddress,
  bcd,
  loopBurden,
  xgtAddress,
  melsecAddress,
  modbusAddress,
  analogScaling,
  s7Address,
  signalConvert,
  twoPoint,
  xgtCnetBuild,
  xgtCnetDecode,
];
