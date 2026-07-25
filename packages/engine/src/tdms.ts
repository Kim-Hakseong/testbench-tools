// NI TDMS streaming parser (DESIGN §2). Pure TS, no DOM.
//
// Feed arbitrary byte chunks via push() — File.slice loops on the UI side —
// and the parser advances a small internal buffer; the whole file is never
// required in memory at once. Result identity is independent of chunking
// (§9.7 streaming invariance).
//
// Supported: little-endian segments, non-interleaved raw data, numeric dtypes
// i8…i64 / u8…u64 / f32 / f64, string+numeric+bool+timestamp properties.
// NOT supported (explicit errors): big-endian, interleaved, DAQmx raw scalers
// (P1 [미정]), string channel raw data.

export const TDMS_TAG = 0x5444536d; // "TDSm" big-endian read

// ToC flags
const TOC_META = 1 << 1;
const TOC_NEW_OBJ_LIST = 1 << 2;
const TOC_RAW = 1 << 3;
const TOC_INTERLEAVED = 1 << 5;
const TOC_BIG_ENDIAN = 1 << 6;
const TOC_DAQMX = 1 << 7;

// dtype codes
export const enum TdmsType {
  Void = 0,
  I8 = 1,
  I16 = 2,
  I32 = 3,
  I64 = 4,
  U8 = 5,
  U16 = 6,
  U32 = 7,
  U64 = 8,
  F32 = 9,
  F64 = 10,
  String = 0x20,
  Boolean = 0x21,
  Timestamp = 0x44,
}

const NUMERIC_SIZE: Record<number, number> = {
  [TdmsType.I8]: 1,
  [TdmsType.I16]: 2,
  [TdmsType.I32]: 4,
  [TdmsType.I64]: 8,
  [TdmsType.U8]: 1,
  [TdmsType.U16]: 2,
  [TdmsType.U32]: 4,
  [TdmsType.U64]: 8,
  [TdmsType.F32]: 4,
  [TdmsType.F64]: 8,
  [TdmsType.Boolean]: 1,
};

export function tdmsTypeName(t: number): string {
  const names: Record<number, string> = {
    1: "i8", 2: "i16", 3: "i32", 4: "i64", 5: "u8", 6: "u16", 7: "u32", 8: "u64",
    9: "f32", 10: "f64", 0x20: "string", 0x21: "bool", 0x44: "timestamp",
  };
  return names[t] ?? `dtype(${t})`;
}

export type TdmsPropertyValue = string | number | boolean;

export interface TdmsObjectInfo {
  path: string;
  properties: Record<string, TdmsPropertyValue>;
}

export interface TdmsChannel extends TdmsObjectInfo {
  group: string;
  name: string;
  dtype: number;
  data: number[];
}

export interface TdmsGroup extends TdmsObjectInfo {
  name: string;
  channels: TdmsChannel[];
}

export interface TdmsFile {
  properties: Record<string, TdmsPropertyValue>;
  groups: TdmsGroup[];
}

interface RawIndex {
  dtype: number;
  count: number; // values per raw chunk
}

interface ObjectState {
  path: string;
  properties: Record<string, TdmsPropertyValue>;
  index: RawIndex | null; // last known raw index
  data: number[];
}

/** Split a TDMS object path like /'group'/'channel' (quotes doubled inside). */
export function parseTdmsPath(path: string): string[] {
  const parts: string[] = [];
  let i = 0;
  while (i < path.length) {
    if (path[i] !== "/") throw new Error(`Bad TDMS path: ${path}`);
    i++;
    if (i >= path.length) break;
    if (path[i] !== "'") throw new Error(`Bad TDMS path: ${path}`);
    i++;
    let name = "";
    while (i < path.length) {
      if (path[i] === "'") {
        if (path[i + 1] === "'") {
          name += "'";
          i += 2;
        } else {
          i++;
          break;
        }
      } else {
        name += path[i];
        i++;
      }
    }
    parts.push(name);
  }
  return parts;
}

type State = "leadin" | "meta" | "raw";

