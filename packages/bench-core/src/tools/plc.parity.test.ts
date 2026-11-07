import { describe, expect, it } from "vitest";
import { callTool } from "../registry";
import {
  ANALOG_PRESETS, AB_TYPE_NAME, ENTITY_LABEL, MELSEC_SERIES,
  abDefaultFile, abFlatBitIndex, absoluteBitIndex, allocate, applyCal, bcdToDecimal, buildXgtFrame, byteSpan,
  collidingAddresses, convertSeries, coveredBytes, decimalToBcd, formatAbAddress, formatS7, formatXgtAddress, invertCal,
  loopBudget, modbusAddressViews, nextAddresses, overlaps, parseAbAddress, parseDataModelAddress, parseMelsecAddress,
  parseS7Address, parseXgtAddress, parseXgtFrame, radixBase, scale, scaleCurrent, twoPointCal, widthBytes,
  xgtDataTypeName, xgtFlatBitIndex, xgtNextBits,
  type MelsecSeries, type ModbusEntity, type S7Address, type XgtBuildInput, type XgtRequestCommand,
} from "@testbench/engine";
import { hx, parity } from "../testing/parity";

// Each `expected` below re-does the page component's glue (apps/web/components/tool/*.tsx)
// directly against the engine — never through plc.ts.

