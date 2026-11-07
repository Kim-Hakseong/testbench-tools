import { beforeAll, describe, expect, it } from "vitest";
import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";

const PKG = resolve(import.meta.dirname, "..");
const BIN = resolve(PKG, "bin/testbench-mcp.cjs");

/** Run the real compiled server: write messages to stdin, collect stdout lines. */
function session(messages: unknown[]): Promise<any[]> {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [BIN], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("error", fail);
    child.on("close", () => done(out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))));
    for (const m of messages) child.stdin.write((typeof m === "string" ? m : JSON.stringify(m)) + "\n");
    child.stdin.end();
  });
}

const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } } };

describe("stdio server (compiled dist, as npx runs it)", () => {
  beforeAll(() => {
    execFileSync(process.execPath, [resolve(PKG, "scripts/build.mjs")], { stdio: "ignore" });
  }, 120_000);

  it("initialize, initialized notification (no reply), tools/list, tools/call", async () => {
    const replies = await session([
      init,
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "crc.modbus16", arguments: { data: "01 03 00 00 00 0A" } } },
    ]);
    expect(replies.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(replies[0].result.serverInfo.name).toBe("testbench-tools");
    expect(replies[1].result.tools.length).toBeGreaterThanOrEqual(56);
    expect(replies[2].result.structuredContent.crc).toBe("0xCDC5");
  });

  it("stdout carries protocol only: bad JSON gets a parse error, unknown tool a JSON-RPC error, bad args an isError result", async () => {
    const replies = await session([
      "{oops",
      { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "no.such_tool", arguments: {} } },
      { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "crc.crc32", arguments: { data: "zz" } } },
    ]);
    expect(replies[0].error.code).toBe(-32700);
    expect(replies[1].error.code).toBe(-32602);
    expect(replies[2].result.isError).toBe(true);
  });
});
