// LS ELECTRIC XGT Cnet dedicated protocol frames. Pure TS, no DOM.
//
// The dedicated protocol is plain ASCII with control characters at both ends:
//
//   ENQ | station | command | command type | data area | EOT | BCC
//   ACK | station | command | command type | data-or-empty | ETX | BCC
//   NAK | station | command | command type | error code  | ETX | BCC
//
//   <ENQ>20rSS0106%MW100<EOT>A4     ← read one word from %MW100 of station 20
//
// The rule that costs commissioning engineers the most time is the BCC one: the
// BCC exists ONLY when the command letter is lowercase. Send "R" with a trailing
// checksum and the module rejects the frame; send "r" without one and it rejects
// it too. So "is a BCC present", "is a BCC required" and "does the BCC agree" are
// three separate results here, never collapsed into one boolean.
//
// The BCC itself is the plainest checksum there is — the unsigned 8-bit sum of
// every byte from the header byte through the tail byte, both inclusive. No XOR,
// no seed, no complement. It is worth stating because CRC-shaped guesses are the
// usual reason a hand-built frame is NAKed.
//
// Frame layout, command set, data-area layouts and the error-code table are from
// "Cnet I/F Module, XGT Series (XGL-C22A/C22B/CH2A/CH2B/C42A/C42B) User's
// Manual", LS ELECTRIC, V3.3 2023.05, Ch.7. The BCC arithmetic and its worked
// example are from the "XGB Cnet I/F User's Manual" V2.0. Golden vectors and the
// distinction between manual-printed and derived values live in
// vectors/xgt.json.

/** Control characters that frame a dedicated-protocol message. */
export const XGT_CONTROL = {
  ENQ: 0x05,
  EOT: 0x04,
  ACK: 0x06,
  NAK: 0x15,
  ETX: 0x03,
} as const;

const ENQ = String.fromCharCode(XGT_CONTROL.ENQ);
const EOT = String.fromCharCode(XGT_CONTROL.EOT);
const ACK = String.fromCharCode(XGT_CONTROL.ACK);
const NAK = String.fromCharCode(XGT_CONTROL.NAK);
const ETX = String.fromCharCode(XGT_CONTROL.ETX);

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/** Error codes carried by a NAK response, keyed by the 4 ASCII characters. */
export const XGT_ERROR_CODES: Record<string, string> = {
  "0003": "Block number excess — more than 16 blocks in one frame",
  "0004": "Variable size error — variable name longer than 12 characters",
  "0007": "Data type error — type letter is not X, B, W, D or L",
  "0011": "Data error",
  "0090": "Monitor execution error — that registration number is not registered",
  "0190": "Monitor execution error — registration number out of range",
  "0290": "Monitor registration error — registration number out of range",
  "1132": "Device memory error",
  "1232": "Data size error — more than 60 words requested",
  "1234": "Spare frame error",
  "1332": "Data type mismatch — every block in a frame must use one data type",
  "1432": "Data value error",
  "7132": "Variable request area excess",
};

