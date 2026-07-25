// TEST-ONLY TDMS writer (DESIGN §2: 검증은 라운드트립, writer는 테스트 전용).
// Builds spec-conformant little-endian, non-interleaved segments.

export const TOC_META = 1 << 1;
export const TOC_NEW_OBJ_LIST = 1 << 2;
export const TOC_RAW = 1 << 3;
export const TOC_BIG_ENDIAN = 1 << 6;

class ByteWriter {
  private parts: number[] = [];

  u8(v: number) { this.parts.push(v & 0xff); }
  u32(v: number) { for (let i = 0; i < 4; i++) this.parts.push((v >>> (i * 8)) & 0xff); }
  u64(v: number) {
    const lo = v >>> 0 === v ? v : v % 0x100000000;
    const hi = Math.floor(v / 0x100000000);
    this.u32(lo >>> 0);
    this.u32(hi >>> 0);
  }
  f64(v: number) {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setFloat64(0, v, true);
    for (const x of b) this.parts.push(x);
  }
  str(s: string) {
    const bytes = new TextEncoder().encode(s);
    this.u32(bytes.length);
    for (const x of bytes) this.parts.push(x);
  }
  raw(bytes: Uint8Array) { for (const x of bytes) this.parts.push(x); }
  bytes(): Uint8Array { return new Uint8Array(this.parts); }
}

export type WriterProp =
  | { name: string; type: "string"; value: string }
  | { name: string; type: "f64"; value: number };

export interface WriterObject {
  path: string;
  /** undefined → no raw (0xFFFFFFFF); "match" → 0x00000000; else explicit index. */
  index?: { dtype: number; count: number } | "match";
  props?: WriterProp[];
}

export function buildMetadata(objects: WriterObject[]): Uint8Array {
  const w = new ByteWriter();
  w.u32(objects.length);
  for (const obj of objects) {
    w.str(obj.path);
    if (obj.index === undefined) w.u32(0xffffffff);
    else if (obj.index === "match") w.u32(0x00000000);
    else {
      w.u32(20); // index length: dtype(4) + dim(4) + count(8) → informational
      w.u32(obj.index.dtype);
      w.u32(1);
      w.u64(obj.index.count);
    }
    const props = obj.props ?? [];
    w.u32(props.length);
    for (const p of props) {
      w.str(p.name);
      if (p.type === "string") {
        w.u32(0x20);
        w.str(p.value);
      } else {
        w.u32(10);
        w.f64(p.value);
      }
    }
  }
  return w.bytes();
}

export function buildF64Raw(...series: number[][]): Uint8Array {
  const w = new ByteWriter();
  for (const s of series) for (const v of s) w.f64(v);
  return w.bytes();
}

export function buildSegment(toc: number, meta: Uint8Array, raw: Uint8Array): Uint8Array {
  const w = new ByteWriter();
  w.u8(0x54); w.u8(0x44); w.u8(0x53); w.u8(0x6d); // "TDSm"
  w.u32(toc);
  w.u32(4713); // TDMS 2.0
  w.u64(meta.length + raw.length); // next segment offset
  w.u64(meta.length); // raw data offset
  w.raw(meta);
  w.raw(raw);
  return w.bytes();
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
