// The MCP protocol, transport-free: one JSON-RPC message in, one response out.
//
// Both servers (stdio in bench-mcp-local, Streamable HTTP in
// bench-mcp-remote) are thin pipes around this function, so the two can never
// disagree about what a tool returns. Written against the published MCP
// specification rather than an SDK, to keep the packages dependency-free; it
// implements the server side of initialize, ping, tools/list and tools/call,
// which is everything a tools-only server needs.
//
// Stateless by construction: nothing here keeps a session, a log or a copy of
// any input. A call is computed and forgotten.

import { TOOLS, callTool } from "./registry";

export const SERVER_INFO = { name: "testbench-tools", title: "TestBench.tools", version: "0.1.0" };

/** Newest first. A client asking for one of these gets it back; anything else gets the newest. */
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string } };

const INSTRUCTIONS =
  "Engineering calculators from TestBench.tools: CRCs and checksums, protocol frame decoding (Modbus, NMEA, CAN, MC protocol, custom binary frames), " +
  "number and float conversions, PLC address conversion (Siemens S7, Mitsubishi, Allen-Bradley, LS XGT), sensor maths (RTD, thermocouple, NTC), " +
  "MIL-STD-1553 and ARINC 429 words, and embedded timing. Every tool is a pure calculation: inputs are not stored or logged.";

export function listToolsPayload() {
  return {
    tools: TOOLS.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    })),
  };
}

/** Handle one message. Returns null for notifications (no response is sent). */
export function handleMcpMessage(msg: unknown): JsonRpcResponse | null {
  if (typeof msg !== "object" || msg === null || (msg as JsonRpcRequest).jsonrpc !== "2.0" || typeof (msg as JsonRpcRequest).method !== "string") {
    return { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } };
  }
  const req = msg as JsonRpcRequest;
  const isNotification = req.id === undefined;
  if (isNotification) return null;
  const id = req.id ?? null;
  const ok = (result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });

  switch (req.method) {
    case "initialize": {
      const asked = String(req.params?.protocolVersion ?? "");
      return ok({
        protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(asked) ? asked : SUPPORTED_PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok(listToolsPayload());
    case "tools/call": {
      const name = String(req.params?.name ?? "");
      const r = callTool(name, req.params?.arguments ?? {});
      if (!r.ok && r.error.startsWith("Unknown tool")) {
        return { jsonrpc: "2.0", id, error: { code: -32602, message: r.error } };
      }
      return ok(
        r.ok
          ? {
              content: [{ type: "text", text: JSON.stringify(r.result, null, 2) }],
              structuredContent: typeof r.result === "object" && r.result !== null && !Array.isArray(r.result) ? r.result : { result: r.result },
              isError: false,
            }
          : { content: [{ type: "text", text: r.error }], isError: true },
      );
    }
    default:
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${req.method}` } };
  }
}
