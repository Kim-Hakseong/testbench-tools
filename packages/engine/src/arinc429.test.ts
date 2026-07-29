import { describe, expect, it } from "vitest";
import {
  ARINC429_FIELDS,
  BCD_SUBFIELDS,
  DEFAULT_LABEL_BIT_ORDER,
  SSM_BCD,
  SSM_BNR,
  SSM_DISCRETE,
  applyBnrScale,
  arinc429Parity,
  arinc429ParityOk,
  bnrResolution,
  buildArinc429,
  decodeArinc429,
  decodeBcd,
  decodeBnr,
  encodeBcd,
  encodeBnrField,
  labelToOctal,
  octalToLabel,
  parseArinc429,
  reverseLabelBits,
  ssmMeaning,
  withOddParity,
} from "./arinc429";
import vectors from "../vectors/arinc429.json";

const hex = (s: string) => Number(s);

describe("ARINC 429 field map", () => {
  it("matches the documented bit ranges", () => {
    expect(ARINC429_FIELDS.label).toEqual({ first: vectors.fields.label.first, last: vectors.fields.label.last });
    expect(ARINC429_FIELDS.sdi).toEqual({ first: vectors.fields.sdi.first, last: vectors.fields.sdi.last });
    expect(ARINC429_FIELDS.data).toEqual({ first: vectors.fields.data.first, last: vectors.fields.data.last });
    expect(ARINC429_FIELDS.ssm).toEqual({ first: vectors.fields.ssm.first, last: vectors.fields.ssm.last });
    expect(ARINC429_FIELDS.parity.first).toBe(vectors.fields.parity.first);
  });

  it("pulls each field out of a word with one bit set per field", () => {
    // bit 1 (label), bit 9 (SDI), bit 11 (data), bit 30 (SSM), bit 32 (parity)
    const w = decodeArinc429((1 | (1 << 8) | (1 << 10) | (1 << 29) | (1 << 31)) >>> 0);
    expect(w.label.field).toBe(1);
    expect(w.sdi).toBe(1);
    expect(w.data).toBe(1);
    expect(w.ssm).toBe(1);
    expect(w.parityBit).toBe(1);
  });
});