/** Meaning of a NAK error code; accepts either case, null when unlisted. */
export function xgtErrorText(code: string): string | null {
  return XGT_ERROR_CODES[code.trim().toUpperCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Data types and variable names
// ---------------------------------------------------------------------------

/** Data-type letter inside a variable name. */
export type XgtDataType = "X" | "B" | "W" | "D" | "L";

const DATA_TYPE_BYTES: Record<XgtDataType, number> = { X: 1, B: 1, W: 2, D: 4, L: 8 };

const DATA_TYPE_NAMES: Record<XgtDataType, string> = {
  X: "Bit",
  B: "Byte",
  W: "Word",
  D: "Double word",
  L: "Long word",
};

/** Bytes one datum of this type occupies. A bit travels as a whole byte. */
export function xgtDataTypeBytes(type: XgtDataType): number {
  return DATA_TYPE_BYTES[type];
}

/** ASCII characters one datum of this type occupies — two per byte. */
export function xgtDataTypeChars(type: XgtDataType): number {
  return DATA_TYPE_BYTES[type] * 2;
}

/** Human name of a data-type letter. */
export function xgtDataTypeName(type: XgtDataType): string {
  return DATA_TYPE_NAMES[type];
}

/**
 * The type letter of a variable name — the character after "%" and the area
 * letter, e.g. %MW100 → W, %DW000 → W, %MD100 → D.
 */
export function xgtDataTypeOf(name: string): XgtDataType | null {
  const letter = name.trim().toUpperCase().charAt(2);
  return letter in DATA_TYPE_BYTES ? (letter as XgtDataType) : null;
}

/** Longest variable name the protocol accepts. */
const MAX_NAME_CHARS = 12;
/** Most blocks an individual (SS) frame may carry. */
const MAX_BLOCKS = 16;
/** Most data one continuous (SB) frame may move: 60 words. */
const MAX_CONTINUOUS_BYTES = 120;

interface CheckedName {
  name: string;
  type: XgtDataType;
}

type NameCheck = { ok: true; value: CheckedName } | { ok: false; error: string };

function checkName(input: string): NameCheck {
  const name = input.trim().toUpperCase();
  if (name === "") return { ok: false, error: "Enter a variable name, e.g. %MW100" };
  if (!name.startsWith("%")) {
    return { ok: false, error: `A variable name starts with "%", e.g. %MW100 — got "${input}"` };
  }
  if (!/^[%0-9A-Z]+$/.test(name)) {
    return {
      ok: false,
      error: `A variable name holds only letters, digits and "%" — got "${input}"`,
    };
  }
  if (name.length > MAX_NAME_CHARS) {
    return {
      ok: false,
      error: `Variable name is ${name.length} characters, over the ${MAX_NAME_CHARS}-character limit (NAK 0004) — "${input}"`,
    };
  }
  const type = xgtDataTypeOf(name);
  if (type === null) {
    return {
      ok: false,
      error: `"${input}" has no data-type letter — the third character must be X, B, W, D or L (NAK 0007)`,
    };
  }
  return { ok: true, value: { name, type } };
}

// ---------------------------------------------------------------------------
// BCC
// ---------------------------------------------------------------------------

/**
 * Block check character: the unsigned 8-bit sum of the given bytes, as two
 * uppercase ASCII hex characters.
 *
 * Feed it every byte from the header through the tail, both inclusive — ENQ..EOT
 * for a request, ACK..ETX or NAK..ETX for a response. The control characters are
 * part of the sum; leaving them out is the classic off-by-one that produces a
 * frame the PLC silently ignores.
 */
export function computeBcc(bytes: number[] | Uint8Array): string {
  let sum = 0;
  for (const b of bytes) sum = (sum + (b & 0xff)) & 0xff;
  return sum.toString(16).toUpperCase().padStart(2, "0");
}

/** ASCII byte values of a frame string. */
export function xgtAsciiBytes(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i) & 0xff);
  return out;
}

const CONTROL_NAMES: Record<string, string> = {
  [ENQ]: "ENQ",
  [EOT]: "EOT",
  [ACK]: "ACK",
  [NAK]: "NAK",
  [ETX]: "ETX",
};

/** Frame text with its control characters written as mnemonics, for display. */
export function xgtFrameDisplay(text: string): string {
  let out = "";
  for (const ch of text) out += CONTROL_NAMES[ch] ? `<${CONTROL_NAMES[ch]}>` : ch;
  return out;
}

// ---------------------------------------------------------------------------
// Building requests
// ---------------------------------------------------------------------------

/** The four request commands this builder emits. */
export type XgtRequestCommand = "RSS" | "RSB" | "WSS" | "WSB";

interface XgtBuildCommon {
  /** Station number: a byte, or the two hex characters exactly as sent. */
  station: number | string;
  /**
   * Append a BCC. Because the protocol ties the checksum to the letter case,
   * this also chooses the case: true → "r"/"w" with BCC, false → "R"/"W"
   * without. Defaults to true.
   */
  useBcc?: boolean;
}

/** One block of an individual write. */
export interface XgtWriteBlock {
  name: string;
  /** Value as ASCII hex characters, e.g. "00FF" for one word. */
  data: string;
}

