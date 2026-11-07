import { describe, expect, it } from "vitest";
import {
  decodeFrame,
  decodeLayout,
  encodeLayout,
  formatFloat32,
  ftprojToLayout,
  layoutToFtproj,
  type FrameLayout,
} from "./frame";
import { parseHex } from "./convert";
import vectors from "../vectors/frame-frameterm.json";

const bytes = (hex: string) => {
  const r = parseHex(hex);
  if (!r.ok) throw new Error(hex);
  return r.bytes;
};

describe("frame decode agrees with FrameTerm's own engine", () => {
  for (const c of vectors.cases) {
    describe(c.name, () => {
      for (const f of c.frames) {
        it(f.hex || "(empty frame)", () => {
          const out = decodeFrame(c.layout as FrameLayout, bytes(f.hex));
          expect(out.checksum.status).toBe(f.checksum);
          expect(out.fields.map((x) => x.name)).toEqual(f.fields.map((x) => x.name));
          for (let i = 0; i < f.fields.length; i++) {
            const want = f.fields[i]!;
            const got = out.fields[i]!;
            expect(got.available).toBe(want.available);
            expect(got.display).toBe(want.display);
            if (want.available) expect(got.value).toBe(want.value);
          }
        });
      }
    });
  }
});

describe("float32 display matches .NET float.ToString(\"R\")", () => {
  for (const p of vectors.f32Display) {
    it(`${p.hexLE} → ${p.display}`, () => {
      const dv = new DataView(bytes(p.hexLE).buffer);
      expect(formatFloat32(dv.getFloat32(0, true))).toBe(p.display);
    });
  }
});

describe("checksum detail", () => {
  it("Modbus RTU read-holding request: CRC 0xCDC5 sent low byte first", () => {
    const out = decodeFrame(vectors.cases[1]!.layout as FrameLayout, bytes("01 03 00 00 00 0A C5 CD"));
    expect(out.checksum).toMatchObject({ status: "ok", expected: 0xcdc5, actual: 0xcdc5, at: [6, 8], coverage: [0, 6] });
  });
  it("the same CRC read big-endian is a FAIL, not an error", () => {
    const layout = structuredClone(vectors.cases[1]!.layout) as FrameLayout;
    layout.checksum.byteOrder = "BE";
    expect(decodeFrame(layout, bytes("01 03 00 00 00 0A C5 CD")).checksum).toMatchObject({ status: "fail", actual: 0xc5cd });
  });
});

const demo = vectors.cases[0]!.layout as FrameLayout;

describe(".ftproj", () => {
  it("export → import round-trips the layout", () => {
    const back = ftprojToLayout(layoutToFtproj(demo));
    expect(back.ok && back.layout).toEqual(demo);
  });
  it("keeps the parts of an imported project it does not edit", () => {
    const original = JSON.stringify({
      SchemaVersion: 1,
      Framing: { Mode: "LengthField", HeaderLen: 2, LenOffset: 1, LenSize: 1, Endian: "LE", LenAdjust: 2 },
      Checksum: { Preset: "crc16_modbus", OffsetFromEnd: 2, ByteOrder: "LE", CoverageStart: 0, CoverageEndOffsetFromEnd: 2 },
      Fields: [{ Name: "seq", Offset: 2, Type: "U8", Endian: "LE" }],
      Highlights: [{ Field: "status", Op: "!=", Value: 0, Color: "#D70027" }],
    });
    const imported = ftprojToLayout(original);
    if (!imported.ok) throw new Error(imported.error);
    expect(imported.framingMode).toBe("LengthField");
    expect(imported.layout.checksum.preset).toBe("CRC16_MODBUS");
    expect(imported.layout.fields[0]).toEqual({ name: "seq", offset: 2, type: "u8", endian: "LE" });
    const out = JSON.parse(layoutToFtproj(imported.layout, imported.base));
    expect(out.Framing.Mode).toBe("LengthField");
    expect(out.Highlights).toHaveLength(1);
    expect(out.fields).toHaveLength(1);
    expect(Object.keys(out).filter((k) => k.toLowerCase() === "fields")).toHaveLength(1);
  });
  it("rejects a newer schema, a bad preset and a bad field type", () => {
    expect(ftprojToLayout('{"schemaVersion":2}').ok).toBe(false);
    expect(ftprojToLayout('{"checksum":{"preset":"CRC64"}}').ok).toBe(false);
    expect(ftprojToLayout('{"fields":[{"name":"x","offset":0,"type":"u64"}]}').ok).toBe(false);
    expect(ftprojToLayout("not json").ok).toBe(false);
  });
});

describe("share fragment", () => {
  it("round-trips, including names that need escaping", () => {
    const layout: FrameLayout = { ...demo, fields: [...demo.fields, { name: "a;b:c é", offset: 9, type: "f32", endian: "BE" }] };
    expect(decodeLayout(encodeLayout(layout))).toEqual(layout);
  });
  it("is plain text a person can read", () => {
    expect(encodeLayout(demo)).toBe("v1;CRC16_MODBUS,2,LE,0,2;seq:2:u8:LE;temp:3:s16:BE;status:5:u8:LE");
  });
  it("refuses anything malformed rather than guessing", () => {
    for (const bad of ["", "v2;None,0,LE,0,0", "v1;CRC64,2,LE,0,2", "v1;None,2,XX,0,2", "v1;None,2,LE,0,2;x:1:u64:LE", "v1;None,2,LE,0,2;%E0%A4%A:1:u8:LE"]) {
      expect(decodeLayout(bad)).toBeNull();
    }
  });
});
