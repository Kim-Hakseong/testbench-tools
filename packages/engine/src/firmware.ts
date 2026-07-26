// Intel HEX / Motorola S-Record ↔ binary conversion. Pure TS, no DOM.

export interface MemSegment {
  address: number;
  data: Uint8Array;
}

export interface FirmwareImage {
  segments: MemSegment[];
  /** Entry/start address if the file declared one. */
  startAddress: number | null;
  format: "ihex" | "srec";
}

export type FirmwareParseResult =
  | { ok: true; image: FirmwareImage }
  | { ok: false; error: string; line: number };

/** Merge byte runs that touch, keep segments sorted. */
export function normalizeSegments(raw: MemSegment[]): MemSegment[] {
  const sorted = [...raw].sort((a, b) => a.address - b.address);
  const out: MemSegment[] = [];
  for (const seg of sorted) {
    const last = out[out.length - 1];
    if (last && last.address + last.data.length === seg.address) {
      const merged = new Uint8Array(last.data.length + seg.data.length);
      merged.set(last.data, 0);
      merged.set(seg.data, last.data.length);
      out[out.length - 1] = { address: last.address, data: merged };
    } else {
      out.push({ address: seg.address, data: new Uint8Array(seg.data) });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Intel HEX
// ---------------------------------------------------------------------------

export function parseIntelHex(text: string): FirmwareParseResult {
  const segments: MemSegment[] = [];
  let upper = 0; // extended linear/segment offset
  let startAddress: number | null = null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line === "") continue;
    if (!line.startsWith(":")) return { ok: false, error: "Line must start with ':'", line: i + 1 };
    if (!/^:[0-9a-fA-F]+$/.test(line) || line.length % 2 === 0) {
      return { ok: false, error: "Non-hex characters or odd digit count.", line: i + 1 };
    }
    const bytes = new Uint8Array((line.length - 1) / 2);
    for (let b = 0; b < bytes.length; b++) bytes[b] = parseInt(line.slice(1 + b * 2, 3 + b * 2), 16);
    const len = bytes[0]!;
    if (bytes.length !== len + 5) {
      return { ok: false, error: `Record length mismatch (LL=${len}).`, line: i + 1 };
    }
    const sum = bytes.reduce((a, b) => (a + b) & 0xff, 0);
    if (sum !== 0) return { ok: false, error: "Checksum mismatch.", line: i + 1 };
    const addr = (bytes[1]! << 8) | bytes[2]!;
    const type = bytes[3]!;
    const data = bytes.subarray(4, 4 + len);
    switch (type) {
      case 0x00:
        segments.push({ address: upper + addr, data: new Uint8Array(data) });
        break;
      case 0x01:
        return { ok: true, image: { segments: normalizeSegments(segments), startAddress, format: "ihex" } };
      case 0x02:
        upper = ((data[0]! << 8) | data[1]!) << 4;
        break;
      case 0x04:
        upper = ((data[0]! << 8) | data[1]!) * 0x10000;
        break;
      case 0x03:
      case 0x05:
        startAddress = data.reduce((a, b) => a * 256 + b, 0);
        break;
      default:
        return { ok: false, error: `Unknown record type 0x${type.toString(16)}.`, line: i + 1 };
    }
  }
  return { ok: false, error: "Missing end-of-file record (:00000001FF).", line: lines.length };
}

export function toIntelHex(segments: MemSegment[], bytesPerLine = 16): string {
  const lines: string[] = [];
  let upper = -1;
  const rec = (bytes: number[]): string => {
    const sum = bytes.reduce((a, b) => (a + b) & 0xff, 0);
    const cks = (0x100 - sum) & 0xff;
    return ":" + [...bytes, cks].map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join("");
  };
  for (const seg of normalizeSegments(segments)) {
    for (let off = 0; off < seg.data.length; off += bytesPerLine) {
      const addr = seg.address + off;
      const hi = Math.floor(addr / 0x10000);
      if (hi !== upper) {
        lines.push(rec([2, 0, 0, 4, (hi >> 8) & 0xff, hi & 0xff]));
        upper = hi;
      }
      const chunk = Array.from(seg.data.subarray(off, off + bytesPerLine));
      lines.push(rec([chunk.length, (addr >> 8) & 0xff, addr & 0xff, 0, ...chunk]));
    }
  }
  lines.push(":00000001FF");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Motorola S-Record
// ---------------------------------------------------------------------------

const SREC_ADDR_BYTES: Record<string, number> = { "0": 2, "1": 2, "2": 3, "3": 4, "5": 2, "7": 4, "8": 3, "9": 2 };

export function parseSrec(text: string): FirmwareParseResult {
  const segments: MemSegment[] = [];
  let startAddress: number | null = null;
  const lines = text.split(/\r?\n/);
  let sawData = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line === "") continue;
    const m = line.match(/^S([0-9])([0-9a-fA-F]+)$/);
    if (!m) return { ok: false, error: "Line must be S<type><hex>.", line: i + 1 };
    const type = m[1]!;
    const hex = m[2]!;
    if (hex.length % 2 !== 0) return { ok: false, error: "Odd hex digit count.", line: i + 1 };
    const bytes = new Uint8Array(hex.length / 2);
    for (let b = 0; b < bytes.length; b++) bytes[b] = parseInt(hex.slice(b * 2, b * 2 + 2), 16);
    const count = bytes[0]!;
    if (bytes.length !== count + 1) return { ok: false, error: "Byte count mismatch.", line: i + 1 };
    const sum = bytes.subarray(0, bytes.length - 1).reduce((a, b) => (a + b) & 0xff, 0);
    if ((0xff - sum) !== bytes[bytes.length - 1]) {
      return { ok: false, error: "Checksum mismatch.", line: i + 1 };
    }
    const addrBytes = SREC_ADDR_BYTES[type];
    if (addrBytes === undefined) return { ok: false, error: `Unsupported record S${type}.`, line: i + 1 };
    const addr = bytes.subarray(1, 1 + addrBytes).reduce((a, b) => a * 256 + b, 0);
    const data = bytes.subarray(1 + addrBytes, bytes.length - 1);
    if (type === "1" || type === "2" || type === "3") {
      segments.push({ address: addr, data: new Uint8Array(data) });
      sawData = true;
    } else if (type === "7" || type === "8" || type === "9") {
      startAddress = addr;
    }
    // S0 header and S5 count records are validated but otherwise ignored
  }
  if (!sawData) return { ok: false, error: "No data records (S1/S2/S3) found.", line: lines.length };
  return { ok: true, image: { segments: normalizeSegments(segments), startAddress, format: "srec" } };
}

