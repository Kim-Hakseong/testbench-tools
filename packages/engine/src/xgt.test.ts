import { describe, expect, it } from "vitest";
import {
  buildXgtFrame,
  computeBcc,
  parseXgtFrame,
  xgtAsciiBytes,
  xgtDataTypeChars,
  xgtDataTypeOf,
  xgtErrorText,
  XGT_CONTROL,
  XGT_ERROR_CODES,
  type XgtParsedFrame,
} from "./xgt";
import vectors from "../vectors/xgt.json";

const ENQ = String.fromCharCode(XGT_CONTROL.ENQ);
const EOT = String.fromCharCode(XGT_CONTROL.EOT);
const ACK = String.fromCharCode(XGT_CONTROL.ACK);
const NAK = String.fromCharCode(XGT_CONTROL.NAK);
const ETX = String.fromCharCode(XGT_CONTROL.ETX);

const request = (body: string, bcc?: string) => ENQ + body + EOT + (bcc ?? "");
const ackFrame = (body: string, bcc?: string) => ACK + body + ETX + (bcc ?? "");
const nakFrame = (body: string, bcc?: string) => NAK + body + ETX + (bcc ?? "");

/** Parse and assert success, so each test can go straight at the fields. */
function parsed(text: string): XgtParsedFrame {
  const result = parseXgtFrame(text);
  if (!result.ok) throw new Error(`expected a frame, got: ${result.error}`);
  return result.frame;
}

describe("XGT Cnet BCC", () => {
  it("reproduces the one BCC value printed in the manual", () => {
    // ENQ + "20rSS0106%MW100" + EOT sums to H03A4 → "A4".
    const framed = request(vectors.manualBcc.body);
    expect(computeBcc(xgtAsciiBytes(framed))).toBe(vectors.manualBcc.bcc);
  });

  it("matches the manual's own arithmetic byte for byte", () => {
    const wire = vectors.manualBcc.wireBytes.map((b) => parseInt(b, 16));
    // Every byte of the frame as printed, BCC characters included.
    expect(xgtAsciiBytes(request(vectors.manualBcc.body, vectors.manualBcc.bcc))).toEqual(wire);

    // ENQ..EOT inclusive — the BCC characters themselves are not summed.
    const summed = wire.slice(0, wire.length - 2);
    const sum = summed.reduce((a, b) => a + b, 0);
    expect(sum).toBe(Number(vectors.manualBcc.sum));
    expect(computeBcc(summed)).toBe(vectors.manualBcc.bcc);
  });

  it("is a plain unsigned 8-bit sum — no XOR, no seed, no complement", () => {
    expect(computeBcc([])).toBe("00");
    expect(computeBcc([0x01, 0x02])).toBe("03");
    expect(computeBcc([0xff, 0x01])).toBe("00"); // wraps at 256
    expect(computeBcc(Uint8Array.from([0x80, 0x80, 0x0a]))).toBe("0A");
  });

  it("renders two uppercase hex characters", () => {
    expect(computeBcc([0x0a])).toBe("0A");
    expect(computeBcc([0xab])).toBe("AB");
  });
});

