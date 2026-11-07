import { describe } from "vitest";
import {
  MODE_CODES, SSM_BCD, SSM_BNR, SSM_DISCRETE, TdmsParser, applyBnrScale, buildArinc429, decodeCommandWord, decodeMessage,
  decodeStatusWord, encodeCommandWord, hexDumpLines, parseArinc429, parseCsvNumeric, parseIntelHex, parseSrec, segmentsToBin,
  tdmsToCsv, tdmsTypeName, toIntelHex, toSrec,
  type Arinc429Format, type CommandWord, type LabelBitOrder, type StatusWord,
} from "@testbench/engine";
import {
  buildF64Raw, buildMetadata, buildSegment, concatBytes, TOC_META, TOC_NEW_OBJ_LIST, TOC_RAW,
} from "@testbench/engine/src/testutil/tdms-writer";
import { hx, parity } from "../testing/parity";

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const fin = (v: number) => (Number.isFinite(v) ? v : null);

describe("avionics-databus parity", () => {
  // Arinc429BuilderTool.tsx: buildArinc429 from the form, then parseArinc429 round-trip for the side panel.
  const SSM: Record<Arinc429Format, readonly string[]> = { bnr: SSM_BNR, bcd: SSM_BCD, discrete: SSM_DISCRETE };
  const build = (labelOctal: string, order: LabelBitOrder, format: Arinc429Format, sdi: number, ssm: number, dataText: string, bcdText: string) => {
    const common = { labelOctal, labelBitOrder: order, sdi, ssm };
    const built = format === "bcd"
      ? buildArinc429({ ...common, bcdDigits: bcdText.trim().split(/[\s,]+/).filter(Boolean).map(Number) })
      : buildArinc429({ ...common, data: Number(dataText) });
    if (!built.ok) throw new Error(built.error);
    const back = parseArinc429(built.word.raw, { labelBitOrder: order, format });
    if (!back.ok) throw new Error(back.error);
    return {
      word: built.word.hex, decimal: built.word.raw, parityBit: built.word.parityBit, bits: back.word.bits, format,
      ssmMeaning: SSM[format][ssm], decodesBackAs: { labelOctal: back.word.label.octal, sdi: back.word.sdi, ssm: back.word.ssm },
      labelOctalAlternate: back.word.label.octalAlternate,
    };
  };
  parity("arinc429.build", [
    { input: { labelOctal: "205", sdi: 2, ssm: 3, format: "bnr", data: 400 }, expected: build("205", "bit1-msb", "bnr", 2, 3, "400", "") },
    { input: { labelOctal: "205", sdi: 2, ssm: 3, format: "bcd", bcdDigits: "2 5 7 8 6" }, expected: build("205", "bit1-msb", "bcd", 2, 3, "", "2 5 7 8 6") },
    { input: { labelOctal: "310", ssm: 3, data: 0 }, expected: build("310", "bit1-msb", "bnr", 0, 3, "0", "") },
    { input: { labelOctal: "270", format: "discrete", data: 5, labelBitOrder: "bit8-msb" }, expected: build("270", "bit8-msb", "discrete", 0, 0, "5", "") },
    { input: { labelOctal: "001", sdi: 1, format: "bcd", bcdDigits: "1,2,3" }, expected: build("001", "bit1-msb", "bcd", 1, 0, "", "1,2,3") },
    { input: { labelOctal: "377", sdi: 3, ssm: 1, data: 524287 }, expected: build("377", "bit1-msb", "bnr", 3, 1, "524287", "") },
  ]);

  // Arinc429Tool.tsx: parseArinc429 with the selected order/format; BNR scaled by the ICD full-scale.
  const decode = (text: string, order: LabelBitOrder, format: Arinc429Format | "none", fullScale?: number) => {
    const r = parseArinc429(text, { labelBitOrder: order, ...(format === "none" ? {} : { format }) });
    if (!r.ok) throw new Error(r.error);
    const w = r.word;
    return {
      word: w.hex, bits: w.bits,
      fields: { parity: w.bits.slice(0, 1), ssm: w.bits.slice(1, 3), data: w.bits.slice(3, 22), sdi: w.bits.slice(22, 24), label: w.bits.slice(24, 32) },
      labelOctal: w.label.octal, labelOctalAlternate: w.label.octalAlternate, labelBitOrder: order,
      sdi: w.sdi, ssm: w.ssm, format: w.format, ssmMeaning: w.ssmMeaning, ssmReadings: w.ssmReadings,
      parityBit: w.parityBit, parityExpected: w.parityExpected, parityOk: w.parityOk, dataField: hx(w.data, 5),
      bnr: { signed: w.bnr.signed, negative: w.bnr.negative, magnitude: w.bnr.magnitude, scaled: fullScale === undefined ? null : applyBnrScale(w.bnr.signed, fullScale) },
      bcd: { digits: w.bcd.digits, value: w.bcd.value, invalidDigits: w.bcd.invalidDigits },
    };
  };
  parity("arinc429.decode", [
    { input: { word: "0xE00640A1" }, expected: decode("0xE00640A1", "bit1-msb", "none") },
    { input: { word: "E0 06 40 A1", format: "bnr", bnrFullScale: 512 }, expected: decode("E0 06 40 A1", "bit1-msb", "bnr", 512) },
    { input: { word: "0x60064085", labelBitOrder: "bit8-msb" }, expected: decode("0x60064085", "bit8-msb", "none") },
    { input: { word: "0x1", format: "bcd" }, expected: decode("0x1", "bit1-msb", "bcd") },
    { input: { word: "FFFFFFFF", format: "discrete" }, expected: decode("FFFFFFFF", "bit1-msb", "discrete") },
    { input: { word: "0x7FFC0000", bnrFullScale: 180 }, expected: decode("0x7FFC0000", "bit1-msb", "none", 180) },
  ]);

  // Mil1553CommandTool.tsx: decode the hex box, or encode the build form and decode the result.
  const bin = (w: number) => w.toString(2).padStart(16, "0");
  const cmd = (c: CommandWord) => ({
    word: hx(c.raw, 4), binary: bin(c.raw), rtAddress: c.rtAddress, broadcast: c.broadcast, transmit: c.transmit,
    direction: c.transmit ? "Transmit (RT → BC)" : "Receive (BC → RT)", subaddress: c.subaddress, isModeCommand: c.isModeCommand,
    wordCount: c.wordCount, modeCode: c.modeCode, modeName: c.isModeCommand ? (c.mode ? c.mode.name : "reserved / undefined") : null,
    modeDataWord: c.mode ? c.mode.dataWord : null, parity: c.parity, withParity: `${bin(c.raw)} ${c.parity}`,
  });
  const dec = (t: string) => ({ mode: "decode", ...cmd(decodeCommandWord(parseInt(t.trim().replace(/^0x/i, ""), 16))) });
  const enc = (rtAddress: number, transmit: boolean, subaddress: number, wordCountOrMode: number) =>
    ({ mode: "encode", ...cmd(decodeCommandWord(encodeCommandWord({ rtAddress, transmit, subaddress, wordCountOrMode }))) });
  parity("mil1553.decode_command", [
    { input: { word: "183E" }, expected: dec("183E") },
    { input: { word: "0x2822" }, expected: dec("0x2822") },
    { input: { word: "FC02" }, expected: dec("FC02") },
    { input: { word: "0BFF" }, expected: dec("0BFF") },
    { input: { mode: "encode", rtAddress: 3, subaddress: 1, wordCountOrMode: 30 }, expected: enc(3, false, 1, 30) },
    { input: { mode: "encode", rtAddress: 5, transmit: true, subaddress: 31, wordCountOrMode: 2 }, expected: enc(5, true, 31, 2) },
    { input: { mode: "encode", rtAddress: 1, subaddress: 2, wordCountOrMode: 32 }, expected: enc(1, false, 2, 32) },
  ]);

  // Mil1553MessageTool.tsx: parse the word list, decodeMessage, one table row per word.
  const st = (s: StatusWord) => ({
    word: hx(s.raw, 4), rtAddress: s.rtAddress, messageError: s.messageError, instrumentation: s.instrumentation,
    serviceRequest: s.serviceRequest, reserved: s.reserved, broadcastReceived: s.broadcastReceived, busy: s.busy,
    subsystemFlag: s.subsystemFlag, dynamicBusControlAccept: s.dynamicBusControlAccept, terminalFlag: s.terminalFlag, parity: s.parity,
  });
  const msg = (text: string) => {
    const words = text.trim().split(/[\s,]+/).filter(Boolean).map((t) => parseInt(t.replace(/^0x/i, ""), 16));
    const m = decodeMessage(words);
    return {
      type: m.type, ok: m.ok, wordCount: m.words.length, expectedCount: m.expectedCount, note: m.note ?? null,
      words: m.words.map((w, i) => ({
        index: i + 1, word: hx(w.raw, 4), role: w.role, label: w.label,
        summary: w.command
          ? `RT ${w.command.rtAddress} · ${w.command.transmit ? "Tx" : "Rx"} · SA ${w.command.subaddress}${w.command.isModeCommand ? ` · mode ${w.command.modeCode}` : ` · WC ${w.command.wordCount}`}`
          : w.status
            ? `RT ${w.status.rtAddress}${w.status.messageError ? " · ME" : ""}${w.status.busy ? " · Busy" : ""}${w.status.serviceRequest ? " · SRQ" : ""}${w.status.terminalFlag ? " · TF" : ""}`
            : `${w.raw} · int16 ${(w.raw << 16) >> 16}`,
        command: w.command ? cmd(w.command) : null,
        status: w.status ? st(w.status) : null,
        value: w.role === "data" ? { unsigned: w.raw, int16: (w.raw << 16) >> 16 } : null,
      })),
    };
  };
  parity("mil1553.decode_message", ["2822 1234 5678 2800", "1C22 1800 AAAA 5555", "0x1802, 0x1800", "FC22 0001 0002", "2822 1234", "1A30 1800 FFFF 8000"]
    .map((w) => ({ input: { words: w }, expected: msg(w) })));

  // Mil1553ModeCodesTool.tsx: MODE_CODES filtered by the search box.
  const modes = (query: string) => {
    const q = query.trim().toLowerCase();
    const rows = !q ? MODE_CODES : MODE_CODES.filter((m) =>
      m.name.toLowerCase().includes(q) || String(m.code) === q || m.code.toString(2).includes(q) || ("0x" + m.code.toString(16)).includes(q));
    return {
      count: rows.length,
      modeCodes: rows.map((m) => ({ code: m.code, bits: m.code.toString(2).padStart(5, "0"), tr: m.tr, direction: m.tr === 1 ? "Tx" : "Rx", dataWord: m.dataWord, name: m.name })),
      note: "Codes 9–15 and 22–31 are reserved. Mode commands use subaddress 0 or 31.",
    };
  };
  parity("mil1553.mode_codes", [
    { input: {}, expected: modes("") },
    ...["reset", "2", "status", "0x10", "Shutdown", "nothing-matches"].map((q) => ({ input: { query: q }, expected: modes(q) })),
  ]);

  // Mil1553StatusTool.tsx: decodeStatusWord and the flag table.
  const FLAGS = [
    ["messageError", "Message Error", 10], ["instrumentation", "Instrumentation (reserved 0)", 9], ["serviceRequest", "Service Request", 8],
    ["broadcastReceived", "Broadcast Command Received", 4], ["busy", "Busy", 3], ["subsystemFlag", "Subsystem Flag", 2],
    ["dynamicBusControlAccept", "Dynamic Bus Control Acceptance", 1], ["terminalFlag", "Terminal Flag", 0],
  ] as const;
  const status = (t: string) => {
    const s = decodeStatusWord(parseInt(t.trim().replace(/^0x/i, ""), 16));
    return { ...st(s), flags: FLAGS.map(([k, name, bit]) => ({ bit, name, set: s[k] })) };
  };
  parity("mil1553.decode_status", ["1800", "0x1C08", "FFFF", "0", "2D01", " 0x0010 "].map((w) => ({ input: { word: w }, expected: status(w) })));
});

