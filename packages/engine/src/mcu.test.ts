import { describe, expect, it } from "vitest";
import { canBitTiming, i2cPullup, timerSolutions, uartBaudError } from "./mcu";
import { layoutStruct, parseStructBody } from "./cstruct";

describe("CAN bit timing", () => {
  it("8 MHz → 500 kbit/s: exact solution with 16 tq, SP 87.5 %", () => {
    const opts = canBitTiming(8e6, 500e3, 0.875);
    const exact = opts.find((o) => o.error === 0 && o.tqPerBit === 16);
    expect(exact).toBeDefined();
    expect(exact!.prescaler).toBe(1);
    expect(exact!.seg1).toBe(13);
    expect(exact!.seg2).toBe(2);
    expect(exact!.samplePoint).toBeCloseTo(0.875, 6);
  });

  it("segments always sum to tqPerBit − 1", () => {
    for (const o of canBitTiming(48e6, 250e3)) {
      expect(1 + o.seg1 + o.seg2).toBe(o.tqPerBit);
      expect(o.tqPerBit).toBeGreaterThanOrEqual(8);
      expect(o.tqPerBit).toBeLessThanOrEqual(25);
    }
  });
});

describe("I2C pull-up", () => {
  it("5 V, 200 pF, standard mode: rMin ≈ 1533 Ω, rMax ≈ 5901 Ω", () => {
    const r = i2cPullup(5, 200e-12, "standard");
    expect(r.rMin).toBeCloseTo(1533.3, 0);
    expect(r.rMax).toBeCloseTo(5901.1, 0);
    expect(r.ok).toBe(true);
  });

  it("flags impossible constraints (huge bus capacitance, fast-plus)", () => {
    const r = i2cPullup(5, 2000e-12, "fast");
    expect(r.ok).toBe(false); // rMax below rMin
  });
});

describe("timer solutions", () => {
  it("72 MHz → 1 kHz has an exact PSC/ARR pair", () => {
    const opts = timerSolutions(72e6, 1000);
    const exact = opts.find((o) => o.error === 0);
    expect(exact).toBeDefined();
    expect((exact!.psc + 1) * (exact!.arr + 1)).toBe(72000);
  });

  it("register values stay within 16 bits", () => {
    for (const o of timerSolutions(48e6, 3)) {
      expect(o.psc).toBeLessThanOrEqual(65535);
      expect(o.arr).toBeLessThanOrEqual(65535);
    }
  });
});

describe("UART baud error", () => {
  it("16 MHz, 115200, ×16: divisor 9, actual 111111, error −3.55 %", () => {
    const r = uartBaudError(16e6, 115200);
    expect(r.divisor).toBe(9);
    expect(r.actualBaud).toBeCloseTo(111111.1, 0);
    expect(r.error * 100).toBeCloseTo(-3.549, 2);
  });

  it("48 MHz, 115200 is nearly exact (divisor 26, +0.16 %)", () => {
    const r = uartBaudError(48e6, 115200);
    expect(r.divisor).toBe(26);
    expect(Math.abs(r.error)).toBeLessThan(0.002);
  });
});

describe("struct layout", () => {
  it("uint8_t a; uint32_t b; uint16_t c; → offsets 0/4/8, size 12", () => {
    const p = parseStructBody("uint8_t a; uint32_t b; uint16_t c;");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const l = layoutStruct(p.members, 32);
    expect(l.rows.map((r) => r.offset)).toEqual([0, 4, 8]);
    expect(l.size).toBe(12);
    expect(l.totalPadding).toBe(5); // 3 before b, 2 tail
  });

  it("arrays and pointers: char name[8]; void *p; on 64-bit", () => {
    const p = parseStructBody("char name[8];\nvoid *p;");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const l = layoutStruct(p.members, 64);
    expect(l.rows[1]!.offset).toBe(8);
    expect(l.size).toBe(16);
  });

  it("long is 4 bytes on 32-bit, 8 on 64-bit (LP64)", () => {
    const p = parseStructBody("long x;");
    if (!p.ok) throw new Error();
    expect(layoutStruct(p.members, 32).size).toBe(4);
    expect(layoutStruct(p.members, 64).size).toBe(8);
  });

  it("reports unparseable input", () => {
    expect(parseStructBody("wat???").ok).toBe(false);
    expect(parseStructBody("mytype_t x;").ok).toBe(false);
  });
});
