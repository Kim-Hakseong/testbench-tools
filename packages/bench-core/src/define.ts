// What a bench-core tool is: one site tool's computation as data in, data out.
//
// The calculation itself lives in @testbench/engine, as it always has — the
// same functions the web pages call. A tool here adds only what a caller
// without a UI needs: a name, a one-line description with an example, an
// input schema, and a run() that turns schema-checked JSON into the engine
// call the page makes and the engine's answer into plain JSON.

import { asciiToBytes, parseHex } from "@testbench/engine";
import type { ObjectSchema, JsonSchema } from "./schema";

export type CategoryId =
  | "checksum-crc"
  | "protocol-decoders"
  | "data-converters"
  | "plc-industrial"
  | "sensor-signal"
  | "embedded-mcu"
  | "avionics-databus"
  | "file-tools";

export interface ToolDef {
  /** MCP tool name: `<category prefix>.<verb_or_noun>`, e.g. `crc.modbus16`. */
  name: string;
  /** The site page this mirrors (`/tools/<slug>/`). */
  slug: string;
  category: CategoryId;
  title: string;
  /** English, one or two sentences, including an input example. */
  description: string;
  inputSchema: ObjectSchema;
  run: (input: Record<string, unknown>) => unknown;
  /** At least five inputs; the regression suite runs every one. */
  examples: Record<string, unknown>[];
}

/** Thrown for an input that passed the schema but is still unusable (bad hex, out-of-range address…). */
export class ToolInputError extends Error {}

// ---------------------------------------------------------------------------
// Shared input pieces
// ---------------------------------------------------------------------------

export const dataProp: JsonSchema = {
  type: "string",
  description: "Bytes to process. Hex by default (\"01 03 00 00 00 0A\", \"0x01,0x03\" and \"0103\" all work), or text when encoding is \"ascii\".",
  maxLength: 200000,
};
export const encodingProp: JsonSchema = {
  type: "string",
  enum: ["hex", "ascii"],
  default: "hex",
  description: "How to read `data`: hex bytes or ASCII text.",
};

/** The page's hex/ASCII input box, as a function. */
export function readData(data: unknown, encoding: unknown = "hex"): Uint8Array {
  const text = String(data ?? "");
  if (encoding === "ascii") return asciiToBytes(text);
  const r = parseHex(text);
  if (!r.ok) throw new ToolInputError(`Invalid hex character "${r.error.char}" at position ${r.error.index}`);
  return r.bytes;
}

export const hex = (n: number, digits: number) => "0x" + (n >>> 0).toString(16).toUpperCase().padStart(digits, "0");

export function str(o: Record<string, unknown>, k: string): string {
  return String(o[k] ?? "");
}
export function num(o: Record<string, unknown>, k: string): number {
  return Number(o[k]);
}