describe("§ building requests", () => {
  it("builds the manual's individual read frame exactly", () => {
    const built = buildXgtFrame({ station: "20", command: "RSS", variables: ["%MW100"] });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.frame.body).toBe(vectors.manualBcc.body);
    expect(built.frame.bcc).toBe(vectors.manualBcc.bcc);
    expect(built.frame.text).toBe(request(vectors.manualBcc.body, vectors.manualBcc.bcc));
    expect(built.frame.display).toBe("<ENQ>20rSS0106%MW100<EOT>A4");
    expect(built.frame.notes).toEqual([]);
  });

  it("an uppercase command carries no BCC at all", () => {
    const built = buildXgtFrame({
      station: 0x20,
      command: "RSS",
      variables: ["%MW100"],
      useBcc: false,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.frame.body).toBe("20RSS0106%MW100");
    expect(built.frame.bcc).toBeNull();
    expect(built.frame.text).toBe(request("20RSS0106%MW100"));
  });

  it("RSS: two blocks, variable size is the name's character count", () => {
    const v = vectors.readIndividualRequest;
    const built = buildXgtFrame({ station: v.station, command: "RSS", variables: v.variables });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.frame.body).toBe(v.body);
    expect(built.frame.dataArea).toBe("0206%MW02006%PW001");
    expect(built.frame.bcc).toBe(v.bcc);
  });

  it("WSS: block is size + name + data", () => {
    const v = vectors.writeIndividualRequest;
    const built = buildXgtFrame({ station: v.station, command: "WSS", blocks: v.blocks });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.frame.body).toBe(v.body);
    expect(built.frame.bcc).toBe(v.bcc);
    expect(built.frame.notes).toEqual([]);
  });

  it("RSB: no block count, a trailing number of data", () => {
    const v = vectors.readContinuousRequest;
    const built = buildXgtFrame({ station: v.station, command: "RSB", name: v.name, count: v.count });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.frame.body).toBe(v.body);
    expect(built.frame.bcc).toBe(v.bcc);
  });

  it("WSB: size + name + count + data", () => {
    const v = vectors.writeContinuousRequest;
    const built = buildXgtFrame({
      station: v.station,
      command: "WSB",
      name: v.name,
      count: v.count,
      data: v.data,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.frame.body).toBe(v.body);
    expect(built.frame.bcc).toBe(v.bcc);
    // %DW000 is the D area, WORD type — one word is 4 characters, so "AA15" fits.
    expect(xgtDataTypeOf(v.name)).toBe("W");
    expect(built.frame.notes).toEqual([]);
  });

  it("lower-cases the name and accepts a numeric station", () => {
    const built = buildXgtFrame({ station: 1, command: "RSS", variables: ["%mw020", "%pw001"] });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.frame.body).toBe(vectors.readIndividualRequest.body);
  });

  it("rejects over 16 blocks, an oversized name and a missing type letter", () => {
    const many = Array.from({ length: 17 }, (_, i) => `%MW${i}`);
    const blocks = buildXgtFrame({ station: "01", command: "RSS", variables: many });
    expect(blocks.ok).toBe(false);
    if (!blocks.ok) expect(blocks.error).toContain("0003");

    const long = buildXgtFrame({ station: "01", command: "RSS", variables: ["%MW1234567890"] });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.error).toContain("0004");

    const type = buildXgtFrame({ station: "01", command: "RSS", variables: ["%MZ100"] });
    expect(type.ok).toBe(false);
    if (!type.ok) expect(type.error).toContain("0007");
  });

  it("rejects mixed data types in one frame and over 60 words", () => {
    const mixed = buildXgtFrame({ station: "01", command: "RSS", variables: ["%MW100", "%MB100"] });
    expect(mixed.ok).toBe(false);
    if (!mixed.ok) expect(mixed.error).toContain("1332");

    const big = buildXgtFrame({ station: "01", command: "RSB", name: "%MW000", count: 61 });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toContain("1232");

    expect(buildXgtFrame({ station: "01", command: "RSB", name: "%MW000", count: 60 }).ok).toBe(true);
  });

  it("rejects a bad station and non-hex data", () => {
    expect(buildXgtFrame({ station: "1", command: "RSS", variables: ["%MW100"] }).ok).toBe(false);
    expect(buildXgtFrame({ station: 256, command: "RSS", variables: ["%MW100"] }).ok).toBe(false);
    expect(
      buildXgtFrame({ station: "01", command: "WSS", blocks: [{ name: "%MW230", data: "XYZ0" }] }).ok,
    ).toBe(false);
  });

  it("notes a data width that does not match the type, but still builds", () => {
    const built = buildXgtFrame({
      station: "01",
      command: "WSS",
      blocks: [{ name: "%MW230", data: "FF" }],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.frame.notes.length).toBe(1);
    expect(built.frame.notes[0]).toContain("4 characters");
  });
});