export class TdmsParser {
  private buf = new Uint8Array(0);
  private state: State = "leadin";
  private objects = new Map<string, ObjectState>();
  /** Active raw-object order for the current segment lineage. */
  private rawList: string[] = [];

  // current segment
  private metaLength = 0;
  private rawLength = 0; // Infinity for truncated final segment
  private toc = 0;

  // raw consumption cursor
  private rawObjIdx = 0;
  private rawValuesLeft = 0;
  private rawBytesLeft = 0;

  private finished = false;

  push(chunk: Uint8Array): void {
    if (this.finished) throw new Error("push() after finish()");
    // append to rolling buffer
    const merged = new Uint8Array(this.buf.length + chunk.length);
    merged.set(this.buf, 0);
    merged.set(chunk, this.buf.length);
    this.buf = merged;
    this.process();
  }

  finish(): TdmsFile {
    if (!this.finished) {
      // A truncated final raw section is tolerated (incomplete last values dropped).
      if (this.state === "meta" || (this.state === "leadin" && this.buf.length > 0 && this.buf.length < 28)) {
        throw new Error("Truncated TDMS file: incomplete segment header/metadata.");
      }
      this.finished = true;
    }
    return this.result();
  }

  private consume(n: number): Uint8Array {
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return out;
  }

  private process(): void {
    for (;;) {
      if (this.state === "leadin") {
        if (this.buf.length < 28) return;
        const head = this.consume(28);
        const view = new DataView(head.buffer, head.byteOffset, 28);
        const tag = view.getUint32(0, false);
        if (tag !== TDMS_TAG) throw new Error("Not a TDMS segment: missing 'TDSm' tag.");
        this.toc = view.getUint32(4, true);
        if (this.toc & TOC_BIG_ENDIAN) throw new Error("Big-endian TDMS segments are not supported.");
        if (this.toc & TOC_DAQMX) throw new Error("DAQmx raw data is not supported yet.");
        if (this.toc & TOC_INTERLEAVED) throw new Error("Interleaved raw data is not supported yet.");
        // version at 8 (unused)
        const nextSegHi = view.getUint32(16, true);
        const nextSegLo2 = view.getUint32(12, true);
        const nextSegment = nextSegLo2 + nextSegHi * 0x100000000;
        const rawOffLo = view.getUint32(20, true);
        const rawOffHi = view.getUint32(24, true);
        const rawOffset = rawOffLo + rawOffHi * 0x100000000;
        const truncated = nextSegLo2 === 0xffffffff && nextSegHi === 0xffffffff;
        this.metaLength = this.toc & TOC_META ? rawOffset : 0;
        this.rawLength = truncated ? Infinity : nextSegment - rawOffset;
        this.state = this.metaLength > 0 ? "meta" : "raw";
        this.startRawSection();
        continue;
      }

      if (this.state === "meta") {
        if (this.buf.length < this.metaLength) return;
        const meta = this.consume(this.metaLength);
        this.parseMetadata(meta);
        this.state = "raw";
        this.startRawSection();
        continue;
      }

      // raw
      if (this.rawLength === 0 || this.rawList.length === 0) {
        this.state = "leadin";
        if (this.rawLength > 0 && this.rawLength !== Infinity) {
          // raw bytes with no active objects — skip them
          if (this.buf.length < this.rawLength) return;
          this.consume(this.rawLength);
        }
        if (this.rawLength === Infinity) return; // nothing decodable, wait for finish
        this.rawLength = 0;
        continue;
      }

      const done = this.consumeRaw();
      if (!done) return; // need more bytes
      this.state = "leadin";
      continue;
    }
  }

  /** Initialize the raw cursor for a new segment's raw section. */
  private startRawSection(): void {
    this.rawObjIdx = 0;
    this.rawBytesLeft = this.rawLength;
    const first = this.rawList[0];
    const idx = first ? this.objects.get(first)?.index : undefined;
    this.rawValuesLeft = idx ? idx.count : 0;
  }

