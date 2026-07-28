import { describe, expect, it } from "vitest";
import {
  decodeCommandWord,
  decodeMessage,
  decodeStatusWord,
  encodeCommandWord,
  encodeStatusWord,
  lookupModeCode,
  oddParity,
} from "./mil1553";
import vectors from "../vectors/mil1553.json";

describe("MIL-STD-1553B odd parity", () => {
  it("0x183E → 0, 0x2C02 → 1", () => {
    expect(oddParity(0x183e)).toBe(vectors.commandData.parity);
    expect(oddParity(0x2c02)).toBe(vectors.commandMode.parity);
  });
  it("makes the 17-bit total odd", () => {
    for (const w of [0x0000, 0xffff, 0x1234, 0xabcd]) {
      let ones = oddParity(w);
      for (let i = 0; i < 16; i++) ones += (w >> i) & 1;
      expect(ones % 2).toBe(1);
    }
  });
});

describe("§ command word", () => {
  it("data-transfer word 0x183E: RT3, receive, SA1, 30 words", () => {
    const c = decodeCommandWord(Number(vectors.commandData.hex));
    expect(c.rtAddress).toBe(vectors.commandData.rtAddress);
    expect(c.transmit).toBe(vectors.commandData.transmit);
    expect(c.subaddress).toBe(vectors.commandData.subaddress);
    expect(c.isModeCommand).toBe(false);
    expect(c.wordCount).toBe(vectors.commandData.wordCount);
    expect(c.parity).toBe(vectors.commandData.parity);
  });

  it("mode command 0x2C02: RT5, transmit, SA0, mode code 2", () => {
    const c = decodeCommandWord(Number(vectors.commandMode.hex));
    expect(c.rtAddress).toBe(vectors.commandMode.rtAddress);
    expect(c.transmit).toBe(true);
    expect(c.isModeCommand).toBe(true);
    expect(c.modeCode).toBe(vectors.commandMode.modeCode);
    expect(c.mode?.name).toBe(vectors.commandMode.modeName);
    expect(c.wordCount).toBeNull();
  });

  it("word count field 0 means 32 words", () => {
    expect(decodeCommandWord(encodeCommandWord({ rtAddress: 1, transmit: false, subaddress: 2, wordCountOrMode: 32 })).wordCount).toBe(32);
  });

  it("RT address 31 is broadcast", () => {
    expect(decodeCommandWord(encodeCommandWord({ rtAddress: 31, transmit: false, subaddress: 1, wordCountOrMode: 1 })).broadcast).toBe(true);
  });

  it("encode ↔ decode roundtrip", () => {
    expect(encodeCommandWord({ rtAddress: 3, transmit: false, subaddress: 1, wordCountOrMode: 30 })).toBe(0x183e);
    expect(encodeCommandWord({ rtAddress: 5, transmit: true, subaddress: 0, wordCountOrMode: 2 })).toBe(0x2c02);
  });
});

describe("§ mode codes", () => {
  it("code 2 transmit = Transmit Status Word", () => {
    expect(lookupModeCode(true, 2)?.name).toBe("Transmit Status Word");
  });
  it("code 17 receive = Synchronize with data word", () => {
    const m = lookupModeCode(false, 17);
    expect(m?.name).toContain("Synchronize");
    expect(m?.dataWord).toBe(true);
  });
  it("unknown / reserved code returns null", () => {
    expect(lookupModeCode(true, 9)).toBeNull();
  });
});

describe("§ status word", () => {
  it("clean status 0x1800: RT3, no flags", () => {
    const s = decodeStatusWord(Number(vectors.statusClean.hex));
    expect(s.rtAddress).toBe(3);
    expect(s.messageError).toBe(false);
    expect(s.busy).toBe(false);
    expect(s.terminalFlag).toBe(false);
    expect(s.parity).toBe(vectors.statusClean.parity);
  });

  it("busy status 0x1808: RT3 + Busy", () => {
    const s = decodeStatusWord(Number(vectors.statusBusy.hex));
    expect(s.busy).toBe(true);
    expect(s.parity).toBe(vectors.statusBusy.parity);
  });

  it("encodes flags into the right bits", () => {
    const w = encodeStatusWord({ rtAddress: 3, busy: true });
    expect(w).toBe(0x1808);
    expect(decodeStatusWord(encodeStatusWord({ rtAddress: 10, messageError: true, terminalFlag: true })).messageError).toBe(true);
  });
});

describe("§ message decode", () => {
  it("BC → RT transfer lays out command + data×WC + status", () => {
    const words = vectors.message.words.map((h) => Number(h));
    const m = decodeMessage(words);
    expect(m.type).toBe(vectors.message.type);
    expect(m.expectedCount).toBe(vectors.message.expectedCount);
    expect(m.ok).toBe(true);
    expect(m.words.map((w) => w.role)).toEqual(vectors.message.roles);
    expect(m.words[0]!.command?.rtAddress).toBe(5);
    expect(m.words[3]!.status?.rtAddress).toBe(5);
  });

  it("RT → BC puts status before data", () => {
    // RT3 transmit SA1 WC1 → command, status, data
    const cmd = encodeCommandWord({ rtAddress: 3, transmit: true, subaddress: 1, wordCountOrMode: 1 });
    const m = decodeMessage([cmd, encodeStatusWord({ rtAddress: 3 }), 0xdead]);
    expect(m.type).toContain("RT → BC");
    expect(m.words.map((w) => w.role)).toEqual(["command", "status", "data"]);
  });

  it("flags a word-count mismatch", () => {
    const words = vectors.message.words.map((h) => Number(h)).slice(0, 3);
    const m = decodeMessage(words);
    expect(m.ok).toBe(false);
    expect(m.note).toMatch(/Expected/);
  });
});