describe("§ label bit order", () => {
  it("reverseLabelBits is its own inverse for all 256 bytes", () => {
    for (let b = 0; b <= 0xff; b++) {
      expect(reverseLabelBits(reverseLabelBits(b))).toBe(b);
    }
  });

  it("matches the published octal ↔ byte pairs", () => {
    for (const v of vectors.labelReversal) {
      expect(parseInt(v.octal, 8)).toBe(v.octalValue);
      expect(reverseLabelBits(v.octalValue)).toBe(v.reversed);
    }
  });

  it("label 213 octal is written as D1 hex under bit1-msb", () => {
    // The example both Holt and Wikipedia use.
    const label = octalToLabel("213", "bit1-msb");
    expect(label.ok && label.labelField).toBe(0xd1);
    expect(labelToOctal(0xd1, "bit1-msb")).toBe("213");
  });

  it("the same byte reads as the other label under bit8-msb", () => {
    expect(labelToOctal(0xd1, "bit8-msb")).toBe("321");
    const label = octalToLabel("213", "bit8-msb");
    expect(label.ok && label.labelField).toBe(0x8b);
  });

  it("round-trips every label 000-377 in both conventions", () => {
    for (const order of ["bit1-msb", "bit8-msb"] as const) {
      for (let value = 0; value <= 0xff; value++) {
        const octal = value.toString(8).padStart(3, "0");
        const label = octalToLabel(octal, order);
        expect(label.ok).toBe(true);
        if (!label.ok) continue;
        expect(label.labelField).toBeLessThanOrEqual(0xff);
        expect(labelToOctal(label.labelField, order)).toBe(octal);
      }
    }
  });

  it("the two conventions differ by exactly a bit reversal", () => {
    for (let field = 0; field <= 0xff; field++) {
      const a = parseInt(labelToOctal(field, "bit1-msb"), 8);
      const b = parseInt(labelToOctal(field, "bit8-msb"), 8);
      expect(a).toBe(reverseLabelBits(b));
    }
  });

  it("always writes three octal digits", () => {
    expect(labelToOctal(0, "bit8-msb")).toBe("000");
    expect(labelToOctal(1, "bit8-msb")).toBe("001");
    expect(labelToOctal(0xff, "bit8-msb")).toBe("377");
  });

  it("accepts short and prefixed octal input", () => {
    const a = octalToLabel("5", "bit8-msb");
    const b = octalToLabel("0o005", "bit8-msb");
    const c = octalToLabel(" 005 ", "bit8-msb");
    expect(a.ok && a.labelField).toBe(5);
    expect(b.ok && b.labelField).toBe(5);
    expect(c.ok && c.labelField).toBe(5);
  });

  it("rejects non-octal, oversized and empty labels", () => {
    expect(octalToLabel("209")).toEqual({ ok: false, error: expect.stringContaining("0-7") });
    expect(octalToLabel("2AB")).toEqual({ ok: false, error: expect.stringContaining("0-7") });
    expect(octalToLabel("400")).toEqual({ ok: false, error: expect.stringContaining("377") });
    expect(octalToLabel("")).toEqual({ ok: false, error: expect.stringContaining("octal label") });
  });

  it("reports both readings so neither convention is silently assumed", () => {
    const w = decodeArinc429(hex(vectors.wordDecode.hex));
    expect(w.label.field).toBe(vectors.wordDecode.labelField);
    expect(w.label.octal).toBe(vectors.wordDecode.labelOctalBit1Msb);
    expect(w.label.octalAlternate).toBe(vectors.wordDecode.labelOctalBit8Msb);
    expect(w.label.bitOrder).toBe(DEFAULT_LABEL_BIT_ORDER);

    const flipped = decodeArinc429(hex(vectors.wordDecode.hex), { labelBitOrder: "bit8-msb" });
    expect(flipped.label.octal).toBe(vectors.wordDecode.labelOctalBit8Msb);
    expect(flipped.label.octalAlternate).toBe(vectors.wordDecode.labelOctalBit1Msb);
  });

  it("GE's tabulated discrete word is label 005 under bit8-msb and 240 under bit1-msb", () => {
    // Table 6 sets label bits 1 and 3 — the source of the convention conflict.
    const word = decodeArinc429((1 | (1 << 2)) >>> 0);
    expect(word.label.field).toBe(0b101);
    expect(labelToOctal(word.label.field, "bit8-msb")).toBe("005");
    expect(labelToOctal(word.label.field, "bit1-msb")).toBe("240");
  });
});

describe("§ parity", () => {
  it("matches every published and derived parity case", () => {
    for (const c of vectors.parity.cases) {
      const word = hex(c.hex);
      let ones = 0;
      for (let i = 0; i < 32; i++) ones += (word >>> i) & 1;
      expect(ones).toBe(c.ones);
      expect(arinc429ParityOk(word)).toBe(c.parityOk);
      expect(((word >>> 31) & 1)).toBe(c.parityBit);
    }
  });

  it("withOddParity makes the 32-bit total odd", () => {
    for (const w of [0x00000000, 0xffffffff, 0x12345678, 0xe00640a1, 0x000002d1]) {
      const fixed = withOddParity(w);
      let ones = 0;
      for (let i = 0; i < 32; i++) ones += (fixed >>> i) & 1;
      expect(ones % 2).toBe(1);
      expect(arinc429ParityOk(fixed)).toBe(true);
      // Only bit 32 may change.
      expect(fixed & 0x7fffffff).toBe(w & 0x7fffffff);
    }
  });

  it("flipping any single bit breaks parity", () => {
    const good = withOddParity(0x12345678);
    for (let bit = 1; bit <= 32; bit++) {
      expect(arinc429ParityOk((good ^ (1 << (bit - 1))) >>> 0)).toBe(false);
    }
  });

  it("reports the expected bit alongside the received one", () => {
    const bad = decodeArinc429(hex("0xE00644A1"));
    expect(bad.parityOk).toBe(false);
    expect(bad.parityBit).toBe(1);
    expect(bad.parityExpected).toBe(0);
    expect(arinc429Parity(hex("0xE00644A1"))).toBe(0);
  });
});