describe("file-tools parity", () => {
  // CsvPlotterTool.tsx: parseCsvNumeric; X = column 1 when >1 column; first 8 data columns plotted.
  const csv = (text: string, xIsFirstBox = true, sampleRows = 10) => {
    const r = parseCsvNumeric(text);
    if (!r.ok) throw new Error(r.error);
    const c = r.csv;
    const xIsFirst = xIsFirstBox && c.headers.length > 1;
    const visible = c.headers.map((_, i) => i).filter((i) => !(c.headers.length > 1 && i === 0)).slice(0, 8);
    let yMin = Infinity, yMax = -Infinity;
    for (const i of visible) for (const v of c.columns[i]!) if (Number.isFinite(v)) { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const xCol = xIsFirst ? c.columns[0]! : null;
    const n = Math.min(sampleRows, c.rowCount);
    return {
      headers: c.headers, rowCount: c.rowCount, delimiter: c.delimiter === "\t" ? "TAB" : c.delimiter, skippedRows: c.skippedRows,
      columns: c.columns.map((col, i) => {
        const f = col.filter(Number.isFinite);
        return { index: i, name: c.headers[i], finiteCount: f.length, min: Math.min(...f), max: Math.max(...f), mean: f.reduce((a, b) => a + b, 0) / f.length };
      }),
      plot: {
        xAxis: xCol ? c.headers[0] : "row index",
        xMin: xCol ? Math.min(...xCol.filter(Number.isFinite)) : 0,
        xMax: xCol ? Math.max(...xCol.filter(Number.isFinite)) : c.rowCount - 1,
        series: visible.map((i) => c.headers[i]), yMin, yMax,
      },
      firstRows: Array.from({ length: n }, (_, row) => c.columns.map((col) => fin(col[row]!))),
      truncated: n < c.rowCount,
    };
  };
  parity("file.csv_summary", [
    { input: { text: "t,v\n0,1\n1,3\n2,2" }, expected: csv("t,v\n0,1\n1,3\n2,2") },
    { input: { text: "time;ch1;ch2\n0;0.1;-0.1\n0.001;0.2;-0.2\n0.002;0.3;-0.3", sampleRows: 2 }, expected: csv("time;ch1;ch2\n0;0.1;-0.1\n0.001;0.2;-0.2\n0.002;0.3;-0.3", true, 2) },
    { input: { text: "1\n2\n3\n4" }, expected: csv("1\n2\n3\n4") },
    { input: { text: "x\ty\n0\t5\n1\t5\nfoo\tbar\n2\t5" }, expected: csv("x\ty\n0\t5\n1\t5\nfoo\tbar\n2\t5") },
    { input: { text: "a,b,c\n1,2,3\n4,5,x\n7,8,9", firstColumnIsX: false }, expected: csv("a,b,c\n1,2,3\n4,5,x\n7,8,9", false) },
    { input: { text: "s,sin\r\n" + Array.from({ length: 50 }, (_, i) => `${i / 100},${Math.sin(i / 5)}`).join("\r\n") },
      expected: csv("s,sin\r\n" + Array.from({ length: 50 }, (_, i) => `${i / 100},${Math.sin(i / 5)}`).join("\r\n")) },
  ]);

  // HexViewerTool.tsx: hexDumpLines over a 16 KB window starting at the loaded offset.
  const big = Uint8Array.from({ length: 20000 }, (_, i) => (i * 7) & 0xff);
  const dump = (bytes: Uint8Array, offset = 0, length = 16384) => {
    const chunk = bytes.subarray(offset, offset + length);
    const next = offset + chunk.length;
    return {
      totalBytes: bytes.length, offset, shownBytes: chunk.length, remainingBytes: bytes.length - next, truncated: next < bytes.length,
      nextOffset: next < bytes.length ? next : null, lines: hexDumpLines(chunk, offset),
    };
  };
  parity("file.hex_dump", [
    { input: { contentBase64: "SGVsbG8sIFdvcmxkIQ==" }, expected: dump(new TextEncoder().encode("Hello, World!")) },
    { input: { contentBase64: b64(big) }, expected: dump(big) },
    { input: { contentBase64: b64(big), offset: 16384 }, expected: dump(big, 16384) },
    { input: { contentBase64: b64(big), offset: 100, length: 33 }, expected: dump(big, 100, 33) },
    { input: { contentBase64: "" }, expected: dump(new Uint8Array(0)) },
    { input: { contentBase64: "f0VMRgIBAQAAAAAAAAAAAA", length: 4 }, expected: dump(unb64("f0VMRgIBAQAAAAAAAAAAAA=="), 0, 4) },
  ]);

  // HexSrecBinTool.tsx: text → parseIntelHex/parseSrec → segments + segmentsToBin; bin → toIntelHex/toSrec at a base.
  const toBin = (text: string, max = 65536) => {
    const t = text.trim();
    const r = t.startsWith(":") ? parseIntelHex(t) : parseSrec(t);
    if (!r.ok) throw new Error(r.error);
    const b = segmentsToBin(r.image.segments);
    return {
      format: r.image.format === "ihex" ? "Intel HEX" : "S-Record",
      segments: r.image.segments.map((s) => ({ start: hx(s.address, 8), end: hx(s.address + s.data.length - 1, 8), bytes: s.data.length })),
      baseAddress: hx(b.base, 8), startAddress: r.image.startAddress === null ? null : hx(r.image.startAddress, 8), gapFill: "0xFF",
      binLength: b.data.length, binBase64: b64(b.data.subarray(0, max)), truncated: b.data.length > max,
    };
  };
  const toHex = (data: Uint8Array, baseText: string, kind: "ihex" | "srec", max = 5000) => {
    const base = parseInt(baseText.replace(/^0x/i, ""), 16);
    const out = kind === "ihex" ? toIntelHex([{ address: base, data }]) : toSrec([{ address: base, data }]);
    const lines = out.split("\n").filter(Boolean);
    return {
      format: kind === "ihex" ? "Intel HEX" : "S-Record", baseAddress: hx(base, 8), inputBytes: data.length, lineCount: lines.length,
      text: lines.slice(0, max).join("\n") + "\n", truncated: lines.length > max,
    };
  };
  const fw = Uint8Array.from({ length: 300 }, (_, i) => (i * 13 + 1) & 0xff);
  const ihexMulti = toIntelHex([{ address: 0x08000000, data: fw.subarray(0, 40) }, { address: 0x08010000, data: fw.subarray(40, 60) }]);
  const srec = toSrec([{ address: 0x2000, data: fw }]);
  parity("file.hex_srec_convert", [
    { input: { text: ":10010000214601360121470136007EFE09D2190140\n:00000001FF" }, expected: toBin(":10010000214601360121470136007EFE09D2190140\n:00000001FF") },
    { input: { text: ihexMulti }, expected: toBin(ihexMulti) },
    { input: { text: srec, maxOutputBytes: 100 }, expected: toBin(srec, 100) },
    { input: { text: ":020000040800F2\n:04000000DEADBEEFC4\n:0400100001020304E2\n:0400000508000101ED\n:00000001FF" },
      expected: toBin(":020000040800F2\n:04000000DEADBEEFC4\n:0400100001020304E2\n:0400000508000101ED\n:00000001FF") },
    { input: { direction: "toHex", contentBase64: b64(fw) }, expected: toHex(fw, "08000000", "ihex") },
    { input: { direction: "toHex", contentBase64: b64(fw), baseAddress: "0x1000", outputFormat: "srec" }, expected: toHex(fw, "0x1000", "srec") },
    { input: { direction: "toHex", contentBase64: b64(fw), baseAddress: "FFF0", maxOutputLines: 3 }, expected: toHex(fw, "FFF0", "ihex", 3) },
  ]);

  // TDMS inputs built with the engine's test writer.
  const TOC = TOC_META | TOC_RAW | TOC_NEW_OBJ_LIST;
  const ramp = Array.from({ length: 1500 }, (_, i) => i / 7);
  const files = {
    two: buildSegment(TOC, buildMetadata([
      { path: "/", props: [{ name: "title", type: "string", value: "Run 1" }] }, { path: "/'DAQ'" },
      { path: "/'DAQ'/'ch1'", index: { dtype: 10, count: 3 }, props: [{ name: "unit", type: "string", value: "V" }] },
      { path: "/'DAQ'/'ch2'", index: { dtype: 10, count: 3 } },
    ]), buildF64Raw([1, 2, 3], [-1, -2, -3])),
    groups: buildSegment(TOC, buildMetadata([
      { path: "/" }, { path: "/'A'", props: [{ name: "rate", type: "f64", value: 1000 }] }, { path: "/'B'" },
      { path: "/'A'/'x'", index: { dtype: 10, count: 2 } },
      { path: "/'B'/'y'", index: { dtype: 10, count: 3 }, props: [{ name: "gain", type: "f64", value: 2.5 }] },
    ]), buildF64Raw([10, 20], [0.1, 0.2, 0.3])),
    segmented: concatBytes(
      buildSegment(TOC, buildMetadata([{ path: "/" }, { path: "/'G'" }, { path: "/'G'/'ramp'", index: { dtype: 10, count: 750 } }]), buildF64Raw(ramp.slice(0, 750))),
      buildSegment(TOC_META | TOC_RAW, buildMetadata([{ path: "/'G'/'ramp'", index: "match" }]), buildF64Raw(ramp.slice(750))),
    ),
    empty: buildSegment(TOC_META | TOC_NEW_OBJ_LIST, buildMetadata([
      { path: "/", props: [{ name: "author", type: "string", value: "bench" }] }, { path: "/'Empty'" },
    ]), new Uint8Array(0)),
  };
  const parse = (bytes: Uint8Array) => { const p = new TdmsParser(); p.push(bytes); return p.finish(); };

  // TdmsToCsvTool.tsx: selected channels (all by default) → tdmsToCsv.
  const toCsv = (bytes: Uint8Array, pick?: string[], maxRows = 1000) => {
    const f = parse(bytes);
    const all = f.groups.flatMap((g) => g.channels);
    const chosen = pick ? pick.map((p) => all.find((c) => c.path === p || `${c.group}/${c.name}` === p)!) : all;
    const lines = tdmsToCsv(chosen).split("\n").slice(0, -1);
    return {
      groups: f.groups.length, channelsInFile: all.length, totalSamples: all.reduce((n, c) => n + c.data.length, 0),
      selected: chosen.map((c) => ({ path: c.path, group: c.group, name: c.name, dtype: tdmsTypeName(c.dtype), samples: c.data.length })),
      rowCount: lines.length - 1, csv: lines.slice(0, maxRows + 1).join("\n") + "\n", truncated: lines.length - 1 > maxRows,
    };
  };
  parity("file.tdms_to_csv", [
    { input: { contentBase64: b64(files.two) }, expected: toCsv(files.two) },
    { input: { contentBase64: b64(files.groups) }, expected: toCsv(files.groups) },
    { input: { contentBase64: b64(files.groups), channels: ["B/y"] }, expected: toCsv(files.groups, ["B/y"]) },
    { input: { contentBase64: b64(files.segmented) }, expected: toCsv(files.segmented) },
    { input: { contentBase64: b64(files.segmented), maxRows: 20000 }, expected: toCsv(files.segmented, undefined, 20000) },
    { input: { contentBase64: b64(files.two), channels: ["/'DAQ'/'ch2'", "DAQ/ch1"] }, expected: toCsv(files.two, ["/'DAQ'/'ch2'", "DAQ/ch1"]) },
  ]);

  // TdmsViewerTool.tsx: properties, groups, channels with dtype, length and first 10 samples (7 significant digits).
  const inspect = (bytes: Uint8Array) => {
    const f = parse(bytes);
    const all = f.groups.flatMap((g) => g.channels);
    return {
      properties: f.properties, groupCount: f.groups.length, channelCount: all.length, totalSamples: all.reduce((n, c) => n + c.data.length, 0),
      groups: f.groups.map((g) => ({
        name: g.name, path: g.path, properties: g.properties,
        channels: g.channels.map((c) => ({
          name: c.name, path: c.path, dtype: tdmsTypeName(c.dtype), samples: c.data.length, properties: c.properties,
          firstSamples: c.data.slice(0, 10).map((v) => Number(v.toPrecision(7))), more: c.data.length > 10,
        })),
      })),
    };
  };
  parity("file.tdms_inspect", (["two", "groups", "segmented", "empty"] as const).map((k) => ({ input: { contentBase64: b64(files[k]) }, expected: inspect(files[k]) }))
    .concat([{ input: { contentBase64: b64(files.two).replace(/=+$/, "") }, expected: inspect(files.two) }]));
});