export function toSrec(segments: MemSegment[], bytesPerLine = 16): string {
  const norm = normalizeSegments(segments);
  const maxAddr = norm.reduce((m, s) => Math.max(m, s.address + s.data.length), 0);
  const addrBytes = maxAddr <= 0x10000 ? 2 : maxAddr <= 0x1000000 ? 3 : 4;
  const dataType = addrBytes === 2 ? "1" : addrBytes === 3 ? "2" : "3";
  const endType = addrBytes === 2 ? "9" : addrBytes === 3 ? "8" : "7";
  const rec = (type: string, addr: number, data: number[]): string => {
    const a: number[] = [];
    for (let i = addrBytes - 1; i >= 0; i--) a.push((addr >> (i * 8)) & 0xff);
    const body = [a.length + data.length + 1, ...a, ...data];
    const sum = body.reduce((x, y) => (x + y) & 0xff, 0);
    return "S" + type + [...body, 0xff - sum].map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join("");
  };
  const lines: string[] = [rec("0", 0, Array.from(new TextEncoder().encode("TB")))];
  for (const seg of norm) {
    for (let off = 0; off < seg.data.length; off += bytesPerLine) {
      lines.push(rec(dataType, seg.address + off, Array.from(seg.data.subarray(off, off + bytesPerLine))));
    }
  }
  lines.push(rec(endType, 0, []));
  return lines.join("\n") + "\n";
}

/** Flatten segments to one contiguous binary (gaps filled), returning the base address. */
export function segmentsToBin(segments: MemSegment[], fill = 0xff): { base: number; data: Uint8Array } {
  const norm = normalizeSegments(segments);
  if (norm.length === 0) return { base: 0, data: new Uint8Array(0) };
  const base = norm[0]!.address;
  const end = norm[norm.length - 1]!.address + norm[norm.length - 1]!.data.length;
  const data = new Uint8Array(end - base).fill(fill);
  for (const seg of norm) data.set(seg.data, seg.address - base);
  return { base, data };
}
