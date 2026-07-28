import { describe, expect, it } from "vitest";
import {
  MC_COMMAND_BATCH_READ,
  MC_COMMAND_BATCH_WRITE,
  MC_DEVICE_CODES,
  MC_MAX_POINTS_BIT_ASCII,
  MC_MAX_POINTS_BIT_BINARY,
  MC_MAX_POINTS_WORD,
  buildMcRequest,
  buildMcRequestData,
  decodeMcBitData,
  decodeMcWordData,
  encodeMcBitData,
  encodeMcWordData,
  formatMcDevice,
  mcAsciiField,
  mcAsciiValue,
  mcDeviceByAscii,
  mcDeviceByCode,
  mcDeviceBySymbol,
  mcLeBytes,
  mcLeValue,
  mcSubcommand,
  mcSubcommandMeaning,
  parseMcDevice,
  parseMcFrame,
  type McMode,
  type McRequestFrame,
  type McResponseFrame,
} from "./mcprotocol";
import vectors from "../vectors/mcprotocol.json";

/** Vector text and engine output compared without the hex dump's spaces. */
const norm = (s: string) => s.replace(/\s+/g, "").toUpperCase();

function built(result: ReturnType<typeof buildMcRequest>) {
  if (!result.ok) throw new Error(`build failed: ${result.error}`);
  return result;
}

function frameOf(input: Uint8Array | string, mode: McMode) {
  const parsed = parseMcFrame(input, mode);
  if (!parsed.ok) throw new Error(`parse failed: ${parsed.error}`);
  return parsed.frame;
}

const request = (input: Uint8Array | string, mode: McMode) => frameOf(input, mode) as McRequestFrame;
const response = (input: Uint8Array | string, mode: McMode) => frameOf(input, mode) as McResponseFrame;

describe("§ field encoding — little-endian vs upper digit first", () => {
  it("writes the manual's field examples in both forms", () => {
    for (const v of Object.values(vectors.fieldEncoding).filter(
      (x): x is { value: number; binary: string; ascii: string } => typeof x === "object",
    )) {
      const bytes = mcLeBytes(v.value, norm(v.binary).length / 2);
      expect(norm(bytes.map((b) => b.toString(16).padStart(2, "0")).join(""))).toBe(norm(v.binary));
      expect(mcAsciiField(v.value, v.ascii.length)).toBe(v.ascii);
    }
  });

  it("reads them back", () => {
    expect(mcLeValue([0x18, 0x00], 0, 2)).toBe(24);
    expect(mcLeValue([0xff, 0x03], 0, 2)).toBe(1023);
    expect(mcAsciiValue("0018", 0, 4)).toBe(24);
    expect(mcAsciiValue("03FF", 0, 4)).toBe(1023);
  });

  it("0401H is 01 04 in binary and \"0401\" in ASCII — the orders are opposites", () => {
    expect(mcLeBytes(MC_COMMAND_BATCH_READ, 2)).toEqual([0x01, 0x04]);
    expect(mcAsciiField(MC_COMMAND_BATCH_READ, 4)).toBe("0401");
  });

  it("rejects short or non-hex ASCII fields, and out-of-range LE reads", () => {
    expect(mcAsciiValue("00", 0, 4)).toBeNaN();
    expect(mcAsciiValue("00G0", 0, 4)).toBeNaN();
    expect(mcAsciiValue("00A0", 0, 4, 10)).toBeNaN();
    expect(mcLeValue([0x01], 0, 2)).toBeNaN();
  });
});