/** What to build. The command letter selects the data-area layout. */
export type XgtBuildInput =
  | (XgtBuildCommon & { command: "RSS"; variables: string[] })
  | (XgtBuildCommon & { command: "RSB"; name: string; count: number })
  | (XgtBuildCommon & { command: "WSS"; blocks: XgtWriteBlock[] })
  | (XgtBuildCommon & { command: "WSB"; name: string; count: number; data: string });

/** A built request, ready to put on the wire. */
export interface XgtBuiltFrame {
  /** The frame exactly as sent, control characters included. */
  text: string;
  /** ASCII byte values of `text`. */
  bytes: number[];
  /** `text` with control characters shown as <ENQ>/<EOT>, for display. */
  display: string;
  /** Everything between the header and the tail: station..data area. */
  body: string;
  /** Just the data area, after station + command + command type. */
  dataArea: string;
  /** The two BCC characters, or null when the uppercase command forbids one. */
  bcc: string | null;
  /** Anything odd but still buildable, e.g. a data length that looks wrong. */
  notes: string[];
}

export type XgtBuildResult = { ok: true; frame: XgtBuiltFrame } | { ok: false; error: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function hex2(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

type StationCheck = { ok: true; text: string } | { ok: false; error: string };

function checkStation(station: number | string): StationCheck {
  if (typeof station === "number") {
    if (!Number.isInteger(station) || station < 0 || station > 0xff) {
      return fail(`Station must be 0-255 (two hex characters), got ${station}`);
    }
    return { ok: true, text: hex2(station) };
  }
  const text = station.trim().toUpperCase();
  if (!/^[0-9A-F]{2}$/.test(text)) {
    return fail(`Station is two hex characters, e.g. "01" or "0A" — got "${station}"`);
  }
  return { ok: true, text };
}

function checkHexData(data: string, label: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = data.trim().toUpperCase();
  if (text === "") return fail(`${label} has no data`);
  if (!/^[0-9A-F]+$/.test(text)) return fail(`${label} must be ASCII hex characters — got "${data}"`);
  if (text.length % 2 !== 0) {
    return fail(`${label} has ${text.length} characters; data is whole bytes, so the count must be even`);
  }
  return { ok: true, text };
}

/** Every block of one frame must share a data type (NAK 1332). */
function checkOneType(names: CheckedName[]): { ok: true } | { ok: false; error: string } {
  const first = names[0];
  if (!first) return { ok: true };
  const odd = names.find((n) => n.type !== first.type);
  if (odd) {
    return fail(
      `All blocks in one frame must use the same data type — ${first.name} is ${first.type} but ${odd.name} is ${odd.type} (NAK 1332)`,
    );
  }
  return { ok: true };
}

function assembleRequest(body: string, useBcc: boolean, dataArea: string, notes: string[]): XgtBuiltFrame {
  const framed = ENQ + body + EOT;
  const bcc = useBcc ? computeBcc(xgtAsciiBytes(framed)) : null;
  const text = bcc === null ? framed : framed + bcc;
  return {
    text,
    bytes: xgtAsciiBytes(text),
    display: xgtFrameDisplay(text),
    body,
    dataArea,
    bcc,
    notes,
  };
}

/**
 * Build an RSS / RSB / WSS / WSB request.
 *
 * Sizes and counts go on the wire as two ASCII hex characters; the variable size
 * is the CHARACTER COUNT of the name ("%MW100" → "06"), not its byte width.
 */
export function buildXgtFrame(input: XgtBuildInput): XgtBuildResult {
  const station = checkStation(input.station);
  if (!station.ok) return station;

  const useBcc = input.useBcc ?? true;
  const notes: string[] = [];
  let dataArea: string;

  switch (input.command) {
    case "RSS": {
      if (input.variables.length === 0) return fail("An individual read needs at least one variable");
      if (input.variables.length > MAX_BLOCKS) {
        return fail(
          `An individual read takes at most ${MAX_BLOCKS} blocks, got ${input.variables.length} (NAK 0003)`,
        );
      }
      const names: CheckedName[] = [];
      for (const v of input.variables) {
        const checked = checkName(v);
        if (!checked.ok) return checked;
        names.push(checked.value);
      }
      const oneType = checkOneType(names);
      if (!oneType.ok) return oneType;

      dataArea =
        hex2(names.length) + names.map((n) => hex2(n.name.length) + n.name).join("");
      break;
    }

    case "WSS": {
      if (input.blocks.length === 0) return fail("An individual write needs at least one block");
      if (input.blocks.length > MAX_BLOCKS) {
        return fail(
          `An individual write takes at most ${MAX_BLOCKS} blocks, got ${input.blocks.length} (NAK 0003)`,
        );
      }
      const parts: string[] = [];
      const names: CheckedName[] = [];
      for (const block of input.blocks) {
        const checked = checkName(block.name);
        if (!checked.ok) return checked;
        const data = checkHexData(block.data, `Data for ${checked.value.name}`);
        if (!data.ok) return data;

        // One block of an individual write carries exactly one datum, so its
        // width follows from the name. A mismatch is worth saying out loud, but
        // it is the operator's frame — build what was asked for.
        const expected = xgtDataTypeChars(checked.value.type);
        if (data.text.length !== expected) {
          notes.push(
            `${checked.value.name} is ${xgtDataTypeName(checked.value.type).toLowerCase()} data (${expected} characters) but ${data.text.length} were given`,
          );
        }
        names.push(checked.value);
        parts.push(hex2(checked.value.name.length) + checked.value.name + data.text);
      }
      const oneType = checkOneType(names);
      if (!oneType.ok) return oneType;

      dataArea = hex2(parts.length) + parts.join("");
      break;
    }

    case "RSB": {
      const checked = checkName(input.name);
      if (!checked.ok) return checked;
      const count = checkCount(input.count, checked.value.type);
      if (!count.ok) return count;

      dataArea = hex2(checked.value.name.length) + checked.value.name + hex2(input.count);
      break;
    }

    case "WSB": {
      const checked = checkName(input.name);
      if (!checked.ok) return checked;
      const count = checkCount(input.count, checked.value.type);
      if (!count.ok) return count;
      const data = checkHexData(input.data, `Data for ${checked.value.name}`);
      if (!data.ok) return data;

      const expected = input.count * xgtDataTypeChars(checked.value.type);
      if (data.text.length !== expected) {
        notes.push(
          `${input.count} × ${xgtDataTypeName(checked.value.type).toLowerCase()} is ${expected} characters but ${data.text.length} were given`,
        );
      }
      dataArea =
        hex2(checked.value.name.length) + checked.value.name + hex2(input.count) + data.text;
      break;
    }
  }

  const letter = input.command.startsWith("R") ? "R" : "W";
  const body = station.text + (useBcc ? letter.toLowerCase() : letter) + input.command.slice(1);
  return { ok: true, frame: assembleRequest(body + dataArea, useBcc, dataArea, notes) };
}

function checkCount(count: number, type: XgtDataType): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(count) || count < 1) {
    return fail(`Number of data must be a whole number of at least 1, got ${count}`);
  }
  const bytes = count * xgtDataTypeBytes(type);
  if (bytes > MAX_CONTINUOUS_BYTES) {
    return fail(
      `A continuous transfer moves at most 60 words (${MAX_CONTINUOUS_BYTES} bytes); ${count} × ${xgtDataTypeName(type).toLowerCase()} is ${bytes} bytes (NAK 1232)`,
    );
  }
  if (count > 0xff) return fail(`Number of data is two hex characters, so at most 255 — got ${count}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Which control character opened the frame. */
export type XgtHeaderKind = "ENQ" | "ACK" | "NAK";

/** What the command type field means for this command. */
export type XgtFrameMode = "individual" | "continuous" | "registration";

/** The command letter, with its case — the case is what governs the BCC. */
export interface XgtCommandInfo {
  /** As found on the wire, e.g. "r". */
  raw: string;
  /** Uppercased. */
  letter: "R" | "W" | "X" | "Y";
  lowercase: boolean;
  name: string;
}

/** One block of a data area. Which fields are filled depends on the frame. */
export interface XgtDataBlock {
  /** Declared character count of the variable name (request frames). */
  variableSize?: number;
  name?: string;
  /** Data type letter taken from the name. */
  dataType?: XgtDataType;
  /** Declared number of data — items on a request, BYTES on a read response. */
  count?: number;
  /** Payload characters, two per byte. */
  data?: string;
}

/** How the BCC of a parsed frame stands against the protocol rule. */
export type XgtBccStatus =
  /** Lowercase command, BCC present and matching. */
  | "valid"
  /** Lowercase command, BCC present but wrong. */
  | "mismatch"
  /** Lowercase command, BCC missing. */
  | "missing"
  /** Uppercase command, no BCC — correct. */
  | "not-required"
  /** Uppercase command, but a BCC was appended anyway. */
  | "unexpected";

/** A decoded frame. */
export interface XgtParsedFrame {
  kind: XgtHeaderKind;
  direction: "request" | "response";
  /** True for NAK. */
  isError: boolean;
  /** Station as found, two hex characters. */
  stationText: string;
  /** Station as a number. */
  station: number;
  command: XgtCommandInfo;
  /** The two command-type characters as found: "SS", "SB" or a number. */
  commandType: string;
  mode: XgtFrameMode;
  /** Command in canonical form, e.g. "RSS" — absent for monitor frames. */
  commandCode?: XgtRequestCommand;
  /** Registration number, for monitor register/execute frames. */
  registrationNumber?: number;
  /** For a monitor registration (X), the command being registered. */
  registered?: {
    commandCode: string;
    mode: XgtFrameMode;
    blocks: XgtDataBlock[];
  };
  blocks: XgtDataBlock[];
  /** Error code characters from a NAK. */
  errorCode?: string;
  /** Meaning of `errorCode`, when it is in the published table. */
  errorText?: string;
  /** Everything between the header and the tail. */
  body: string;
  /** The data area, after station + command + command type. */
  dataArea: string;
  bccRequired: boolean;
  bccPresent: boolean;
  /** BCC as found, uppercased. */
  bcc?: string;
  /** BCC computed over header..tail inclusive. */
  expectedBcc: string;
  bccStatus: XgtBccStatus;
  /** True when the frame's checksum state agrees with the protocol rule. */
  bccValid: boolean;
  /** The frame as parsed, control characters included. */
  text: string;
  /** `text` with control characters shown as <ENQ>/<EOT>. */
  display: string;
  /** Anything recoverable but wrong — short data areas, stray trailing bytes. */
  notes: string[];
}

export type XgtFrameParseResult =
  | { ok: true; frame: XgtParsedFrame }
  | { ok: false; error: string };

const COMMAND_NAMES: Record<string, string> = {
  R: "Read",
  W: "Write",
  X: "Monitor register",
  Y: "Monitor execute",
};

/**
 * Turn pasted text into frame text. Accepts the frame as-is with real control
 * characters, the same frame with them written as <ENQ>/[ENQ]/{ENQ}, or a
 * whitespace-separated hex dump — the three forms a capture arrives in.
 */
function normaliseFrameText(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "") return "";

  // Hex dump: every token is a byte. Separators are what tells it apart from a
  // frame body, which never contains whitespace.
  if (/^[0-9A-Fa-f]{2}(?:[\s,]+[0-9A-Fa-f]{2})+$/.test(trimmed)) {
    return trimmed
      .split(/[\s,]+/)
      .map((byte) => String.fromCharCode(parseInt(byte, 16)))
      .join("");
  }

  return trimmed.replace(/[<[{](ENQ|EOT|ACK|NAK|ETX)[>\]}]/gi, (_m, name: string) => {
    const upper = name.toUpperCase() as keyof typeof XGT_CONTROL;
    return String.fromCharCode(XGT_CONTROL[upper]);
  });
}

/** Walks a data area, recording what ran out rather than throwing. */
class Reader {
  private index = 0;
  constructor(
    private readonly text: string,
    private readonly notes: string[],
  ) {}

  get rest(): string {
    return this.text.slice(this.index);
  }

  get done(): boolean {
    return this.index >= this.text.length;
  }

  take(count: number, label: string): string | null {
    if (count < 0 || this.index + count > this.text.length) {
      this.notes.push(`Data area ends before ${label} is complete`);
      this.index = this.text.length;
      return null;
    }
    const out = this.text.slice(this.index, this.index + count);
    this.index += count;
    return out;
  }

  takeHex2(label: string): number | null {
    const raw = this.take(2, label);
    if (raw === null) return null;
    if (!/^[0-9A-Fa-f]{2}$/.test(raw)) {
      this.notes.push(`${label} should be two hex characters, found "${raw}"`);
      return null;
    }
    return parseInt(raw, 16);
  }

  finish(): void {
    if (!this.done) this.notes.push(`${this.text.length - this.index} unread characters after the data area`);
  }
}

function parseRequestBlocks(
  letter: "R" | "W",
  continuous: boolean,
  dataArea: string,
  notes: string[],
): XgtDataBlock[] {
  const reader = new Reader(dataArea, notes);
  const blocks: XgtDataBlock[] = [];

  if (continuous) {
    // SB carries one variable and a count — no block-count field.
    const size = reader.takeHex2("variable size");
    if (size === null) return blocks;
    const name = reader.take(size, "variable name");
    if (name === null) return blocks;
    const count = reader.takeHex2("number of data");
    const type = xgtDataTypeOf(name) ?? undefined;
    const block: XgtDataBlock = { variableSize: size, name, dataType: type };
    if (count !== null) block.count = count;
    if (letter === "W") block.data = reader.rest;
    blocks.push(block);
    if (letter === "W") return blocks;
    reader.finish();
    return blocks;
  }

  const blockCount = reader.takeHex2("number of blocks");
  if (blockCount === null) return blocks;
  if (blockCount > MAX_BLOCKS) {
    notes.push(`${blockCount} blocks declared, over the ${MAX_BLOCKS}-block limit (NAK 0003)`);
  }

  for (let i = 0; i < blockCount; i++) {
    const size = reader.takeHex2(`block ${i + 1} variable size`);
    if (size === null) break;
    const name = reader.take(size, `block ${i + 1} variable name`);
    if (name === null) break;
    const type = xgtDataTypeOf(name) ?? undefined;
    const block: XgtDataBlock = { variableSize: size, name, dataType: type };
    if (letter === "W") {
      // An individual write carries one datum per block; its width comes from
      // the name, which is the only thing that says how far this block runs.
      const chars = type ? xgtDataTypeChars(type) : 0;
      if (!type) {
        notes.push(`Block ${i + 1} "${name}" has no data-type letter, so its data length is unknown (NAK 0007)`);
        block.data = reader.rest;
        blocks.push(block);
        break;
      }
      const data = reader.take(chars, `block ${i + 1} data`);
      if (data === null) break;
      block.data = data;
    }
    blocks.push(block);
  }
  reader.finish();
  return blocks;
}

function parseReadAckBlocks(continuous: boolean, dataArea: string, notes: string[]): XgtDataBlock[] {
  const blocks: XgtDataBlock[] = [];

  if (continuous) {
    // A continuous read response is "01" + byte count + data, but one manual
    // example omits the block-count field. Prefer the documented layout and fall
    // back only when the lengths say the field is absent.
    const withField = /^([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]*)$/.exec(dataArea);
    if (withField) {
      const count = parseInt(withField[2]!, 16);
      if (withField[3]!.length === count * 2) {
        return [{ count, data: withField[3]! }];
      }
      const noField = parseInt(withField[1]!, 16);
      if (withField[2]!.length + withField[3]!.length === noField * 2) {
        notes.push("Block-count field absent — read as number-of-data followed by data");
        return [{ count: noField, data: withField[2]! + withField[3]! }];
      }
    }
    const reader = new Reader(dataArea, notes);
    reader.takeHex2("number of blocks");
    const count = reader.takeHex2("number of data");
    const data = reader.rest;
    if (count !== null && data.length !== count * 2) {
      notes.push(`Number of data is ${count} bytes (${count * 2} characters) but ${data.length} were sent`);
    }
    blocks.push(count === null ? { data } : { count, data });
    return blocks;
  }

  const reader = new Reader(dataArea, notes);
  const blockCount = reader.takeHex2("number of blocks");
  if (blockCount === null) return blocks;
  for (let i = 0; i < blockCount; i++) {
    const count = reader.takeHex2(`block ${i + 1} number of data`);
    if (count === null) break;
    const data = reader.take(count * 2, `block ${i + 1} data`);
    if (data === null) break;
    blocks.push({ count, data });
  }
  reader.finish();
  return blocks;
}

/**
 * Decode a dedicated-protocol frame.
 *
 * Structural faults — no header, no tail, an unknown command letter — fail. A
 * data area that does not add up does not: the blocks recovered so far and the
 * BCC verdict are still worth showing, so those land in `notes`.
 */
export function parseXgtFrame(text: string): XgtFrameParseResult {
  const frameText = normaliseFrameText(text);
  if (frameText === "") return fail("Paste a frame to decode");

  const headerIndex = frameText.search(/[\x05\x06\x15]/);
  if (headerIndex < 0) {
    return fail("No ENQ, ACK or NAK found — paste the frame with its control characters (or as hex bytes)");
  }
  const headerChar = frameText.charAt(headerIndex);
  const kind: XgtHeaderKind = headerChar === ENQ ? "ENQ" : headerChar === ACK ? "ACK" : "NAK";
  const tailChar = kind === "ENQ" ? EOT : ETX;

  const tailIndex = frameText.indexOf(tailChar, headerIndex + 1);
  if (tailIndex < 0) {
    return fail(
      kind === "ENQ"
        ? "No EOT — a request ends with EOT (0x04) before its BCC"
        : "No ETX — a response ends with ETX (0x03) before its BCC",
    );
  }

  const notes: string[] = [];
  if (headerIndex > 0) notes.push(`${headerIndex} characters before ${kind} were ignored`);

  const body = frameText.slice(headerIndex + 1, tailIndex);
  const framed = frameText.slice(headerIndex, tailIndex + 1);
  const expectedBcc = computeBcc(xgtAsciiBytes(framed));

  const trailing = frameText.slice(tailIndex + 1).trim().toUpperCase();
  let bcc: string | undefined;
  if (trailing !== "") {
    bcc = trailing.slice(0, 2);
    if (!/^[0-9A-F]{2}$/.test(bcc)) {
      return fail(`BCC must be two hex characters, found "${frameText.slice(tailIndex + 1, tailIndex + 3)}"`);
    }
    if (trailing.length > 2) notes.push(`${trailing.length - 2} characters after the BCC were ignored`);
  }

  if (body.length < 5) {
    return fail(
      `Frame body is "${body}" — it needs at least a 2-character station, a command letter and a 2-character command type`,
    );
  }

  const stationText = body.slice(0, 2).toUpperCase();
  if (!/^[0-9A-F]{2}$/.test(stationText)) {
    return fail(`Station is two hex characters, found "${body.slice(0, 2)}"`);
  }

  const rawCommand = body.charAt(2);
  const letter = rawCommand.toUpperCase();
  if (letter !== "R" && letter !== "W" && letter !== "X" && letter !== "Y") {
    return fail(`"${rawCommand}" is not a command — use r/R read, w/W write, x/X monitor register, y/Y monitor execute`);
  }
  const lowercase = rawCommand === rawCommand.toLowerCase();
  const command: XgtCommandInfo = {
    raw: rawCommand,
    letter,
    lowercase,
    name: COMMAND_NAMES[letter]!,
  };

  const commandType = body.slice(3, 5);
  const dataArea = body.slice(5);

  // The BCC is required by the case of the command letter and nothing else.
  const bccPresent = bcc !== undefined;
  let bccStatus: XgtBccStatus;
  if (lowercase) {
    bccStatus = !bccPresent ? "missing" : bcc === expectedBcc ? "valid" : "mismatch";
  } else {
    bccStatus = bccPresent ? "unexpected" : "not-required";
  }

  const frame: XgtParsedFrame = {
    kind,
    direction: kind === "ENQ" ? "request" : "response",
    isError: kind === "NAK",
    stationText,
    station: parseInt(stationText, 16),
    command,
    commandType,
    mode: "individual",
    blocks: [],
    body,
    dataArea,
    bccRequired: lowercase,
    bccPresent,
    bcc,
    expectedBcc,
    bccStatus,
    bccValid: bccStatus === "valid" || bccStatus === "not-required",
    text: frameText.slice(headerIndex),
    display: xgtFrameDisplay(frameText.slice(headerIndex)),
    notes,
  };

  if (letter === "X" || letter === "Y") {
    frame.mode = "registration";
    if (!/^[0-9A-Fa-f]{2}$/.test(commandType)) {
      notes.push(`Registration number should be two hex characters, found "${commandType}"`);
    } else {
      frame.registrationNumber = parseInt(commandType, 16);
    }

    if (letter === "X" && kind === "ENQ") {
      // A registration carries the whole command it registers, letter and all.
      if (dataArea.length < 3) {
        notes.push("Monitor registration has no command to register");
      } else {
        const innerLetter = dataArea.charAt(0).toUpperCase();
        const innerType = dataArea.slice(1, 3);
        const innerContinuous = innerType.toUpperCase() === "SB";
        if (innerLetter !== "R" && innerLetter !== "W") {
          notes.push(`"${dataArea.charAt(0)}" is not a command that can be registered — use R or W`);
        } else {
          frame.registered = {
            commandCode: (innerLetter + innerType).toUpperCase(),
            mode: innerContinuous ? "continuous" : "individual",
            blocks: parseRequestBlocks(innerLetter, innerContinuous, dataArea.slice(3), notes),
          };
        }
      }
    } else if (dataArea !== "" && kind === "ENQ") {
      notes.push(`Monitor execute carries no data area, found "${dataArea}"`);
    } else if (kind === "ACK" && dataArea !== "") {
      // The response repeats whatever the registered command returns, so its
      // layout is that command's — not something this frame can state alone.
      notes.push("Monitor execute response data follows the layout of the registered command");
    }
  } else {
    const continuous = commandType.toUpperCase() === "SB";
    frame.mode = continuous ? "continuous" : "individual";
    if (commandType.toUpperCase() !== "SS" && commandType.toUpperCase() !== "SB") {
      notes.push(`Command type is "${commandType}" — a read or write uses SS (individual) or SB (continuous)`);
    } else {
      frame.commandCode = (letter + commandType.toUpperCase()) as XgtRequestCommand;
    }

    if (kind === "ENQ") {
      frame.blocks = parseRequestBlocks(letter, continuous, dataArea, notes);
    } else if (kind === "NAK") {
      if (dataArea.length < 4) {
        notes.push(`NAK carries a 4-character error code, found "${dataArea}"`);
      } else {
        if (dataArea.length > 4) notes.push(`${dataArea.length - 4} characters after the error code`);
        frame.errorCode = dataArea.slice(0, 4).toUpperCase();
        frame.errorText = xgtErrorText(frame.errorCode) ?? undefined;
        if (!frame.errorText) notes.push(`Error code ${frame.errorCode} is not in the published table`);
      }
    } else if (letter === "R") {
      frame.blocks = parseReadAckBlocks(continuous, dataArea, notes);
    } else if (dataArea !== "") {
      notes.push(`A write response has no data area, found "${dataArea}"`);
    }
  }

  if (kind === "NAK" && (letter === "X" || letter === "Y")) {
    if (dataArea.length >= 4) {
      frame.errorCode = dataArea.slice(0, 4).toUpperCase();
      frame.errorText = xgtErrorText(frame.errorCode) ?? undefined;
    } else {
      notes.push(`NAK carries a 4-character error code, found "${dataArea}"`);
    }
  }

  return { ok: true, frame };
}