describe("plc-industrial parity", () => {
  // FourTwentyTool.tsx: toPv → scaleCurrent(ma, lo, hi); toMa → scale(pv, lo, hi, 4, 20) + percent.
  const STATUS: Record<string, string> = {
    "open-loop": "OPEN LOOP — check wiring / transmitter",
    "under-range": "Under-range (3.8–4 mA)",
    ok: "In range",
    "over-range": "Over-range (> 20.5 mA)",
  };
  const toPv = (ma: number, lo = 0, hi = 200, unit = "°C") => {
    const r = scaleCurrent(ma, lo, hi);
    return { direction: "toPv", mA: ma, processValue: r.value, unit, percentOfSpan: r.percentOfSpan, status: r.status, statusText: STATUS[r.status] };
  };
  const toMa = (pv: number, lo = 0, hi = 200, unit = "°C") =>
    ({ direction: "toMa", processValue: pv, unit, mA: scale(pv, lo, hi, 4, 20), percentOfSpan: scale(pv, lo, hi, 0, 100) });
  parity("plc.scale_4_20ma", [
    { input: { value: 12 }, expected: toPv(12) },
    { input: { value: 3.9, rangeLow: 0, rangeHigh: 10, unit: "bar" }, expected: toPv(3.9, 0, 10, "bar") },
    { input: { value: 3.5 }, expected: toPv(3.5) },
    { input: { value: 20.8, rangeLow: -50, rangeHigh: 150 }, expected: toPv(20.8, -50, 150) },
    { input: { direction: "toMa", value: 150 }, expected: toMa(150) },
    { input: { direction: "toMa", value: 25, rangeLow: 100, rangeHigh: 0, unit: "%" }, expected: toMa(25, 100, 0, "%") },
  ]);

  // PlcScalingTool.tsx: preset fixes raw range; toRaw rounds; percent on the input span; out-of-range flag.
  const plcScale = (presetId: string, dir: "toEng" | "toRaw", input: number, engMin = 0, engMax = 100, custom?: [number, number]) => {
    const preset = ANALOG_PRESETS.find((p) => p.id === presetId);
    const rawMin = preset ? preset.rawMin : custom![0];
    const rawMax = preset ? preset.rawMax : custom![1];
    const result = dir === "toEng" ? scale(input, rawMin, rawMax, engMin, engMax) : scale(input, engMin, engMax, rawMin, rawMax);
    const lo = dir === "toEng" ? rawMin : engMin;
    const hi = dir === "toEng" ? rawMax : engMax;
    return {
      preset: preset ? preset.id : "custom", presetLabel: preset?.label ?? null, module: preset?.module ?? null,
      rawMin, rawMax, engMin, engMax, direction: dir, input,
      ...(dir === "toEng" ? { engineeringValue: result } : { rawValue: Math.round(result) }),
      percentOfSpan: scale(input, lo, hi, 0, 100),
      outOfRange: input < Math.min(lo, hi) || input > Math.max(lo, hi),
      note: preset?.note ?? null, source: preset?.source ?? null,
    };
  };
  parity("plc.analog_scaling", [
    { input: { value: 13824 }, expected: plcScale("s7", "toEng", 13824) },
    { input: { direction: "toRaw", value: 33.3 }, expected: plcScale("s7", "toRaw", 33.3) },
    { input: { preset: "slc-ni4-4-20ma", value: 9830.5, engMin: 4, engMax: 20 }, expected: plcScale("slc-ni4-4-20ma", "toEng", 9830.5, 4, 20) },
    { input: { preset: "custom", rawMin: 0, rawMax: 4095, value: 2048, engMin: 0, engMax: 10 }, expected: plcScale("custom", "toEng", 2048, 0, 10, [0, 4095]) },
    { input: { preset: "q64ad-high-0-10v", value: 17000, engMin: 0, engMax: 10 }, expected: plcScale("q64ad-high-0-10v", "toEng", 17000, 0, 10) },
    { input: { preset: "clx-if8-int-0-20ma", direction: "toRaw", value: 12, engMin: 0, engMax: 20.58 }, expected: plcScale("clx-if8-int-0-20ma", "toRaw", 12, 0, 20.58) },
    { input: { preset: "r60ad4-bipolar", value: -16000, engMin: -10, engMax: 10 }, expected: plcScale("r60ad4-bipolar", "toEng", -16000, -10, 10) },
  ]);

  // SignalConverterTool.tsx RANGES and its scale() calls.
  const R: Record<string, { label: string; lo: number; hi: number; unit: string }> = {
    "4-20ma": { label: "4–20 mA", lo: 4, hi: 20, unit: "mA" },
    "0-20ma": { label: "0–20 mA", lo: 0, hi: 20, unit: "mA" },
    "1-5v": { label: "1–5 V", lo: 1, hi: 5, unit: "V" },
    "0-5v": { label: "0–5 V", lo: 0, hi: 5, unit: "V" },
    "0-10v": { label: "0–10 V", lo: 0, hi: 10, unit: "V" },
    "3-15psi": { label: "3–15 psi", lo: 3, hi: 15, unit: "psi" },
  };
  const sig = (fromId: string, toId: string, v: number) => {
    const f = R[fromId]!, t = R[toId]!;
    return {
      from: fromId, to: toId, value: v, fromUnit: f.unit, converted: scale(v, f.lo, f.hi, t.lo, t.hi), toUnit: t.unit,
      percentOfSpan: scale(v, f.lo, f.hi, 0, 100), outsideSpan: v < f.lo || v > f.hi, spanMapping: `${f.label} → ${t.label}`,
    };
  };
  parity("plc.signal_convert", [
    { input: { value: 12 }, expected: sig("4-20ma", "1-5v", 12) },
    { input: { from: "0-10v", to: "4-20ma", value: 7.5 }, expected: sig("0-10v", "4-20ma", 7.5) },
    { input: { from: "3-15psi", to: "0-5v", value: 9 }, expected: sig("3-15psi", "0-5v", 9) },
    { input: { from: "4-20ma", to: "0-10v", value: 2 }, expected: sig("4-20ma", "0-10v", 2) },
    { input: { from: "0-20ma", to: "4-20ma", value: 21 }, expected: sig("0-20ma", "4-20ma", 21) },
  ]);

  // TwoPointCalTool.tsx: twoPointCal, equation card, applyCal / invertCal on the test value.
  const tp = (x1: number, y1: number, x2: number, y2: number, v: number | null) => {
    const c = twoPointCal(x1, y1, x2, y2)!;
    return {
      slope: c.slope, offset: c.offset,
      equation: `y = ${c.slope.toPrecision(6)}·x ${c.offset >= 0 ? "+" : "−"} ${Math.abs(c.offset).toPrecision(6)}`,
      value: v, yAtValue: v === null ? null : applyCal(c, v), xAtValue: v === null ? null : invertCal(c, v),
    };
  };
  parity("plc.two_point_cal", [
    { input: { x1: 4, y1: 0, x2: 20, y2: 200, value: 12 }, expected: tp(4, 0, 20, 200, 12) },
    { input: { x1: 0, y1: 0, x2: 27648, y2: 100 }, expected: tp(0, 0, 27648, 100, null) },
    { input: { x1: 0.5, y1: 0, x2: 4.5, y2: 1000, value: 2.5 }, expected: tp(0.5, 0, 4.5, 1000, 2.5) },
    { input: { x1: 1, y1: 5, x2: 3, y2: 5, value: 5 }, expected: tp(1, 5, 3, 5, 5) },
    { input: { x1: 100, y1: 98.7, x2: 0, y2: 0.4, value: 50 }, expected: tp(100, 98.7, 0, 0.4, 50) },
  ]);

  // LoopBurdenTool.tsx: total R = sense + wire + other, loopBudget at 20 mA, status line.
  const lb = (supply: number, minV: number, sense: number, wire: number, other: number) => {
    const totalR = sense + wire + other;
    const r = loopBudget({ supply, minTransmitterV: minV, loopResistance: totalR });
    return {
      ok: r.ok,
      status: r.ok ? `OK — ${r.margin.toFixed(2)} V margin at full scale` : `INSUFFICIENT — ${(-r.margin).toFixed(2)} V short at full scale`,
      currentMa: 20, loopResistance: totalR, vDrop: r.vDrop, vAtTransmitter: r.vAtTransmitter, margin: r.margin, maxResistance: r.maxResistance,
    };
  };
  parity("plc.loop_burden", [
    { input: {}, expected: lb(24, 12, 250, 50, 0) },
    { input: { supply: 24, minTransmitterV: 15, wireResistance: 100, otherResistance: 300 }, expected: lb(24, 15, 250, 100, 300) },
    { input: { supply: 12, minTransmitterV: 9, senseResistor: 100, wireResistance: 10 }, expected: lb(12, 9, 100, 10, 0) },
    { input: { supply: 30, minTransmitterV: 10.5, wireResistance: 25, otherResistance: 340 }, expected: lb(30, 10.5, 250, 25, 340) },
    { input: { supply: 24, minTransmitterV: 12, senseResistor: 600, wireResistance: 0 }, expected: lb(24, 12, 600, 0, 0) },
  ]);

  // BcdTool.tsx
  const toDec = (text: string) => {
    const raw = text.trim().replace(/^0x/i, "");
    const r = bcdToDecimal(parseInt(raw, 16) >>> 0, raw.length);
    if (!r.ok) throw new Error("bad bcd");
    return { direction: "toDec", bcd: "0x" + raw.toUpperCase(), decimal: r.value };
  };
  const toBcd = (text: string) => {
    const raw = text.trim();
    const value = parseInt(raw, 10);
    const w = decimalToBcd(value);
    return { direction: "toBcd", decimal: value, bcd: "0x" + w.toString(16).toUpperCase(), binary: w.toString(2).padStart(Math.max(4, raw.length * 4), "0") };
  };
  parity("plc.bcd", [
    { input: { value: "1234" }, expected: toDec("1234") },
    { input: { value: "0x0099" }, expected: toDec("0x0099") },
    { input: { value: "00250001" }, expected: toDec("00250001") },
    { input: { direction: "toBcd", value: "5678" }, expected: toBcd("5678") },
    { input: { direction: "toBcd", value: "99999999" }, expected: toBcd("99999999") },
    { input: { direction: "toBcd", value: "0" }, expected: toBcd("0") },
  ]);

  // ModbusAddressTool.tsx
  const mbView = (v: ReturnType<typeof modbusAddressViews>) => ({
    entity: v!.entity, entityLabel: ENTITY_LABEL[v!.entity], protocolAddress: v!.protocol, oneBased: v!.oneBased, fiveDigit: v!.fiveDigit, sixDigit: v!.sixDigit,
  });
  parity("plc.modbus_address", [
    { input: { address: "40011" }, expected: mbView(parseDataModelAddress("40011")) },
    { input: { address: "300001" }, expected: mbView(parseDataModelAddress("300001")) },
    { input: { address: " 100005 " }, expected: mbView(parseDataModelAddress("100005")) },
    { input: { address: "00001" }, expected: mbView(parseDataModelAddress("00001")) },
    { input: { address: "9999", notation: "protocol", entity: "coil" }, expected: mbView(modbusAddressViews("coil" as ModbusEntity, 9999)) },
    { input: { address: "65535", notation: "protocol" }, expected: mbView(modbusAddressViews("holding-register", 65535)) },
  ]);

  // AbAddressTool.tsx
  const ab = (text: string) => {
    const p = parseAbAddress(text);
    if (!p.ok) throw new Error(p.error);
    const a = p.address;
    if (a.kind === "data") {
      return {
        canonical: formatAbAddress(a), kind: "data", fileType: a.type, fileTypeName: AB_TYPE_NAME[a.type], file: a.file,
        reservedFile: !!abDefaultFile(a.file), element: a.element, bit: a.bit ?? null, bitFromStartOfFile: abFlatBitIndex(a),
        bitShorthand: a.bit === undefined ? null : `${a.type}${a.file}/${abFlatBitIndex(a)}`,
      };
    }
    return {
      canonical: formatAbAddress(a), kind: "io", direction: a.type === "I" ? "Input" : "Output", slot: a.slot, word: a.word,
      bit: a.bit ?? null, terminal: a.bit === undefined ? null : a.word * 16 + a.bit,
    };
  };
  parity("plc.ab_slc_address", ["N7:2/8", "B3/16", "I:2.1/3", "F8:10", "O:1/15", "n10:5"].map((s) => ({ input: { address: s }, expected: ab(s) })));

  // XgtAddressTool.tsx
  const xgt = (text: string) => {
    const p = parseXgtAddress(text);
    if (!p.ok) throw new Error(p.error);
    const a = p.address;
    return {
      canonical: formatXgtAddress(a), device: a.device.symbol, deviceName: a.device.name, deviceKind: a.device.kind,
      word: a.word, bit: a.bit ?? null, bitHex: a.bitHex ?? null,
      bitFromStartOfArea: a.bit === undefined ? null : xgtFlatBitIndex(a),
      wordAddress: formatXgtAddress({ device: a.device, word: a.word }),
      nextBits: a.bit !== undefined ? xgtNextBits(a, 8) : [],
    };
  };
  parity("plc.xgt_address", ["P00105", "M0000F", "D0011.A", "D100", "K0012C", "z3"].map((s) => ({ input: { address: s }, expected: xgt(s) })));

  // MelsecAddressTool.tsx
  const melsec = (series: MelsecSeries, text: string) => {
    const p = parseMelsecAddress(series, text);
    if (!p.ok) throw new Error(p.error);
    const a = p.address;
    const other: MelsecSeries = series === "fx5" ? "iq-r" : "fx5";
    const otherLabel = MELSEC_SERIES.find((s) => s.id === other)!.label;
    const conv = convertSeries(a, other);
    const e = parseMelsecAddress(other, text);
    const same = e.ok ? e.address : null;
    return {
      series, device: a.symbol, numberText: a.numberText, radix: a.radix, base: radixBase(a.radix), index: a.index,
      binary: a.index.toString(2), otherSeries: other, sameOnOtherSeries: conv.ok ? conv.text : null,
      warning: same && same.index !== a.index
        ? `"${a.symbol}${a.numberText}" is also valid on ${otherLabel}, but there it means point ${same.index}, not ${a.index}.`
        : null,
      next: nextAddresses(a, 8),
    };
  };
  parity("plc.melsec_address", [
    { input: { address: "X20" }, expected: melsec("fx5", "X20") },
    { input: { series: "iq-r", address: "X20" }, expected: melsec("iq-r", "X20") },
    { input: { address: "D100" }, expected: melsec("fx5", "D100") },
    { input: { series: "iq-r", address: "W1F" }, expected: melsec("iq-r", "W1F") },
    { input: { address: "Y17" }, expected: melsec("fx5", "Y17") },
    { input: { series: "iq-r", address: "LT10" }, expected: melsec("iq-r", "LT10") },
  ]);

  // S7AddressTool.tsx: cards, overlap line, allocate(count) layout, colliding same-width addresses.
  const AREA: Record<string, string> = { I: "Input (%I / %E)", Q: "Output (%Q / %A)", M: "Bit memory (%M)", DB: "Data block" };
  const WIDTH: Record<string, string> = { X: "Bit", B: "Byte (8 bit)", W: "Word (16 bit)", D: "Double word (32 bit)" };
  const covers = (a: S7Address) => {
    const span = byteSpan(a);
    const area = a.area === "DB" ? `DB${a.dbNumber}` : `%${a.area}`;
    if (a.width === "X") return `bit ${a.bitOffset} of byte ${a.byteOffset} in ${area}`;
    return span.first === span.last ? `byte ${span.first} in ${area}` : `bytes ${span.first}–${span.last} in ${area}`;
  };
  const s7 = (text: string, other: string | null, count = 4) => {
    const p = parseS7Address(text);
    if (!p.ok) throw new Error(p.error);
    const a = p.address;
    const o = other === null ? null : parseS7Address(other);
    if (o && !o.ok) throw new Error(o.error);
    return {
      canonical: formatS7(a), area: a.area, areaLabel: AREA[a.area], dbNumber: a.dbNumber ?? null, width: a.width,
      widthLabel: WIDTH[a.width], widthBytes: widthBytes(a.width), byteOffset: a.byteOffset, bitOffset: a.bitOffset ?? null,
      covers: covers(a), bitIndex: absoluteBitIndex(a), bytesUsed: coveredBytes(a),
      overlap: o && o.ok ? { with: formatS7(o.address), overlaps: overlaps(a, o.address) } : null,
      layout: allocate(a.area, a.width, a.byteOffset, count, a.dbNumber).map(formatS7),
      blocks: a.width === "X" ? [] : collidingAddresses(a, a.width).map(formatS7),
    };
  };
  parity("plc.s7_address", [
    { input: { address: "%MW100", compareWith: "%MW101" }, expected: s7("%MW100", "%MW101") },
    { input: { address: "%M10.3" }, expected: s7("%M10.3", null) },
    { input: { address: "DB1.DBD20", compareWith: "DB1.DBX22.5", count: 3 }, expected: s7("DB1.DBD20", "DB1.DBX22.5", 3) },
    { input: { address: "EB0", compareWith: "%QB0" }, expected: s7("EB0", "%QB0") },
    { input: { address: "%ID4", count: 1 }, expected: s7("%ID4", null, 1) },
    { input: { address: "db2.dbw0", compareWith: "DB3.DBW0", count: 32 }, expected: s7("db2.dbw0", "DB3.DBW0", 32) },
  ]);

  // XgtCnetBuilderTool.tsx: station parseInt(hex), names list, data uppercased, buildXgtFrame.
  const build = (command: XgtRequestCommand, station: string, useBcc: boolean, list: string[], n: number, data: string) => {
    const common = { station: Number.parseInt(station, 16), useBcc };
    const d = data.trim().toUpperCase();
    let input: XgtBuildInput;
    if (command === "RSS") input = { ...common, command, variables: list };
    else if (command === "RSB") input = { ...common, command, name: list[0]!, count: n };
    else if (command === "WSS") input = { ...common, command, blocks: list.map((name) => ({ name, data: d })) };
    else input = { ...common, command, name: list[0]!, count: n, data: d };
    const r = buildXgtFrame(input);
    if (!r.ok) throw new Error(r.error);
    const f = r.frame;
    return {
      frame: f.display, body: f.body, dataArea: f.dataArea, bcc: f.bcc,
      hexBytes: f.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" "), byteCount: f.bytes.length, notes: f.notes,
    };
  };
  parity("plc.xgt_cnet_build", [
    { input: { devices: ["%MW100"] }, expected: build("RSS", "20", true, ["%MW100"], 2, "00FF") },
    { input: { station: "01", devices: ["%MW100", "%MW200"], useBcc: false }, expected: build("RSS", "01", false, ["%MW100", "%MW200"], 2, "00FF") },
    { input: { command: "RSB", devices: ["%DW000"], count: 5 }, expected: build("RSB", "20", true, ["%DW000"], 5, "00FF") },
    { input: { command: "WSS", devices: ["%MW100", "%MW101"], data: "00ff" }, expected: build("WSS", "20", true, ["%MW100", "%MW101"], 2, "00ff") },
    { input: { command: "WSB", station: "0A", devices: ["%MW100"], count: 2, data: "00FF1234" }, expected: build("WSB", "0A", true, ["%MW100"], 2, "00FF1234") },
    { input: { command: "WSB", station: "1f", useBcc: false, devices: ["%MW100"], count: 2, data: "00FF" }, expected: build("WSB", "1f", false, ["%MW100"], 2, "00FF") },
  ]);

  // XgtCnetDecoderTool.tsx: status line, frame/station/command/BCC/error cards, blocks table, display.
  const BCC_NOTE: Record<string, string> = {
    valid: "BCC matches", mismatch: "BCC does not match", missing: "Lowercase command, but no BCC was sent",
    "not-required": "Uppercase command — no BCC expected", unexpected: "Uppercase command, but a BCC was appended",
  };
  const dec = (text: string) => {
    const p = parseXgtFrame(text);
    if (!p.ok) throw new Error(p.error);
    const f = p.frame;
    return {
      kind: f.kind, direction: f.direction, isError: f.isError, station: f.station, stationHex: hx(f.station, 2),
      command: f.command.raw, commandName: f.command.name, commandType: f.commandType, commandCode: f.commandCode ?? null,
      mode: f.mode, registrationNumber: f.registrationNumber ?? null, registered: f.registered ?? null,
      bccStatus: f.bccStatus, bccStatusText: BCC_NOTE[f.bccStatus], bccRequired: f.bccRequired, bccPresent: f.bccPresent,
      bcc: f.bcc ?? null, expectedBcc: f.expectedBcc, bccValid: f.bccValid,
      errorCode: f.errorCode ?? null, errorText: f.errorCode ? f.errorText ?? "not in the published table" : null,
      dataArea: f.dataArea,
      blocks: f.blocks.map((b) => ({
        name: b.name ?? null, variableSize: b.variableSize ?? null, dataType: b.dataType ?? null,
        dataTypeName: b.dataType ? xgtDataTypeName(b.dataType) : null, count: b.count ?? null, data: b.data ?? null,
      })),
      display: f.display, notes: f.notes,
    };
  };
  parity("plc.xgt_cnet_decode", [
    "05 32 30 72 53 53 30 31 30 36 25 4D 57 31 30 30 04 41 34",
    "<ENQ>20RSS0106%MW100<EOT>",
    "<ENQ>20rSS0106%MW100<EOT>FF",
    "<NAK>20rSS1132<ETX>",
    "<ACK>20RSS0102ABCD<ETX>",
    "<NAK>20RSS9999<ETX>",
    "<ENQ>0AwSB06%MW1000200FF1234<EOT>5E",
  ].map((s) => ({ input: { frame: s }, expected: dec(s) })));
});