describe("§ device codes", () => {
  it("carries the manual's binary code and both ASCII forms", () => {
    expect(mcDeviceBySymbol("D")).toMatchObject({ code: 0xa8, ascii2: "D*", ascii4: "D***", radix: "decimal" });
    expect(mcDeviceBySymbol("M")).toMatchObject({ code: 0x90, ascii2: "M*", radix: "decimal" });
    expect(mcDeviceBySymbol("X")).toMatchObject({ code: 0x9c, ascii2: "X*", radix: "hexadecimal" });
    expect(mcDeviceBySymbol("Y")).toMatchObject({ code: 0x9d, radix: "hexadecimal" });
    expect(mcDeviceBySymbol("TN")).toMatchObject({ code: 0xc2, ascii2: "TN", ascii4: "TN**", radix: "decimal" });
    expect(mcDeviceBySymbol("ZR")).toMatchObject({ code: 0xb0, radix: "hexadecimal" });
    expect(mcDeviceBySymbol("SM")).toMatchObject({ code: 0x91, radix: "decimal" });
  });

  it("every code is unique and reversible", () => {
    const codes = new Set(MC_DEVICE_CODES.map((d) => d.code));
    expect(codes.size).toBe(MC_DEVICE_CODES.length);
    for (const d of MC_DEVICE_CODES) {
      expect(mcDeviceByCode(d.code)).toBe(d);
      expect(mcDeviceByAscii(d.ascii2)).toBe(d);
      expect(mcDeviceByAscii(d.ascii4)).toBe(d);
    }
  });

  it("X/Y/B/W/ZR/SB/SW/DX/DY are the hexadecimal-notation devices", () => {
    const hex = MC_DEVICE_CODES.filter((d) => d.radix === "hexadecimal").map((d) => d.symbol).sort();
    expect(hex).toEqual(["B", "DX", "DY", "SB", "SW", "W", "X", "Y", "ZR"]);
  });

  it("parses device text in the device's own radix", () => {
    expect(parseMcDevice("D100")).toMatchObject({ ok: true, ref: { number: 100 } });
    expect(parseMcDevice("M1234")).toMatchObject({ ok: true, ref: { number: 1234 } });
    expect(parseMcDevice("X1234")).toMatchObject({ ok: true, ref: { number: 0x1234 } });
    expect(parseMcDevice("tn100")).toMatchObject({ ok: true, ref: { number: 100, text: "TN100" } });
    expect(parseMcDevice(" zr1f ")).toMatchObject({ ok: true, ref: { number: 31, text: "ZR1F" } });
    expect(parseMcDevice("DX10")).toMatchObject({ ok: true, ref: { number: 16 } });
  });

  it("rejects digits the radix does not have", () => {
    expect(parseMcDevice("D1F").ok).toBe(false);
    expect(parseMcDevice("X1G").ok).toBe(false);
    expect(parseMcDevice("D").ok).toBe(false);
    expect(parseMcDevice("QQ1").ok).toBe(false);
    expect(parseMcDevice("").ok).toBe(false);
  });

  it("formats back into the notation it came from", () => {
    expect(formatMcDevice(mcDeviceBySymbol("X")!, 0x1234)).toBe("X1234");
    expect(formatMcDevice(mcDeviceBySymbol("M")!, 1234)).toBe("M1234");
  });
});

describe("§ head device No. encoding", () => {
  const { m1234, x1234 } = vectors.deviceNumbers;

  it("M1234 (decimal notation) → D2 04 00 / \"001234\"", () => {
    expect(norm(hex(mcLeBytes(m1234.number, 3)))).toBe(norm(m1234.binary));
    expect(mcAsciiField(m1234.number, 6, 10)).toBe(m1234.ascii);
  });

  it("X1234 (hexadecimal notation) → 34 12 00, the same digits meaning another point", () => {
    expect(norm(hex(mcLeBytes(x1234.number, 3)))).toBe(norm(x1234.binary));
    expect(mcAsciiField(x1234.number, 6, 16)).toBe(x1234.ascii);
    expect(x1234.number).not.toBe(m1234.number);
  });
});

describe("§ subcommands", () => {
  it("word/bit units per series", () => {
    expect(mcSubcommand("q-l", "word")).toBe(vectors.subcommands.qlWord);
    expect(mcSubcommand("q-l", "bit")).toBe(vectors.subcommands.qlBit);
    expect(mcSubcommand("iq-r", "word")).toBe(vectors.subcommands.iqrWord);
    expect(mcSubcommand("iq-r", "bit")).toBe(vectors.subcommands.iqrBit);
  });

  it("reads back to a series and unit, and refuses to invent others", () => {
    expect(mcSubcommandMeaning(0x0001)).toEqual({ series: "q-l", unit: "bit" });
    expect(mcSubcommandMeaning(0x0003)).toEqual({ series: "iq-r", unit: "bit" });
    expect(mcSubcommandMeaning(0x0005)).toBeNull();
  });
});

