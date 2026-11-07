// The tool list and the one entry point every caller goes through.

import { ToolInputError, type ToolDef } from "./define";
import { validate, withDefaults } from "./schema";
import { AVIONICS_TOOLS } from "./tools/avionics";
import { CHECKSUM_TOOLS } from "./tools/checksum";
import { PLC_TOOLS } from "./tools/plc";
import { PROTOCOL_TOOLS } from "./tools/protocol";
import { SENSOR_TOOLS } from "./tools/sensor";

export const TOOLS: ToolDef[] = [
  ...CHECKSUM_TOOLS,
  ...PROTOCOL_TOOLS,
  ...PLC_TOOLS,
  ...SENSOR_TOOLS,
  ...AVIONICS_TOOLS,
];

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

export function findTool(name: string): ToolDef | undefined {
  return BY_NAME.get(name);
}

export type CallResult = { ok: true; result: unknown } | { ok: false; error: string };

/**
 * Validate against the tool's schema, fill defaults, run, and return plain
 * JSON. Never throws for bad input — an MCP server reports that to the model as
 * a tool error it can correct, not as a protocol failure.
 */
export function callTool(name: string, args: unknown): CallResult {
  const tool = BY_NAME.get(name);
  if (!tool) return { ok: false, error: `Unknown tool: ${name}` };
  const input = args ?? {};
  const problems = validate(tool.inputSchema, input);
  if (problems.length) return { ok: false, error: problems.join("; ") };
  try {
    const result = tool.run(withDefaults(tool.inputSchema, input as Record<string, unknown>));
    // Round-trip so callers get exactly what a JSON transport would deliver.
    return { ok: true, result: JSON.parse(JSON.stringify(result ?? null)) };
  } catch (e) {
    if (e instanceof ToolInputError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