  /** Consume raw values as they become available. True when the section is done. */
  private consumeRaw(): boolean {
    for (;;) {
      if (this.rawBytesLeft <= 0) return true;
      const path = this.rawList[this.rawObjIdx];
      if (path === undefined) {
        // completed one interleave-free chunk; more chunks may follow in this segment
        if (this.rawBytesLeft > 0) {
          this.rawObjIdx = 0;
          const first = this.rawList[0]!;
          this.rawValuesLeft = this.objects.get(first)!.index!.count;
          continue;
        }
        return true;
      }
      const obj = this.objects.get(path)!;
      const index = obj.index!;
      if (this.rawValuesLeft === 0) {
        this.rawObjIdx++;
        const next = this.rawList[this.rawObjIdx];
        this.rawValuesLeft = next ? this.objects.get(next)!.index!.count : 0;
        continue;
      }
      const size = NUMERIC_SIZE[index.dtype];
      if (size === undefined) throw new Error(`Unsupported raw dtype ${tdmsTypeName(index.dtype)}.`);
      const avail = Math.min(
        Math.floor(this.buf.length / size),
        this.rawValuesLeft,
        Math.floor(this.rawBytesLeft / size),
      );
      if (avail === 0) {
        // truncated final segment: leftover partial value is dropped at finish
        return false;
      }
      const bytes = this.consume(avail * size);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let i = 0; i < avail; i++) obj.data.push(readNumeric(view, i * size, index.dtype));
      this.rawValuesLeft -= avail;
      this.rawBytesLeft -= avail * size;
    }
  }

  private parseMetadata(meta: Uint8Array): void {
    const view = new DataView(meta.buffer, meta.byteOffset, meta.byteLength);
    const decoder = new TextDecoder();
    let off = 0;
    const readU32 = () => {
      const v = view.getUint32(off, true);
      off += 4;
      return v;
    };
    const readU64 = () => {
      const lo = view.getUint32(off, true);
      const hi = view.getUint32(off + 4, true);
      off += 8;
      return lo + hi * 0x100000000;
    };
    const readString = () => {
      const len = readU32();
      const s = decoder.decode(meta.subarray(off, off + len));
      off += len;
      return s;
    };

    const newList = (this.toc & TOC_NEW_OBJ_LIST) !== 0;
    if (newList) this.rawList = [];

    const numObjects = readU32();
    for (let o = 0; o < numObjects; o++) {
      const path = readString();
      let obj = this.objects.get(path);
      if (!obj) {
        obj = { path, properties: {}, index: null, data: [] };
        this.objects.set(path, obj);
      }

      const header = readU32();
      if (header === 0xffffffff) {
        // no raw data in this segment
        if (newList) {
          // not part of the raw list
        }
      } else if (header === 0x69120000 || header === 0x69130000) {
        throw new Error("DAQmx raw data index is not supported yet.");
      } else if (header === 0x00000000) {
        // same index as previous segment
        if (!obj.index) throw new Error(`Object ${path} reuses a raw index but has none.`);
        this.addToRawList(path, newList);
      } else {
        const dtype = readU32();
        const dim = readU32();
        if (dim !== 1) throw new Error(`TDMS array dimension must be 1 (got ${dim}).`);
        const count = readU64();
        if (dtype === TdmsType.String) {
          throw new Error("String channel raw data is not supported (string properties are).");
        }
        obj.index = { dtype, count };
        this.addToRawList(path, newList);
      }

      const numProps = readU32();
      for (let p = 0; p < numProps; p++) {
        const name = readString();
        const dtype = readU32();
        let value: TdmsPropertyValue;
        switch (dtype) {
          case TdmsType.I8: value = view.getInt8(off); off += 1; break;
          case TdmsType.I16: value = view.getInt16(off, true); off += 2; break;
          case TdmsType.I32: value = view.getInt32(off, true); off += 4; break;
          case TdmsType.I64: value = Number(view.getBigInt64(off, true)); off += 8; break;
          case TdmsType.U8: value = view.getUint8(off); off += 1; break;
          case TdmsType.U16: value = view.getUint16(off, true); off += 2; break;
          case TdmsType.U32: value = view.getUint32(off, true); off += 4; break;
          case TdmsType.U64: value = Number(view.getBigUint64(off, true)); off += 8; break;
          case TdmsType.F32: value = view.getFloat32(off, true); off += 4; break;
          case TdmsType.F64: value = view.getFloat64(off, true); off += 8; break;
          case TdmsType.String: value = readString(); break;
          case TdmsType.Boolean: value = view.getUint8(off) !== 0; off += 1; break;
          case TdmsType.Timestamp: {
            // u64 positive fractions of a second, then i64 seconds since 1904-01-01 UTC
            const seconds = Number(view.getBigInt64(off + 8, true));
            off += 16;
            value = new Date((seconds - 2082844800) * 1000).toISOString();
            break;
          }
          default:
            throw new Error(`Unsupported property dtype ${tdmsTypeName(dtype)} for "${name}".`);
        }
        obj.properties[name] = value;
      }
    }
  }

  private addToRawList(path: string, newList: boolean): void {
    if (newList) {
      this.rawList.push(path);
    } else if (!this.rawList.includes(path)) {
      this.rawList.push(path);
    }
  }

  private result(): TdmsFile {
    const file: TdmsFile = { properties: {}, groups: [] };
    const groupMap = new Map<string, TdmsGroup>();

    const ensureGroup = (name: string): TdmsGroup => {
      let g = groupMap.get(name);
      if (!g) {
        g = { path: `/'${name.replace(/'/g, "''")}'`, name, properties: {}, channels: [] };
        groupMap.set(name, g);
        file.groups.push(g);
      }
      return g;
    };

    for (const obj of this.objects.values()) {
      const parts = parseTdmsPath(obj.path);
      if (parts.length === 0) {
        file.properties = obj.properties;
      } else if (parts.length === 1) {
        ensureGroup(parts[0]!).properties = obj.properties;
      } else {
        const g = ensureGroup(parts[0]!);
        g.channels.push({
          path: obj.path,
          group: parts[0]!,
          name: parts[1]!,
          dtype: obj.index?.dtype ?? TdmsType.Void,
          properties: obj.properties,
          data: obj.data,
        });
      }
    }
    return file;
  }
}