describe("§ SSM", () => {
  it("uses the published table for each data type", () => {
    expect([...SSM_BNR]).toEqual(vectors.ssm.bnr);
    expect([...SSM_BCD]).toEqual(vectors.ssm.bcd);
    expect([...SSM_DISCRETE]).toEqual(vectors.ssm.discrete);
  });

  it("the same code means different things per format", () => {
    // Code 3 (bits 31-30 = 11) is the clearest divergence.
    expect(ssmMeaning(3, "bnr")).toBe("Normal Operation");
    expect(ssmMeaning(3, "bcd")).toBe("Minus, South, West, Left, From, Below");
    expect(ssmMeaning(3, "discrete")).toBe("Failure Warning");
    expect(ssmMeaning(0, "bnr")).toBe("Failure Warning");
    expect(ssmMeaning(0, "discrete")).toBe("Verified Data, Normal Operation");
  });

  it("code 1 is No Computed Data in every format", () => {
    for (const f of ["bnr", "bcd", "discrete"] as const) expect(ssmMeaning(1, f)).toBe("No Computed Data");
  });

  it("claims no single meaning until a format is given", () => {
    const w = decodeArinc429(hex(vectors.wordDecode.hex));
    expect(w.format).toBeNull();
    expect(w.ssmMeaning).toBeNull();
    expect(w.ssmReadings.bnr).toBe(vectors.wordDecode.ssmBnr);

    const typed = decodeArinc429(hex(vectors.wordDecode.hex), { format: "bcd" });
    expect(typed.ssmMeaning).toBe(SSM_BCD[3]);
  });
});

describe("§ BNR data", () => {
  it("decodes the published examples and derived complements", () => {
    for (const c of vectors.bnr.cases) {
      const bnr = decodeBnr(hex(c.dataField));
      expect(bnr.field).toBe(hex(c.dataField));
      expect(bnr.signed).toBe(c.signed);
      expect(bnr.negative).toBe(c.negative);
      expect(applyBnrScale(bnr.signed, c.fullScale)).toBe(c.value);
    }
  });

  it("GE's worked example: scale 512, bits 28/23/22 set → 268", () => {
    const c = vectors.bnr.cases[0]!;
    let field = 0;
    for (const bit of c.setBits ?? []) field |= 1 << (bit - 11);
    expect(field >>> 0).toBe(hex(c.dataField));
    expect(applyBnrScale(decodeBnr(field).signed, 512)).toBe(268);
  });

  it("bit 29 is the sign bit", () => {
    expect(decodeBnr(1 << 18).negative).toBe(true);
    expect(decodeBnr((1 << 18) - 1).negative).toBe(false);
    expect(decodeBnr(1 << 18).signed).toBe(-262144);
  });

  it("keeps the raw magnitude bits for sign-magnitude equipment", () => {
    const bnr = decodeBnr(((1 << 18) | 0x1234) >>> 0);
    expect(bnr.magnitude).toBe(0x1234);
    expect(bnr.signed).toBe((1 << 18) + 0x1234 - 0x80000);
  });

  it("encodeBnrField round-trips signed counts", () => {
    for (const signed of [0, 1, -1, 137216, -137216, 262143, -262144]) {
      expect(decodeBnr(encodeBnrField(signed)).signed).toBe(signed);
    }
  });

  it("resolution follows fullScale / 2^magnitudeBits", () => {
    for (const c of vectors.bnr.resolution.cases) {
      expect(bnrResolution(c.fullScale, c.magnitudeBits)).toBe(c.resolution);
    }
  });

  it("one count of the full field is fullScale / 2^18", () => {
    expect(applyBnrScale(1, 262144)).toBe(1);
    expect(applyBnrScale(1 << 17, 512)).toBe(256); // bit 28 is half of full scale
  });
});

