// MIL-STD-1553B word decoding/encoding. Pure TS, no DOM.
//
// A 1553 word occupies 20 bit-times: a 3-bit sync waveform, the 16-bit word
// content (transmitted MSB first), and 1 odd-parity bit. This module works on
// the 16-bit content (0x0000–0xFFFF); sync and parity are computed/derived
// separately. Bit 15 is the first transmitted content bit.

/** Odd-parity bit: makes the total number of 1s (16 content + parity) odd. */
export function oddParity(word: number): number {
  let ones = 0;
  for (let i = 0; i < 16; i++) ones += (word >> i) & 1;
  return ones % 2 === 0 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Mode codes (MIL-STD-1553B) — valid only when subaddress is 0 or 31.
// ---------------------------------------------------------------------------
export interface ModeCode {
  code: number;
  /** Required Transmit/Receive bit (1 = transmit). */
  tr: 0 | 1;
  name: string;
  /** Whether the mode command is associated with a data word. */
  dataWord: boolean;
}

export const MODE_CODES: ModeCode[] = [
  { code: 0, tr: 1, name: "Dynamic Bus Control", dataWord: false },
  { code: 1, tr: 1, name: "Synchronize", dataWord: false },
  { code: 2, tr: 1, name: "Transmit Status Word", dataWord: false },
  { code: 3, tr: 1, name: "Initiate Self-Test", dataWord: false },
  { code: 4, tr: 1, name: "Transmitter Shutdown", dataWord: false },
  { code: 5, tr: 1, name: "Override Transmitter Shutdown", dataWord: false },
  { code: 6, tr: 1, name: "Inhibit Terminal Flag Bit", dataWord: false },
  { code: 7, tr: 1, name: "Override Inhibit Terminal Flag Bit", dataWord: false },
  { code: 8, tr: 1, name: "Reset Remote Terminal", dataWord: false },
  { code: 16, tr: 1, name: "Transmit Vector Word", dataWord: true },
  { code: 17, tr: 0, name: "Synchronize (with data word)", dataWord: true },
  { code: 18, tr: 1, name: "Transmit Last Command Word", dataWord: true },
  { code: 19, tr: 1, name: "Transmit Built-In-Test (BIT) Word", dataWord: true },
  { code: 20, tr: 0, name: "Selected Transmitter Shutdown", dataWord: true },
  { code: 21, tr: 0, name: "Override Selected Transmitter Shutdown", dataWord: true },
];

/** Resolve a mode code for a given T/R bit; falls back to any code match. */
export function lookupModeCode(transmit: boolean, code: number): ModeCode | null {
  const trBit = transmit ? 1 : 0;
  return (
    MODE_CODES.find((m) => m.code === code && m.tr === trBit) ??
    MODE_CODES.find((m) => m.code === code) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Command word
// ---------------------------------------------------------------------------
export interface CommandWord {
  raw: number;
  rtAddress: number; // bits 15-11
  broadcast: boolean; // rtAddress === 31
  transmit: boolean; // bit 10 (T/R)
  subaddress: number; // bits 9-5
  isModeCommand: boolean; // subaddress 0 or 31
  /** Data-transfer word count 1-32 (field 0 → 32); null for mode commands. */
  wordCount: number | null;
  modeCode: number | null;
  mode: ModeCode | null;
  parity: number;
}

export function decodeCommandWord(word: number): CommandWord {
  const w = word & 0xffff;
  const rtAddress = (w >> 11) & 0x1f;
  const transmit = ((w >> 10) & 1) === 1;
  const subaddress = (w >> 5) & 0x1f;
  const last5 = w & 0x1f;
  const isModeCommand = subaddress === 0 || subaddress === 31;
  return {
    raw: w,
    rtAddress,
    broadcast: rtAddress === 31,
    transmit,
    subaddress,
    isModeCommand,
    wordCount: isModeCommand ? null : last5 === 0 ? 32 : last5,
    modeCode: isModeCommand ? last5 : null,
    mode: isModeCommand ? lookupModeCode(transmit, last5) : null,
    parity: oddParity(w),
  };
}

export interface CommandWordFields {
  rtAddress: number;
  transmit: boolean;
  subaddress: number;
  /** Word count 1-32 (data transfer) or mode code 0-31 (subaddress 0/31). */
  wordCountOrMode: number;
}

export function encodeCommandWord(f: CommandWordFields): number {
  const isMode = f.subaddress === 0 || f.subaddress === 31;
  const last5 = isMode ? f.wordCountOrMode : f.wordCountOrMode === 32 ? 0 : f.wordCountOrMode;
  return (
    (((f.rtAddress & 0x1f) << 11) |
      ((f.transmit ? 1 : 0) << 10) |
      ((f.subaddress & 0x1f) << 5) |
      (last5 & 0x1f)) &
    0xffff
  );
}

// ---------------------------------------------------------------------------
// Status word
// ---------------------------------------------------------------------------
export interface StatusWord {
  raw: number;
  rtAddress: number; // bits 15-11
  messageError: boolean; // bit 10
  instrumentation: boolean; // bit 9 (reserved, normally 0)
  serviceRequest: boolean; // bit 8
  reserved: number; // bits 7-5
  broadcastReceived: boolean; // bit 4
  busy: boolean; // bit 3
  subsystemFlag: boolean; // bit 2
  dynamicBusControlAccept: boolean; // bit 1
  terminalFlag: boolean; // bit 0
  parity: number;
}

export function decodeStatusWord(word: number): StatusWord {
  const w = word & 0xffff;
  return {
    raw: w,
    rtAddress: (w >> 11) & 0x1f,
    messageError: ((w >> 10) & 1) === 1,
    instrumentation: ((w >> 9) & 1) === 1,
    serviceRequest: ((w >> 8) & 1) === 1,
    reserved: (w >> 5) & 0x7,
    broadcastReceived: ((w >> 4) & 1) === 1,
    busy: ((w >> 3) & 1) === 1,
    subsystemFlag: ((w >> 2) & 1) === 1,
    dynamicBusControlAccept: ((w >> 1) & 1) === 1,
    terminalFlag: (w & 1) === 1,
    parity: oddParity(w),
  };
}

export interface StatusWordFields {
  rtAddress: number;
  messageError?: boolean;
  serviceRequest?: boolean;
  broadcastReceived?: boolean;
  busy?: boolean;
  subsystemFlag?: boolean;
  dynamicBusControlAccept?: boolean;
  terminalFlag?: boolean;
}

export function encodeStatusWord(f: StatusWordFields): number {
  // Instrumentation (bit 9) and reserved (bits 7-5) are fixed at 0.
  return (
    (((f.rtAddress & 0x1f) << 11) |
      ((f.messageError ? 1 : 0) << 10) |
      ((f.serviceRequest ? 1 : 0) << 8) |
      ((f.broadcastReceived ? 1 : 0) << 4) |
      ((f.busy ? 1 : 0) << 3) |
      ((f.subsystemFlag ? 1 : 0) << 2) |
      ((f.dynamicBusControlAccept ? 1 : 0) << 1) |
      (f.terminalFlag ? 1 : 0)) &
    0xffff
  );
}

// ---------------------------------------------------------------------------
// Message (transaction) layout — role inference from the leading command word
// ---------------------------------------------------------------------------
export type MessageWordRole = "command" | "data" | "status";

export interface DecodedMessageWord {
  raw: number;
  role: MessageWordRole;
  label: string;
  command?: CommandWord;
  status?: StatusWord;
}

export interface DecodedMessage {
  type: string;
  words: DecodedMessageWord[];
  expectedCount: number;
  ok: boolean;
  note?: string;
}

/**
 * Lay out a 1553 transfer from its words. Word 0 is treated as the command;
 * BC→RT, RT→BC and mode-command formats are derived from its T/R bit and
 * subaddress. (RT→RT transfers use two command words and are out of scope.)
 */
export function decodeMessage(words: number[]): DecodedMessage {
  if (words.length === 0) {
    return { type: "", words: [], expectedCount: 0, ok: false, note: "No words provided." };
  }
  const cmd = decodeCommandWord(words[0]!);
  const roles: { role: MessageWordRole; label: string }[] = [];
  let type: string;

  if (cmd.isModeCommand) {
    type = `Mode command${cmd.broadcast ? " (broadcast)" : ""}`;
    const hasData = cmd.mode?.dataWord ?? false;
    roles.push({ role: "command", label: "Mode command" });
    if (hasData && cmd.transmit) {
      roles.push({ role: "status", label: "RT status" });
      roles.push({ role: "data", label: "Mode data word" });
    } else if (hasData) {
      roles.push({ role: "data", label: "Mode data word" });
      if (!cmd.broadcast) roles.push({ role: "status", label: "RT status" });
    } else if (!cmd.broadcast) {
      roles.push({ role: "status", label: "RT status" });
    }
  } else if (cmd.transmit) {
    type = "RT → BC (transmit)";
    roles.push({ role: "command", label: "Command (RT → BC)" });
    roles.push({ role: "status", label: "RT status" });
    for (let i = 0; i < (cmd.wordCount ?? 0); i++) roles.push({ role: "data", label: `Data word ${i + 1}` });
  } else {
    type = cmd.broadcast ? "BC → RT broadcast (no status)" : "BC → RT (receive)";
    roles.push({ role: "command", label: "Command (BC → RT)" });
    for (let i = 0; i < (cmd.wordCount ?? 0); i++) roles.push({ role: "data", label: `Data word ${i + 1}` });
    if (!cmd.broadcast) roles.push({ role: "status", label: "RT status" });
  }

  const decoded: DecodedMessageWord[] = words.map((w, i) => {
    const r = roles[i];
    const role = r?.role ?? "data";
    const raw = w & 0xffff;
    return {
      raw,
      role,
      label: r?.label ?? `Extra word ${i + 1}`,
      command: role === "command" ? decodeCommandWord(raw) : undefined,
      status: role === "status" ? decodeStatusWord(raw) : undefined,
    };
  });

  return {
    type,
    words: decoded,
    expectedCount: roles.length,
    ok: roles.length === words.length,
    note:
      roles.length !== words.length
        ? `Expected ${roles.length} word${roles.length === 1 ? "" : "s"} for this transfer, got ${words.length}.`
        : undefined,
  };
}