describe("§ parsing requests", () => {
  it("decodes the manual's individual read", () => {
    const f = parsed(request(vectors.manualBcc.body, vectors.manualBcc.bcc));
    expect(f.kind).toBe("ENQ");
    expect(f.direction).toBe("request");
    expect(f.stationText).toBe("20");
    expect(f.station).toBe(0x20);
    expect(f.command.letter).toBe("R");
    expect(f.command.lowercase).toBe(true);
    expect(f.commandCode).toBe("RSS");
    expect(f.mode).toBe("individual");
    expect(f.blocks).toEqual([{ variableSize: 6, name: "%MW100", dataType: "W" }]);
    expect(f.bccValid).toBe(true);
    expect(f.bccStatus).toBe("valid");
    expect(f.notes).toEqual([]);
  });

  it("decodes a two-block read request", () => {
    const v = vectors.readIndividualRequest;
    const f = parsed(request(v.body, v.bcc));
    expect(f.blocks.map((b) => b.name)).toEqual(v.variables);
    expect(f.blocks.every((b) => b.dataType === "W")).toBe(true);
    expect(f.bccStatus).toBe("valid");
  });

  it("decodes an individual write, splitting data by the name's type", () => {
    const v = vectors.writeIndividualRequest;
    const f = parsed(request(v.body, v.bcc));
    expect(f.commandCode).toBe("WSS");
    expect(f.blocks).toEqual([
      { variableSize: 6, name: "%MW230", dataType: "W", data: "00FF" },
    ]);
    expect(f.bccValid).toBe(true);
  });

  it("decodes a continuous read request — no block-count field", () => {
    const v = vectors.readContinuousRequest;
    const f = parsed(request(v.body, v.bcc));
    expect(f.mode).toBe("continuous");
    expect(f.station).toBe(0x0a);
    expect(f.blocks).toEqual([{ variableSize: 6, name: "%MW000", dataType: "W", count: 2 }]);
    expect(f.notes).toEqual([]);
  });

  it("decodes a continuous write request", () => {
    const v = vectors.writeContinuousRequest;
    const f = parsed(request(v.body, v.bcc));
    expect(f.commandCode).toBe("WSB");
    expect(f.blocks).toEqual([
      { variableSize: 6, name: "%DW000", dataType: "W", count: 1, data: "AA15" },
    ]);
    expect(f.bccValid).toBe(true);
  });
});

describe("§ parsing responses", () => {
  it("decodes an individual read ACK: block count, byte count, data", () => {
    const v = vectors.readIndividualAck;
    const f = parsed(ackFrame(v.body, v.bcc));
    expect(f.kind).toBe("ACK");
    expect(f.direction).toBe("response");
    expect(f.isError).toBe(false);
    expect(f.blocks).toEqual([
      { count: 2, data: "1234" },
      { count: 2, data: "5678" },
    ]);
    expect(f.bccStatus).toBe("valid");
    expect(f.notes).toEqual([]);
  });

  it("decodes a write ACK, which has no data area", () => {
    const v = vectors.writeIndividualAck;
    const f = parsed(ackFrame(v.body, v.bcc));
    expect(f.command.letter).toBe("W");
    expect(f.dataArea).toBe("");
    expect(f.blocks).toEqual([]);
    expect(f.bccValid).toBe(true);
  });

  it("decodes a continuous read ACK with the block-count field", () => {
    const v = vectors.readContinuousAck;
    const f = parsed(ackFrame(v.body, v.bcc));
    expect(f.blocks).toEqual([{ count: v.byteCount, data: v.data }]);
    expect(f.notes).toEqual([]);
  });

  it("decodes the manual example that omits the block-count field", () => {
    const v = vectors.readContinuousAckNoBlockField;
    const f = parsed(ackFrame(v.body, v.bcc));
    expect(f.blocks).toEqual([{ count: v.byteCount, data: v.data }]);
    expect(f.notes[0]).toContain("Block-count field absent");
  });

  it("decodes a NAK and names the error", () => {
    const v = vectors.nakResponse;
    const f = parsed(nakFrame(v.body, v.bcc));
    expect(f.kind).toBe("NAK");
    expect(f.isError).toBe(true);
    expect(f.errorCode).toBe(v.errorCode);
    expect(f.errorText).toBe(XGT_ERROR_CODES[v.errorCode]);
    expect(f.bccValid).toBe(true);
  });

  it("flags an error code that is not in the published table", () => {
    const body = "01rSS9999";
    const f = parsed(nakFrame(body, computeBcc(xgtAsciiBytes(NAK + body + ETX))));
    expect(f.errorCode).toBe("9999");
    expect(f.errorText).toBeUndefined();
    expect(f.notes.join(" ")).toContain("not in the published table");
  });
});