describe("§ BCD data", () => {
  it("uses the documented subfield widths", () => {
    expect(BCD_SUBFIELDS.map((s) => ({ first: s.first, last: s.last, maxDigit: s.maxDigit }))).toEqual(
      vectors.bcd.subfields,
    );
  });

  it("decodes the published examples", () => {
    for (const c of vectors.bcd.cases) {
      const bcd = decodeBcd(hex(c.dataField));
      expect(bcd.digits).toEqual(c.digits);
      expect(bcd.value).toBe(c.value);
      expect(bcd.invalidDigits).toEqual(c.invalidDigits ?? []);
    }
  });

  it("GE Figure 5: digits 2 5 7 8 6 read 25786", () => {
    const bcd = decodeBcd(0x25786);
    expect(bcd.digits).toEqual([2, 5, 7, 8, 6]);
    expect(bcd.value).toBe(25786);
  });

  it("flags a nibble that is not a decimal digit", () => {
    const bcd = decodeBcd(0x2578a);
    expect(bcd.invalidDigits).toEqual([5]);
    expect(bcd.value).toBeNull();
    expect(bcd.digits[4]).toBe(10);
  });

  it("the 3-bit leading subfield can never exceed its maximum", () => {
    for (let field = 0; field <= 0x7ffff; field += 0x421) {
      expect(decodeBcd(field).digits[0]!).toBeLessThanOrEqual(7);
      expect(decodeBcd(field).invalidDigits).not.toContain(1);
    }
  });

  it("encodes digits back into the same field", () => {
    expect(encodeBcd([2, 5, 7, 8, 6])).toEqual({ ok: true, dataField: 0x25786 });
    expect(encodeBcd([7, 5, 8, 3, 9])).toEqual({ ok: true, dataField: 0x75839 });
    expect(decodeBcd(0x75839).value).toBe(75839);
  });

  it("right-aligns a short digit list", () => {
    const packed = encodeBcd([1, 2]);
    expect(packed.ok && decodeBcd(packed.dataField).value).toBe(12);
    expect(packed.ok && decodeBcd(packed.dataField).digits).toEqual([0, 0, 0, 1, 2]);
  });

  it("rejects out-of-range digits", () => {
    expect(encodeBcd([8, 0, 0, 0, 0])).toEqual({ ok: false, error: expect.stringContaining("0-7") });
    expect(encodeBcd([1, 10, 0, 0, 0])).toEqual({ ok: false, error: expect.stringContaining("0-9") });
    expect(encodeBcd([])).toEqual({ ok: false, error: expect.stringContaining("1-5") });
    expect(encodeBcd([1, 2, 3, 4, 5, 6])).toEqual({ ok: false, error: expect.stringContaining("1-5") });
  });
});

describe("§ whole-word decode", () => {
  it("decodes the published word field by field", () => {
    const v = vectors.wordDecode;
    const parsed = parseArinc429(v.hex);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const w = parsed.word;
    expect(w.label.field).toBe(v.labelField);
    expect(w.label.octal).toBe(v.labelOctalBit1Msb);
    expect(w.sdi).toBe(v.sdi);
    expect(w.data).toBe(v.data);
    expect(w.ssm).toBe(v.ssm);
    expect(w.parityBit).toBe(v.parityBit);
    expect(w.parityOk).toBe(v.parityOk);
    expect(w.bnr.negative).toBe(v.bnrNegative);
    expect(w.hex).toBe(v.hex);
    expect(w.bits).toHaveLength(32);
    expect(w.bits[31]).toBe("1"); // bit 1 of E0..A1
  });

  it("accepts spaced, unprefixed and numeric input alike", () => {
    const expected = hex(vectors.wordDecode.hex);
    for (const input of ["0xE00640A1", "e00640a1", "E0 06 40 A1", "E0_06_40_A1", " 0Xe00640a1 "]) {
      const r = parseArinc429(input);
      expect(r.ok && r.word.raw).toBe(expected);
    }
    const n = parseArinc429(expected);
    expect(n.ok && n.word.raw).toBe(expected);
  });

  it("pads short hex on the left", () => {
    const r = parseArinc429("2D1");
    expect(r.ok && r.word.raw).toBe(0x2d1);
    expect(r.ok && r.word.label.octal).toBe("213");
  });

  it("rejects junk, oversized and out-of-range input", () => {
    expect(parseArinc429("")).toEqual({ ok: false, error: expect.stringContaining("hex") });
    expect(parseArinc429("nope")).toEqual({ ok: false, error: expect.stringContaining("not hex") });
    expect(parseArinc429("1234567890")).toEqual({ ok: false, error: expect.stringContaining("8 hex digits") });
    expect(parseArinc429(-1)).toEqual({ ok: false, error: expect.stringContaining("integer") });
    expect(parseArinc429(1.5)).toEqual({ ok: false, error: expect.stringContaining("integer") });
    expect(parseArinc429(0x1_0000_0000)).toEqual({ ok: false, error: expect.stringContaining("integer") });
  });
});

