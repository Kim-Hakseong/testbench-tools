// Parameterized CRC engine + simple checksums. Pure TS, no DOM.
// All arithmetic uses >>> to stay in unsigned 32-bit space (width ≤ 32).

export interface CrcParams {
  width: number; // 1..32
  poly: number;
  init: number;
  refin: boolean;
  refout: boolean;
  xorout: number;
}

export interface CrcPreset extends CrcParams {
  name: string;
}

function widthMask(width: number): number {
  return width < 32 ? (((1 << width) >>> 0) - 1) >>> 0 : 0xffffffff;
}

/** Reflect the low `bits` bits of `value`. */
export function reflect(value: number, bits: number): number {
  let out = 0;
  for (let i = 0; i < bits; i++) {
    out = ((out << 1) | ((value >>> i) & 1)) >>> 0;
  }
  return out >>> 0;
}

/** Compute a CRC over `data` with a fully parameterized model (Rocksoft / RevEng semantics). */
export function crc(data: Uint8Array, p: CrcParams): number {
  const mask = widthMask(p.width);
  let reg = p.width >= 8 ? crcByteWise(data, p) : crcBitWise(data, p);
  if (p.refout) reg = reflect(reg, p.width);
  return ((reg ^ p.xorout) & mask) >>> 0;
}

/** Byte-at-a-time register loop for width ≥ 8. */
function crcByteWise(data: Uint8Array, p: CrcParams): number {
  const { width, poly, init, refin } = p;
  const mask = widthMask(width);
  const topBit = (1 << (width - 1)) >>> 0;
  let reg = (init & mask) >>> 0;
  for (let i = 0; i < data.length; i++) {
    let byte = data[i]!;
    if (refin) byte = reflect(byte, 8);
    reg = (reg ^ ((byte << (width - 8)) >>> 0)) >>> 0;
    for (let b = 0; b < 8; b++) {
      reg = (reg & topBit) !== 0 ? (((reg << 1) >>> 0) ^ poly) >>> 0 : (reg << 1) >>> 0;
    }
    reg = (reg & mask) >>> 0;
  }
  return reg;
}

/** Bit-at-a-time loop (message bits MSB-first) for width < 8. */
function crcBitWise(data: Uint8Array, p: CrcParams): number {
  const { width, poly, init, refin } = p;
  const mask = widthMask(width);
  const topBit = (1 << (width - 1)) >>> 0;
  let reg = (init & mask) >>> 0;
  for (let i = 0; i < data.length; i++) {
    let byte = data[i]!;
    if (refin) byte = reflect(byte, 8);
    for (let b = 7; b >= 0; b--) {
      const inBit = (byte >>> b) & 1;
      const xorFlag = (((reg & topBit) !== 0 ? 1 : 0) ^ inBit) !== 0;
      reg = ((reg << 1) & mask) >>> 0;
      if (xorFlag) reg = ((reg ^ poly) & mask) >>> 0;
    }
  }
  return reg;
}

/** XOR of all bytes (NMEA-style). */
export function xor8(data: Uint8Array): number {
  let x = 0;
  for (let i = 0; i < data.length; i++) x ^= data[i]!;
  return x & 0xff;
}

/** 8-bit arithmetic sum (modulo 256). */
export function sum8(data: Uint8Array): number {
  let s = 0;
  for (let i = 0; i < data.length; i++) s = (s + data[i]!) & 0xff;
  return s;
}

/** CRC result as byte arrays in both orders (le = transmit order for Modbus RTU). */
export function crcBytes(value: number, width: number): { le: number[]; be: number[] } {
  const nBytes = Math.ceil(width / 8);
  const be: number[] = [];
  for (let i = nBytes - 1; i >= 0; i--) be.push((value >>> (i * 8)) & 0xff);
  return { le: [...be].reverse(), be };
}

// ---------------------------------------------------------------------------
// Preset catalog (RevEng-style parameter models). Check values over "123456789"
// are pinned once in vectors/crc-catalog-checks.json (W2 snapshot — immutable).
// ---------------------------------------------------------------------------
export const CRC_PRESETS: CrcPreset[] = [
  { name: "CRC-8", width: 8, poly: 0x07, init: 0x00, refin: false, refout: false, xorout: 0x00 },
  { name: "CRC-8/MAXIM", width: 8, poly: 0x31, init: 0x00, refin: true, refout: true, xorout: 0x00 },
  { name: "CRC-16/MODBUS", width: 16, poly: 0x8005, init: 0xffff, refin: true, refout: true, xorout: 0x0000 },
  { name: "CRC-16/CCITT-FALSE", width: 16, poly: 0x1021, init: 0xffff, refin: false, refout: false, xorout: 0x0000 },
  { name: "CRC-16/XMODEM", width: 16, poly: 0x1021, init: 0x0000, refin: false, refout: false, xorout: 0x0000 },
  { name: "CRC-16/KERMIT", width: 16, poly: 0x1021, init: 0x0000, refin: true, refout: true, xorout: 0x0000 },
  { name: "CRC-16/IBM-SDLC", width: 16, poly: 0x1021, init: 0xffff, refin: true, refout: true, xorout: 0xffff },
  { name: "CRC-16/USB", width: 16, poly: 0x8005, init: 0xffff, refin: true, refout: true, xorout: 0xffff },
  { name: "CRC-16/MAXIM", width: 16, poly: 0x8005, init: 0x0000, refin: true, refout: true, xorout: 0xffff },
  { name: "CRC-16/ARC", width: 16, poly: 0x8005, init: 0x0000, refin: true, refout: true, xorout: 0x0000 },
  { name: "CRC-32", width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: true, refout: true, xorout: 0xffffffff },
  { name: "CRC-32/BZIP2", width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: false, refout: false, xorout: 0xffffffff },
];

export function getPreset(name: string): CrcPreset {
  const p = CRC_PRESETS.find((x) => x.name === name);
  if (!p) throw new Error(`Unknown CRC preset: ${name}`);
  return p;
}
