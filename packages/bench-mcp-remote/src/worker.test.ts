import { describe, expect, it } from "vitest";
import { handle } from "./worker";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  handle(new Request("https://mcp.example/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers }, body: JSON.stringify(body) }));

describe("Streamable HTTP endpoint", () => {
  it("initialize → JSON result with the negotiated version", async () => {
    const r = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } } });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("application/json");
    expect((await r.json()).result.protocolVersion).toBe("2025-06-18");
  });
  it("a notification alone → 202 with no body", async () => {
    const r = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(r.status).toBe(202);
    expect(await r.text()).toBe("");
  });
  it("tools/call returns the tool result", async () => {
    const r = await post({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "crc.modbus16", arguments: { data: "01 03 00 00 00 0A" } } });
    expect((await r.json()).result.structuredContent.crc).toBe("0xCDC5");
  });
  it("batch in → batch out, notifications dropped", async () => {
    const r = await post([{ jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: 2, method: "ping" }]);
    expect((await r.json()).map((x: { id: number }) => x.id)).toEqual([1, 2]);
  });
  it("GET /mcp is 405 (no server-initiated stream), unknown path 404", async () => {
    expect((await handle(new Request("https://mcp.example/mcp"))).status).toBe(405);
    expect((await handle(new Request("https://mcp.example/nope"))).status).toBe(404);
  });
  it("rejects an unsupported protocol version header and bad JSON", async () => {
    expect((await post({ jsonrpc: "2.0", id: 1, method: "ping" }, { "mcp-protocol-version": "1999-01-01" })).status).toBe(400);
    const r = await handle(new Request("https://mcp.example/mcp", { method: "POST", body: "{not json" }));
    expect(r.status).toBe(400);
  });
  it("does not issue a session id (stateless)", async () => {
    const r = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } } });
    expect(r.headers.get("mcp-session-id")).toBeNull();
  });
});