function readNumeric(view: DataView, off: number, dtype: number): number {
  switch (dtype) {
    case TdmsType.I8: return view.getInt8(off);
    case TdmsType.I16: return view.getInt16(off, true);
    case TdmsType.I32: return view.getInt32(off, true);
    case TdmsType.I64: return Number(view.getBigInt64(off, true));
    case TdmsType.U8: return view.getUint8(off);
    case TdmsType.U16: return view.getUint16(off, true);
    case TdmsType.U32: return view.getUint32(off, true);
    case TdmsType.U64: return Number(view.getBigUint64(off, true));
    case TdmsType.F32: return view.getFloat32(off, true);
    case TdmsType.F64: return view.getFloat64(off, true);
    case TdmsType.Boolean: return view.getUint8(off);
    default: throw new Error(`Unsupported raw dtype ${tdmsTypeName(dtype)}.`);
  }
}

/** Column-per-channel CSV; rows padded when channel lengths differ. */
export function tdmsToCsv(
  channels: Pick<TdmsChannel, "group" | "name" | "data">[],
  delimiter = ",",
): string {
  if (channels.length === 0) return "";
  const esc = (s: string) => (s.includes(delimiter) || s.includes('"') || s.includes("\n")
    ? '"' + s.replace(/"/g, '""') + '"'
    : s);
  const header = channels.map((c) => esc(`${c.group}/${c.name}`)).join(delimiter);
  const rows = Math.max(...channels.map((c) => c.data.length));
  const lines = [header];
  for (let i = 0; i < rows; i++) {
    lines.push(channels.map((c) => (i < c.data.length ? String(c.data[i]) : "")).join(delimiter));
  }
  return lines.join("\n") + "\n";
}