describe("§ complete ASCII request frames (E71 sample program)", () => {
  const f = vectors.asciiFrames;

  it("batch read D0-D4", () => {
    const r = built(
      buildMcRequest({
        mode: "ascii",
        command: "batch-read",
        unit: "word",
        device: "D0",
        points: 5,
        monitoringTimer: f.readD0to4.monitoringTimer,
      }),
    );
    expect(r.text).toBe(f.readD0to4.frame);
    expect(r.requestDataLength).toBe(f.readD0to4.requestDataLength);
  });

  it("batch write D0-D4", () => {
    const r = built(
      buildMcRequest({
        mode: "ascii",
        command: "batch-write",
        unit: "word",
        device: "D0",
        points: 5,
        data: f.writeD0to4.words,
        monitoringTimer: f.writeD0to4.monitoringTimer,
      }),
    );
    expect(r.text).toBe(f.writeD0to4.frame);
    expect(r.requestDataLength).toBe(f.writeD0to4.requestDataLength);
  });

  it("the same write addressed to the control-system CPU (I/O No. 03D0H)", () => {
    const r = built(
      buildMcRequest({
        mode: "ascii",
        command: "batch-write",
        unit: "word",
        device: "D0",
        points: 5,
        data: f.writeD0to4.words,
        monitoringTimer: f.writeD0to4.monitoringTimer,
        ioNo: f.writeD0to4ControlCpu.ioNo,
      }),
    );
    expect(r.text).toBe(f.writeD0to4ControlCpu.frame);
  });

  it("parses the read frame back into every header field", () => {
    const fr = request(f.readD0to4.frame, "ascii");
    expect(fr.kind).toBe("request");
    expect(fr.networkNo).toBe(f.readD0to4.networkNo);
    expect(fr.pcNo).toBe(f.readD0to4.pcNo);
    expect(fr.ioNo).toBe(f.readD0to4.ioNo);
    expect(fr.stationNo).toBe(f.readD0to4.stationNo);
    expect(fr.dataLength).toBe(f.readD0to4.requestDataLength);
    expect(fr.dataLengthOk).toBe(true);
    expect(fr.monitoringTimer).toBe(f.readD0to4.monitoringTimer);
    expect(fr.monitoringTimerLabel).toBe("10 × 250 ms = 2.5 s");
    expect(fr.command).toBe(f.readD0to4.command);
    expect(fr.commandName).toBe("Batch read");
    expect(fr.subcommand).toBe(f.readD0to4.subcommand);
    expect(fr.subcommandName).toBe("Word units (MELSEC-Q/L)");
    expect(fr.series).toBe("q-l");
    expect(fr.unit).toBe("word");
    expect(fr.device?.text).toBe(f.readD0to4.device);
    expect(fr.points).toBe(f.readD0to4.points);
    expect(fr.writeData).toBeNull();
  });

  it("parses the write frame back to its word values", () => {
    const fr = request(f.writeD0to4.frame, "ascii");
    expect(fr.command).toBe(MC_COMMAND_BATCH_WRITE);
    expect(fr.commandName).toBe("Batch write");
    expect(fr.points).toBe(f.writeD0to4.points);
    expect(fr.writeData).toEqual(f.writeD0to4.words);
    expect(fr.note).toBeUndefined();
  });

  it("host access route defaults match the manual's 00 FF FF 03 00", () => {
    const r = built(buildMcRequest({ mode: "binary", command: "batch-read", unit: "word", device: "D0", points: 1 }));
    expect(norm(r.text).slice(4, 14)).toBe(norm(vectors.host.binary));
    const a = built(buildMcRequest({ mode: "ascii", command: "batch-read", unit: "word", device: "D0", points: 1 }));
    expect(a.text.slice(4, 14)).toBe(vectors.host.ascii);
  });

  it("a monitoring timer of 0000H means wait forever", () => {
    const r = built(buildMcRequest({ mode: "ascii", command: "batch-read", unit: "word", device: "D0", points: 1 }));
    expect(request(r.text, "ascii").monitoringTimerLabel).toContain("Wait forever");
  });
});