describe("§ monitor frames", () => {
  it("decodes a monitor registration and the command it registers", () => {
    const v = vectors.monitorRegisterRequest;
    const f = parsed(request(v.body, v.bcc));
    expect(f.command.letter).toBe("X");
    expect(f.mode).toBe("registration");
    expect(f.registrationNumber).toBe(v.registrationNumber);
    expect(f.registered?.commandCode).toBe(v.registeredCommand);
    expect(f.registered?.blocks.map((b) => b.name)).toEqual(v.variables);
    // The registered command is uppercase, but the BCC follows the outer "x".
    expect(f.bccRequired).toBe(true);
    expect(f.bccValid).toBe(true);
  });

  it("decodes a monitor execute", () => {
    const v = vectors.monitorExecuteRequest;
    const f = parsed(request(v.body, v.bcc));
    expect(f.command.letter).toBe("Y");
    expect(f.registrationNumber).toBe(v.registrationNumber);
    expect(f.dataArea).toBe("");
    expect(f.bccStatus).toBe("valid");
    expect(f.notes).toEqual([]);
  });
});

describe("§ BCC verification is a first-class result", () => {
  const body = vectors.manualBcc.body;

  it("valid when a lowercase command carries the right BCC", () => {
    const f = parsed(request(body, "A4"));
    expect(f.bccRequired).toBe(true);
    expect(f.bccPresent).toBe(true);
    expect(f.bcc).toBe("A4");
    expect(f.expectedBcc).toBe("A4");
    expect(f.bccStatus).toBe("valid");
    expect(f.bccValid).toBe(true);
  });

  it("mismatch when the BCC is wrong, and says what it should be", () => {
    const f = parsed(request(body, "A5"));
    expect(f.bccStatus).toBe("mismatch");
    expect(f.bccValid).toBe(false);
    expect(f.expectedBcc).toBe("A4");
  });

  it("missing when a lowercase command has no BCC", () => {
    const f = parsed(request(body));
    expect(f.bccRequired).toBe(true);
    expect(f.bccPresent).toBe(false);
    expect(f.bccStatus).toBe("missing");
    expect(f.bccValid).toBe(false);
  });

  it("not-required when an uppercase command has none", () => {
    const f = parsed(request("20RSS0106%MW100"));
    expect(f.bccRequired).toBe(false);
    expect(f.bccStatus).toBe("not-required");
    expect(f.bccValid).toBe(true);
  });

  it("unexpected when an uppercase command carries one anyway", () => {
    const upper = "20RSS0106%MW100";
    const f = parsed(request(upper, computeBcc(xgtAsciiBytes(request(upper)))));
    expect(f.bccStatus).toBe("unexpected");
    expect(f.bccValid).toBe(false);
  });

  it("accepts a lowercase BCC on the wire but reports it uppercase", () => {
    const f = parsed(request(body, "a4"));
    expect(f.bcc).toBe("A4");
    expect(f.bccStatus).toBe("valid");
  });

  it("sums the control characters — dropping ENQ/EOT gives a different value", () => {
    expect(computeBcc(xgtAsciiBytes(body))).not.toBe("A4");
  });
});

