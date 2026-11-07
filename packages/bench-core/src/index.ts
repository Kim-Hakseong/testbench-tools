// @testbench/bench-core — every TestBench.tools calculation behind one import.
//
// Two layers in one package:
//   - the engine (re-exported): the pure functions the web pages have always
//     called, now imported by the pages through this package;
//   - the tool registry: each site tool as name + description + JSON Schema +
//     run(), which is what the MCP servers expose.
// No DOM, no network, no dependencies beyond the engine.

export * from "@testbench/engine";
export { TOOLS, findTool, callTool, type CallResult } from "./registry";
export { ToolInputError, type ToolDef, type CategoryId } from "./define";
export { validate, withDefaults, type JsonSchema, type ObjectSchema } from "./schema";
export { handleMcpMessage, listToolsPayload, SERVER_INFO, SUPPORTED_PROTOCOL_VERSIONS, type JsonRpcRequest, type JsonRpcResponse } from "./mcp";