describe("§ request data sections (batch read/write examples)", () => {
  const d = vectors.dataSections;

  const cases = [
    { name: "read TN100-TN102, word units", v: d.readTn100Word, command: "batch-read" as const, data: undefined },
    { name: "read M100-M131, word units", v: d.readM100Word, command: "batch-read" as const, data: undefined },
    { name: "read M100-M107, bit units", v: d.readM100Bit, command: "batch-read" as const, data: undefined },
    { name: "write D100-D102, word units", v: d.writeD100Word, command: "batch-write" as const, data: d.writeD100Word.words },
    { name: "write M100-M107, bit units", v: d.writeM100Bit, command: "batch-write" as const, data: d.writeM100Bit.bits },
  ];

  for (const c of cases) {
    it(`${c.name} — binary`, () => {
      const r = buildMcRequestData({
        mode: "binary",
        command: c.command,
        unit: c.v.unit as "word" | "bit",
        device: c.v.device,
        points: c.v.points,
        data: c.data,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(norm(r.text)).toBe(norm(c.v.binaryRequest));
    });
  }

  for (const c of cases.filter((x) => "asciiRequest" in x.v)) {
    it(`${c.name} — ASCII`, () => {
      const r = buildMcRequestData({
        mode: "ascii",
        command: c.command,
        unit: c.v.unit as "word" | "bit",
        device: c.v.device,
        points: c.v.points,
        data: c.data,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.text).toBe((c.v as { asciiRequest: string }).asciiRequest);
    });
  }
});

describe("§ the binary/ASCII device-order asymmetry", () => {
  const opts = { command: "batch-read" as const, unit: "word" as const, device: "TN100", points: 3 };

  it("binary sends the head device No. BEFORE the device code", () => {
    const r = buildMcRequestData({ ...opts, mode: "binary" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields.map((x) => x.name)).toEqual([
      "Command",
      "Subcommand",
      "Head device No.",
      "Device code",
      "No. of points",
    ]);
    // 64 00 00 (device number 100) then C2 (TN)
    expect(Array.from(r.bytes.slice(4, 8))).toEqual([0x64, 0x00, 0x00, 0xc2]);
  });

  it("ASCII sends the device code BEFORE the head device No.", () => {
    const r = buildMcRequestData({ ...opts, mode: "ascii" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields.map((x) => x.name)).toEqual([
      "Command",
      "Subcommand",
      "Device code",
      "Head device No.",
      "No. of points",
    ]);
    expect(r.text.slice(8, 16)).toBe("TN000100");
  });

  it("swapping the mode swaps the order, so the two data sections are not reorderings of each other", () => {
    const b = buildMcRequestData({ ...opts, mode: "binary" });
    const a = buildMcRequestData({ ...opts, mode: "ascii" });
    expect(b.ok && a.ok).toBe(true);
    if (!b.ok || !a.ok) return;
    const names = (r: typeof b) => r.fields.map((x) => x.name).join("|");
    expect(names(b)).not.toBe(names(a));
    expect(b.fields[2]!.name).toBe(a.fields[3]!.name);
    expect(b.fields[3]!.name).toBe(a.fields[2]!.name);
  });

  it("a frame decoded with the other mode's rules does not come back as the same device", () => {
    const asciiFrame = built(
      buildMcRequest({ mode: "ascii", command: "batch-read", unit: "word", device: "TN100", points: 3 }),
    ).text;
    // Reading the ASCII characters as if they were binary octets is nonsense —
    // the engine refuses at the subheader rather than inventing a device.
    const misread = parseMcFrame(Uint8Array.from(asciiFrame, (ch) => ch.charCodeAt(0)), "binary");
    expect(misread.ok).toBe(false);
  });
});

describe("§ read/write data ordering", () => {
  const d = vectors.dataSections;

  it("word data is one word per two bytes, low byte first", () => {
    expect(decodeMcWordData("binary", d.readTn100Word.binaryResponseData)).toEqual(d.readTn100Word.words);
    expect(norm(encodeMcWordData("binary", d.readTn100Word.words).text)).toBe(norm(d.readTn100Word.binaryResponseData));
  });

  it("word data in ASCII is four hex characters per word, upper digit first", () => {
    expect(decodeMcWordData("ascii", d.readTn100Word.asciiResponseData)).toEqual(d.readTn100Word.words);
    expect(encodeMcWordData("ascii", d.readTn100Word.words).text).toBe(d.readTn100Word.asciiResponseData);
  });

  it("bit data packs two points per byte, high nibble first", () => {
    expect(decodeMcBitData("binary", d.readM100Bit.binaryResponseData, d.readM100Bit.points)).toEqual(
      d.readM100Bit.bits,
    );
    expect(norm(encodeMcBitData("binary", d.readM100Bit.bits).text)).toBe(norm(d.readM100Bit.binaryResponseData));
  });

  it("bit data in ASCII is one character per point", () => {
    expect(decodeMcBitData("ascii", d.readM100Bit.asciiResponseData, d.readM100Bit.points)).toEqual(
      d.readM100Bit.bits,
    );
    expect(encodeMcBitData("ascii", d.readM100Bit.bits).text).toBe(d.readM100Bit.asciiResponseData);
  });

  it("an odd bit count pads the last byte with 0", () => {
    expect(norm(encodeMcBitData("binary", [1, 0, 1]).text)).toBe("1010");
    expect(decodeMcBitData("binary", "10 10", 3)).toEqual([1, 0, 1]);
  });

  it("booleans are accepted as bits", () => {
    expect(encodeMcBitData("ascii", [true, false, true, true]).text).toBe("1011");
  });

  it("word data of the same values reads back through a built write frame", () => {
    const words = [0x1995, 0x1202, 0x1130];
    const r = built(
      buildMcRequest({ mode: "binary", command: "batch-write", unit: "word", device: "D100", points: 3, data: words }),
    );
    expect(request(r.bytes, "binary").writeData).toEqual(words);
  });
});

describe("§ MELSEC iQ-R field widths", () => {
  it("binary uses a 4-byte head device No. and a 2-byte device code", () => {
    const r = buildMcRequestData({
      mode: "binary",
      series: "iq-r",
      command: "batch-read",
      unit: "word",
      device: "D100",
      points: 3,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 01 04 | 02 00 | 64 00 00 00 | A8 00 | 03 00
    expect(norm(r.text)).toBe(norm("01 04 02 00 64 00 00 00 A8 00 03 00"));
  });

  it("ASCII uses the 4-character device code and an 8-digit head device No.", () => {
    const r = buildMcRequestData({
      mode: "ascii",
      series: "iq-r",
      command: "batch-read",
      unit: "bit",
      device: "M100",
      points: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toBe("04010003M***000001000008");
  });

  it("round-trips through the parser, which recovers the series from the subcommand", () => {
    const r = built(
      buildMcRequest({ mode: "binary", series: "iq-r", command: "batch-read", unit: "word", device: "ZR1F", points: 2 }),
    );
    const fr = request(r.bytes, "binary");
    expect(fr.series).toBe("iq-r");
    expect(fr.subcommandName).toBe("Word units (MELSEC iQ-R)");
    expect(fr.device?.text).toBe("ZR1F");
    expect(fr.points).toBe(2);
  });
});

describe("§ point limits", () => {
  const base = { command: "batch-read" as const, device: "D0", unit: "word" as const };

  it("word units accept 1-960 and refuse 0 or 961", () => {
    expect(buildMcRequestData({ ...base, mode: "binary", points: MC_MAX_POINTS_WORD }).ok).toBe(true);
    expect(buildMcRequestData({ ...base, mode: "binary", points: MC_MAX_POINTS_WORD + 1 }).ok).toBe(false);
    expect(buildMcRequestData({ ...base, mode: "binary", points: 0 }).ok).toBe(false);
    expect(vectors.pointLimits.word).toBe(MC_MAX_POINTS_WORD);
  });

  it("bit units allow 3584 in ASCII but 7168 in binary", () => {
    const bit = { command: "batch-read" as const, device: "M0", unit: "bit" as const };
    expect(buildMcRequestData({ ...bit, mode: "ascii", points: MC_MAX_POINTS_BIT_ASCII }).ok).toBe(true);
    expect(buildMcRequestData({ ...bit, mode: "ascii", points: MC_MAX_POINTS_BIT_ASCII + 1 }).ok).toBe(false);
    expect(buildMcRequestData({ ...bit, mode: "binary", points: MC_MAX_POINTS_BIT_ASCII + 1 }).ok).toBe(true);
    expect(buildMcRequestData({ ...bit, mode: "binary", points: MC_MAX_POINTS_BIT_BINARY }).ok).toBe(true);
    expect(buildMcRequestData({ ...bit, mode: "binary", points: MC_MAX_POINTS_BIT_BINARY + 1 }).ok).toBe(false);
    expect(vectors.pointLimits.bitAscii).toBe(MC_MAX_POINTS_BIT_ASCII);
    expect(vectors.pointLimits.bitBinary).toBe(MC_MAX_POINTS_BIT_BINARY);
  });

  it("a head device No. wider than its field is rejected", () => {
    expect(buildMcRequestData({ ...base, mode: "ascii", device: { symbol: "D", number: 1_000_000 }, points: 1 }).ok).toBe(false);
    expect(buildMcRequestData({ ...base, mode: "binary", device: { symbol: "D", number: 0xffffff }, points: 1 }).ok).toBe(true);
    expect(buildMcRequestData({ ...base, mode: "binary", device: { symbol: "D", number: 0x1000000 }, points: 1 }).ok).toBe(false);
  });
});

describe("§ build rejections", () => {
  it("write data must match the point count and the unit", () => {
    const w = { mode: "binary" as const, command: "batch-write" as const, device: "D0" };
    expect(buildMcRequestData({ ...w, unit: "word", points: 2, data: [1] }).ok).toBe(false);
    expect(buildMcRequestData({ ...w, unit: "word", points: 1 }).ok).toBe(false);
    expect(buildMcRequestData({ ...w, unit: "word", points: 1, data: [0x10000] }).ok).toBe(false);
    expect(buildMcRequestData({ ...w, unit: "bit", points: 2, data: [1, 2] }).ok).toBe(false);
    expect(buildMcRequestData({ ...w, unit: "bit", points: 2, data: [1, 0] }).ok).toBe(true);
  });

  it("a batch read carries no write data", () => {
    const r = buildMcRequestData({
      mode: "binary",
      command: "batch-read",
      unit: "word",
      device: "D0",
      points: 1,
      data: [1],
    });
    expect(r.ok).toBe(false);
  });

  it("unknown devices and out-of-range header fields are refused", () => {
    expect(buildMcRequest({ mode: "binary", command: "batch-read", unit: "word", device: "QQ0", points: 1 }).ok).toBe(false);
    expect(
      buildMcRequest({ mode: "binary", command: "batch-read", unit: "word", device: "D0", points: 1, pcNo: 0x100 }).ok,
    ).toBe(false);
    expect(
      buildMcRequest({ mode: "binary", command: "batch-read", unit: "word", device: "D0", points: 1, ioNo: 0x10000 }).ok,
    ).toBe(false);
  });
});

describe("§ responses", () => {
  const n = vectors.response.normalRead;
  const a = vectors.response.abnormal;

  it("binary normal completion: end code 0000H and the read data", () => {
    const fr = response(n.binary, "binary");
    expect(fr.kind).toBe("response");
    expect(fr.subheader).toBe(0xd000);
    expect(fr.endCode).toBe(n.endCode);
    expect(fr.success).toBe(true);
    expect(fr.dataLength).toBe(n.responseDataLengthBinary);
    expect(fr.dataLengthOk).toBe(true);
    expect(fr.errorInformation).toBeNull();
    expect(decodeMcWordData("binary", fr.data)).toEqual(n.words);
  });

  it("ASCII normal completion, with the end code at character 18", () => {
    const fr = response(n.ascii, "ascii");
    expect(n.ascii.slice(vectors.response.endCodeAsciiCharOffset, 22)).toBe("0000");
    expect(fr.endCode).toBe(n.endCode);
    expect(fr.success).toBe(true);
    expect(fr.dataLength).toBe(n.responseDataLengthAscii);
    expect(fr.dataText).toBe("123400021DEF");
    expect(decodeMcWordData("ascii", fr.dataText)).toEqual(n.words);
  });

  it("abnormal completion surfaces the code and the error information block", () => {
    for (const [text, mode] of [
      [a.binary, "binary"],
      [a.ascii, "ascii"],
    ] as const) {
      const fr = response(text, mode);
      expect(fr.success).toBe(false);
      expect(fr.endCode).toBe(a.endCode);
      expect(fr.errorInformation).toEqual(a.errorInformation);
      expect(fr.dataLengthOk).toBe(true);
      expect(fr.data.length).toBe(0);
    }
  });

  it("does not claim to know what a non-zero end code means", () => {
    const fr = response(a.binary, "binary");
    expect(Object.keys(fr)).not.toContain("endCodeName");
    expect(Object.keys(fr)).not.toContain("endCodeMeaning");
  });

  it("a write response carries no data", () => {
    const fr = response("D0 00 00 FF FF 03 00 02 00 00 00", "binary");
    expect(fr.success).toBe(true);
    expect(fr.data.length).toBe(0);
    expect(fr.dataLengthOk).toBe(true);
  });
});

describe("§ parse rejections and cross-checks", () => {
  it("rejects a subheader that is neither 5000 nor D000", () => {
    expect(parseMcFrame("60 00 00 FF FF 03 00 02 00 00 00", "binary").ok).toBe(false);
    expect(parseMcFrame("600000FF03FF00000400", "ascii").ok).toBe(false);
  });

  it("rejects frames that stop inside the header", () => {
    expect(parseMcFrame("50 00 00 FF", "binary").ok).toBe(false);
    expect(parseMcFrame("500000FF03FF", "ascii").ok).toBe(false);
  });

  it("rejects binary input that is not hex", () => {
    expect(parseMcFrame("50 00 ZZ", "binary").ok).toBe(false);
    expect(parseMcFrame("500", "binary").ok).toBe(false);
  });

  it("flags a request data length field that disagrees with the frame", () => {
    const fr = request("500000FF03FF000099000A04010000D*0000000005", "ascii");
    expect(fr.dataLength).toBe(0x0099);
    expect(fr.actualDataLength).toBe(24);
    expect(fr.dataLengthOk).toBe(false);
  });

  it("keeps an unknown command's request data raw instead of guessing", () => {
    const fr = request("50 00 00 FF FF 03 00 0A 00 00 00 01 06 00 00 64 00 00 A8", "binary");
    expect(fr.commandName).toBe("Command 0601H");
    expect(fr.device).toBeNull();
    expect(fr.points).toBeNull();
    expect(fr.note).toMatch(/not decoded/);
    expect(norm(fr.dataText)).toBe("640000A8");
  });

  it("notes a device code the table does not have", () => {
    const fr = request("50 00 00 FF FF 03 00 0C 00 00 00 01 04 00 00 64 00 00 FE 03 00", "binary");
    expect(fr.device).toBeNull();
    expect(fr.points).toBe(3);
    expect(fr.note).toMatch(/not a known device/);
  });

  it("round-trips every mode/series/unit combination", () => {
    const combos = [
      { mode: "binary", series: "q-l", unit: "word", device: "D100", points: 3, data: [1, 2, 3] },
      { mode: "ascii", series: "q-l", unit: "word", device: "W1F", points: 2, data: [0xabcd, 0x0001] },
      { mode: "binary", series: "q-l", unit: "bit", device: "M100", points: 5, data: [1, 0, 1, 1, 0] },
      { mode: "ascii", series: "q-l", unit: "bit", device: "X1234", points: 4, data: [0, 0, 1, 1] },
      { mode: "binary", series: "iq-r", unit: "word", device: "R500", points: 1, data: [0xffff] },
      { mode: "ascii", series: "iq-r", unit: "bit", device: "SB1A", points: 3, data: [1, 1, 1] },
    ] as const;

    for (const c of combos) {
      const r = built(
        buildMcRequest({
          mode: c.mode,
          series: c.series,
          command: "batch-write",
          unit: c.unit,
          device: c.device,
          points: c.points,
          data: [...c.data],
          monitoringTimer: 0x0010,
        }),
      );
      const fr = request(c.mode === "binary" ? r.bytes : r.text, c.mode);
      expect(fr.series).toBe(c.series);
      expect(fr.unit).toBe(c.unit);
      expect(fr.device?.text).toBe(c.device);
      expect(fr.points).toBe(c.points);
      expect(fr.writeData).toEqual([...c.data]);
      expect(fr.monitoringTimer).toBe(0x0010);
      expect(fr.dataLengthOk).toBe(true);
      expect(fr.note).toBeUndefined();
    }
  });
});

/** Local hex dump for vector comparisons. */
function hex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}