describe("§ parser input handling", () => {
  it("reads a whitespace-separated hex dump", () => {
    const f = parsed(vectors.manualBcc.wireBytes.join(" "));
    expect(f.body).toBe(vectors.manualBcc.body);
    expect(f.bccStatus).toBe("valid");
  });

  it("reads control characters written as mnemonics", () => {
    const f = parsed("<ENQ>20rSS0106%MW100<EOT>A4");
    expect(f.body).toBe(vectors.manualBcc.body);
    expect(f.bccValid).toBe(true);
  });

  it("rejects text with no header or no tail", () => {
    expect(parseXgtFrame("20rSS0106%MW100").ok).toBe(false);
    expect(parseXgtFrame(ENQ + "20rSS0106%MW100").ok).toBe(false);
    expect(parseXgtFrame("   ").ok).toBe(false);
  });

  it("rejects an unknown command letter and a short body", () => {
    const bad = parseXgtFrame(request("20qSS01"));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("not a command");
    expect(parseXgtFrame(request("20r")).ok).toBe(false);
  });

  it("keeps decoding when a data area runs short, and says so", () => {
    const short = "01rSS0206%MW020";
    const f = parsed(request(short, computeBcc(xgtAsciiBytes(request(short)))));
    expect(f.blocks.length).toBe(1);
    expect(f.notes.join(" ")).toContain("ends before");
    expect(f.bccValid).toBe(true); // the checksum verdict survives a bad payload
  });

  it("round-trips build → parse", () => {
    const built = buildXgtFrame({
      station: "0A",
      command: "WSB",
      name: "%MW000",
      count: 2,
      data: "12345678",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const f = parsed(built.frame.text);
    expect(f.commandCode).toBe("WSB");
    expect(f.blocks[0]).toEqual({
      variableSize: 6,
      name: "%MW000",
      dataType: "W",
      count: 2,
      data: "12345678",
    });
    expect(f.bccValid).toBe(true);
  });
});

describe("§ data types and error table", () => {
  it("type letter is the third character of the name", () => {
    expect(xgtDataTypeOf("%MX0000")).toBe("X");
    expect(xgtDataTypeOf("%MB100")).toBe("B");
    expect(xgtDataTypeOf("%MW100")).toBe("W");
    expect(xgtDataTypeOf("%MD100")).toBe("D");
    expect(xgtDataTypeOf("%ML100")).toBe("L");
    expect(xgtDataTypeOf("%MZ100")).toBeNull();
  });

  it("bit data travels as one byte — two characters", () => {
    expect(xgtDataTypeChars("X")).toBe(2);
    const built = buildXgtFrame({
      station: "01",
      command: "WSS",
      blocks: [{ name: "%MX000", data: "01" }],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.frame.notes).toEqual([]);
    expect(built.frame.dataArea).toBe("0106%MX00001");
  });

  it("widths follow the type letter", () => {
    expect(xgtDataTypeChars("B")).toBe(2);
    expect(xgtDataTypeChars("W")).toBe(4);
    expect(xgtDataTypeChars("D")).toBe(8);
    expect(xgtDataTypeChars("L")).toBe(16);
  });

  it("carries every published error code", () => {
    for (const [code, text] of Object.entries(vectors.errorCodes)) {
      if (code.startsWith("$")) continue;
      expect(XGT_ERROR_CODES[code]).toBeDefined();
      expect(typeof text).toBe("string");
    }
    expect(Object.keys(XGT_ERROR_CODES).length).toBe(13);
    expect(xgtErrorText("1232")).toContain("60 words");
    expect(xgtErrorText("9999")).toBeNull();
  });
});