describe("plc-industrial input errors", () => {
  it("rejects schema-valid but unusable input with a message", () => {
    const bad: [string, Record<string, unknown>][] = [
      ["plc.scale_4_20ma", { value: 12, rangeLow: 5, rangeHigh: 5 }],
      ["plc.analog_scaling", { value: 1, preset: "custom" }],
      ["plc.analog_scaling", { value: 1, preset: "s7", rawMax: 10 }],
      ["plc.two_point_cal", { x1: 1, y1: 0, x2: 1, y2: 5 }],
      ["plc.bcd", { value: "12A4" }],
      ["plc.bcd", { direction: "toBcd", value: "-5" }],
      ["plc.modbus_address", { address: "50001" }],
      ["plc.modbus_address", { address: "70000", notation: "protocol" }],
      ["plc.ab_slc_address", { address: "N7:2/16" }],
      ["plc.xgt_address", { address: "Q100" }],
      ["plc.melsec_address", { address: "X28" }],
      ["plc.s7_address", { address: "%MW100", compareWith: "%M10" }],
      ["plc.xgt_cnet_build", { command: "RSB", devices: ["%MW100", "%MW101"] }],
      ["plc.xgt_cnet_build", { command: "RSS", devices: ["MW100"] }],
      ["plc.xgt_cnet_decode", { frame: "hello" }],
    ];
    for (const [name, input] of bad) {
      const r = callTool(name, input);
      expect(r.ok, `${name} ${JSON.stringify(input)}`).toBe(false);
    }
  });
});
