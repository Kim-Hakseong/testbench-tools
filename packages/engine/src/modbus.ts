// Modbus RTU / TCP frame decoding + protocol sniffing. Pure TS, no DOM.
import { crc, getPreset } from "./checksum";

export type ModbusProtocol = "rtu" | "tcp";

/** One decoded field, with byte range [start, start+length) into the input frame. */
export interface ModbusField {
  name: string;
  start: number;
  length: number;
  /** Display value (mono), e.g. "0x11 (17)". */
  value: string;
  note?: string;
}

export interface ModbusCrcInfo {
  ok: boolean;
  computed: number;
  received: number;
}

export interface ModbusException {
  code: number;
  name: string;
}

export interface ModbusDecodeResult {
  ok: boolean;
  protocol: ModbusProtocol;
  fields: ModbusField[];
  crc?: ModbusCrcInfo; // RTU only
  exception?: ModbusException;
  error?: string;
}

export const FUNCTION_NAMES: Record<number, string> = {
  0x01: "Read Coils",
  0x02: "Read Discrete Inputs",
  0x03: "Read Holding Registers",
  0x04: "Read Input Registers",
  0x05: "Write Single Coil",
  0x06: "Write Single Register",
  0x07: "Read Exception Status",
  0x08: "Diagnostics",
  0x0f: "Write Multiple Coils",
  0x10: "Write Multiple Registers",
  0x16: "Mask Write Register",
  0x17: "Read/Write Multiple Registers",
};

export const EXCEPTION_NAMES: Record<number, string> = {
  0x01: "Illegal Function",
  0x02: "Illegal Data Address",
  0x03: "Illegal Data Value",
  0x04: "Server Device Failure",
  0x05: "Acknowledge",
  0x06: "Server Device Busy",
  0x08: "Memory Parity Error",
  0x0a: "Gateway Path Unavailable",
  0x0b: "Gateway Target Device Failed to Respond",
};

function hexByte(b: number): string {
  return "0x" + b.toString(16).toUpperCase().padStart(2, "0");
}

function hexWord(w: number): string {
  return "0x" + w.toString(16).toUpperCase().padStart(4, "0");
}

function u16(bytes: Uint8Array, i: number): number {
  return ((bytes[i]! << 8) | bytes[i + 1]!) >>> 0;
}

/**
 * Decode the PDU (function code + data) starting at `off`.
 * Request/response direction is inferred from PDU shape where ambiguous.
 */
function decodePdu(
  bytes: Uint8Array,
  off: number,
  end: number,
  fields: ModbusField[],
): ModbusException | undefined {
  const fc = bytes[off]!;
  if ((fc & 0x80) !== 0) {
    const baseFc = fc & 0x7f;
    fields.push({
      name: "Function",
      start: off,
      length: 1,
      value: hexByte(fc),
      note: `Exception response to ${FUNCTION_NAMES[baseFc] ?? "function"} (${hexByte(baseFc)})`,
    });
    const code = bytes[off + 1];
    if (code === undefined) return { code: -1, name: "Truncated exception PDU" };
    const name = EXCEPTION_NAMES[code] ?? "Unknown exception";
    fields.push({
      name: "Exception code",
      start: off + 1,
      length: 1,
      value: hexByte(code),
      note: name,
    });
    return { code, name };
  }

  fields.push({
    name: "Function",
    start: off,
    length: 1,
    value: hexByte(fc),
    note: FUNCTION_NAMES[fc] ?? "Unknown / vendor-specific",
  });

  const dataLen = end - off - 1;
  const d = off + 1;

  switch (fc) {
    case 0x01:
    case 0x02:
    case 0x03:
    case 0x04:
      if (dataLen === 4) {
        // request: start address + quantity
        fields.push({ name: "Start address", start: d, length: 2, value: hexWord(u16(bytes, d)), note: String(u16(bytes, d)) });
        fields.push({ name: "Quantity", start: d + 2, length: 2, value: hexWord(u16(bytes, d + 2)), note: String(u16(bytes, d + 2)) });
        return;
      }
      if (dataLen >= 1 && bytes[d]! === dataLen - 1) {
        // response: byte count + data
        fields.push({ name: "Byte count", start: d, length: 1, value: hexByte(bytes[d]!), note: String(bytes[d]!) });
        pushData(bytes, d + 1, end, fields, fc <= 0x02 ? "Coil/input bytes" : "Register data");
        return;
      }
      break;
    case 0x05:
    case 0x06:
      if (dataLen === 4) {
        fields.push({ name: fc === 0x05 ? "Coil address" : "Register address", start: d, length: 2, value: hexWord(u16(bytes, d)), note: String(u16(bytes, d)) });
        fields.push({ name: "Value", start: d + 2, length: 2, value: hexWord(u16(bytes, d + 2)), note: fc === 0x05 ? (u16(bytes, d + 2) === 0xff00 ? "ON" : u16(bytes, d + 2) === 0 ? "OFF" : "invalid coil value") : String(u16(bytes, d + 2)) });
        return;
      }
      break;
    case 0x0f:
    case 0x10:
      if (dataLen === 4) {
        // response echo: address + quantity
        fields.push({ name: "Start address", start: d, length: 2, value: hexWord(u16(bytes, d)), note: String(u16(bytes, d)) });
        fields.push({ name: "Quantity", start: d + 2, length: 2, value: hexWord(u16(bytes, d + 2)), note: String(u16(bytes, d + 2)) });
        return;
      }
      if (dataLen >= 5 && bytes[d + 4]! === dataLen - 5) {
        fields.push({ name: "Start address", start: d, length: 2, value: hexWord(u16(bytes, d)), note: String(u16(bytes, d)) });
        fields.push({ name: "Quantity", start: d + 2, length: 2, value: hexWord(u16(bytes, d + 2)), note: String(u16(bytes, d + 2)) });
        fields.push({ name: "Byte count", start: d + 4, length: 1, value: hexByte(bytes[d + 4]!), note: String(bytes[d + 4]!) });
        pushData(bytes, d + 5, end, fields, fc === 0x0f ? "Coil bytes" : "Register data");
        return;
      }
      break;
  }
  if (dataLen > 0) pushData(bytes, d, end, fields, "Data");
  return;
}