describe("§ encoder", () => {
  it("reproduces the round-trip vectors", () => {
    for (const c of vectors.roundTrip.cases) {
      const built = buildArinc429({ labelOctal: c.labelOctal, sdi: c.sdi, data: c.data, ssm: c.ssm });
      expect(built.ok).toBe(true);
      if (!built.ok) continue;
      expect(built.word.hex).toBe(c.hex);

      const back = decodeArinc429(built.word.raw);
      expect(back.label.octal).toBe(c.labelOctal);
      expect(back.sdi).toBe(c.sdi);
      expect(back.data).toBe(c.data);
      expect(back.ssm).toBe(c.ssm);
      expect(back.parityOk).toBe(true);
    }
  });

  it("cannot emit a word with wrong parity", () => {
    for (let label = 0; label <= 0xff; label += 7) {
      for (const data of [0, 1, 0x5e800, 0x7ffff]) {
        for (let ssm = 0; ssm <= 3; ssm++) {
          const built = buildArinc429({
            labelOctal: label.toString(8).padStart(3, "0"),
            sdi: ssm,
            data,
            ssm,
          });
          expect(built.ok).toBe(true);
          if (!built.ok) continue;
          expect(arinc429ParityOk(built.word.raw)).toBe(true);
          expect(built.word.parityBit).toBe(arinc429Parity(built.word.raw));
        }
      }
    }
  });

  it("encodes BCD digits straight into the data field", () => {
    const built = buildArinc429({ labelOctal: "205", bcdDigits: [2, 5, 7, 8, 6], ssm: 0 });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const back = decodeArinc429(built.word.raw, { format: "bcd" });
    expect(back.bcd.value).toBe(25786);
    expect(back.ssmMeaning).toBe(SSM_BCD[0]);
    expect(back.parityOk).toBe(true);
  });

  it("encodes a negative BNR value", () => {
    const built = buildArinc429({ labelOctal: "103", data: encodeBnrField(-137216), ssm: 3 });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const back = decodeArinc429(built.word.raw, { format: "bnr" });
    expect(back.bnr.negative).toBe(true);
    expect(back.bnr.signed).toBe(-137216);
    expect(applyBnrScale(back.bnr.signed, 512)).toBe(-268);
    expect(back.ssmMeaning).toBe("Normal Operation");
    expect(back.parityOk).toBe(true);
  });

  it("round-trips through both label conventions", () => {
    for (const order of ["bit1-msb", "bit8-msb"] as const) {
      const built = buildArinc429({ labelOctal: "205", data: 400, ssm: 3, labelBitOrder: order });
      expect(built.ok).toBe(true);
      if (!built.ok) continue;
      expect(decodeArinc429(built.word.raw, { labelBitOrder: order }).label.octal).toBe("205");
    }
  });

  it("rejects out-of-range fields", () => {
    expect(buildArinc429({ labelOctal: "205", sdi: 4 })).toEqual({ ok: false, error: expect.stringContaining("SDI") });
    expect(buildArinc429({ labelOctal: "205", ssm: 4 })).toEqual({ ok: false, error: expect.stringContaining("SSM") });
    expect(buildArinc429({ labelOctal: "205", data: 0x80000 })).toEqual({
      ok: false,
      error: expect.stringContaining("19 bits"),
    });
    expect(buildArinc429({ labelOctal: "999" })).toEqual({ ok: false, error: expect.stringContaining("0-7") });
    expect(buildArinc429({ labelOctal: "205", data: 0, bcdDigits: [1] })).toEqual({
      ok: false,
      error: expect.stringContaining("not both"),
    });
  });
});