function pushData(bytes: Uint8Array, start: number, end: number, fields: ModbusField[], name: string) {
  if (end <= start) return;
  const hex = Array.from(bytes.slice(start, end))
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
  fields.push({ name, start, length: end - start, value: hex });
}

/** Decode a Modbus RTU frame: address + PDU + CRC16 (little-endian on wire). */
export function decodeRtu(bytes: Uint8Array): ModbusDecodeResult {
  const fields: ModbusField[] = [];
  if (bytes.length < 4) {
    return { ok: false, protocol: "rtu", fields, error: "RTU frame needs at least 4 bytes (address, function, CRC)." };
  }
  const computed = crc(bytes.slice(0, bytes.length - 2), getPreset("CRC-16/MODBUS"));
  const received = (bytes[bytes.length - 2]! | (bytes[bytes.length - 1]! << 8)) >>> 0; // low byte first
  const crcInfo: ModbusCrcInfo = { ok: computed === received, computed, received };

  fields.push({ name: "Unit / slave address", start: 0, length: 1, value: hexByte(bytes[0]!), note: String(bytes[0]!) });
  const exception = decodePdu(bytes, 1, bytes.length - 2, fields);
  fields.push({
    name: "CRC-16 (LE)",
    start: bytes.length - 2,
    length: 2,
    value: hexWord(received),
    note: crcInfo.ok ? "valid" : `mismatch — computed ${hexWord(computed)}`,
  });

  return { ok: crcInfo.ok, protocol: "rtu", fields, crc: crcInfo, exception };
}

/** Decode a Modbus TCP frame: MBAP header (7 bytes) + PDU. */
export function decodeTcp(bytes: Uint8Array): ModbusDecodeResult {
  const fields: ModbusField[] = [];
  if (bytes.length < 8) {
    return { ok: false, protocol: "tcp", fields, error: "TCP frame needs at least 8 bytes (MBAP header + function)." };
  }
  const transaction = u16(bytes, 0);
  const protocolId = u16(bytes, 2);
  const length = u16(bytes, 4);
  fields.push({ name: "Transaction ID", start: 0, length: 2, value: hexWord(transaction), note: String(transaction) });
  fields.push({ name: "Protocol ID", start: 2, length: 2, value: hexWord(protocolId), note: protocolId === 0 ? "Modbus" : "must be 0x0000" });
  fields.push({ name: "Length", start: 4, length: 2, value: hexWord(length), note: `${length} bytes follow` });
  fields.push({ name: "Unit ID", start: 6, length: 1, value: hexByte(bytes[6]!), note: String(bytes[6]!) });

  let error: string | undefined;
  if (protocolId !== 0) error = "Protocol ID must be 0x0000 for Modbus TCP.";
  else if (length !== bytes.length - 6) error = `MBAP length ${length} does not match ${bytes.length - 6} remaining bytes.`;

  const exception = decodePdu(bytes, 7, bytes.length, fields);
  return { ok: !error, protocol: "tcp", fields, exception, error };
}

/** Guess RTU vs TCP: consistent MBAP header wins, then a valid RTU CRC. */
export function sniff(bytes: Uint8Array): ModbusProtocol {
  if (bytes.length >= 8) {
    const protocolId = u16(bytes, 2);
    const length = u16(bytes, 4);
    if (protocolId === 0 && length === bytes.length - 6) return "tcp";
  }
  if (bytes.length >= 4) {
    const computed = crc(bytes.slice(0, bytes.length - 2), getPreset("CRC-16/MODBUS"));
    const received = (bytes[bytes.length - 2]! | (bytes[bytes.length - 1]! << 8)) >>> 0;
    if (computed === received) return "rtu";
  }
  // fall back: MBAP-shaped enough? otherwise assume RTU
  return bytes.length >= 8 && u16(bytes, 2) === 0 ? "tcp" : "rtu";
}

export function decodeModbus(bytes: Uint8Array, protocol?: ModbusProtocol): ModbusDecodeResult {
  const p = protocol ?? sniff(bytes);
  return p === "tcp" ? decodeTcp(bytes) : decodeRtu(bytes);
}
