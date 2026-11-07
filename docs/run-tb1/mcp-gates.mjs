// RUN-TB1 G3-1 / G3-2 check — a tiny MCP client (Inspector-equivalent) that
// talks to both servers over their real transports:
//   stdio: spawns packages/bench-mcp-local/bin/testbench-mcp.cjs
//   http:  POSTs to a running remote Worker (wrangler dev, or the deployed URL)
// G3-1: tools/list must expose every bench-core tool.
// G3-2: 20 tools picked at random (seeded, reproducible) are called on both
//       transports; each result must equal bench-core's in-process answer,
//       which G2-2 ties to the web page's own computation.
//
//   node docs/run-tb1/mcp-gates.mjs http://127.0.0.1:8787/mcp [seed]

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

const ROOT = resolve(import.meta.dirname, "../..");
const require = createRequire(import.meta.url);
const core = require(resolve(ROOT, "packages/bench-mcp-local/dist/bench-core/src/index.js"));
const httpUrl = process.argv[2];
let seed = Number(process.argv[3] ?? 20261107);
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const INIT = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "run-tb1-gates", version: "1" } } };

function stdioSession(messages) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [resolve(ROOT, "packages/bench-mcp-local/bin/testbench-mcp.cjs")], { stdio: ["pipe", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("error", fail);
    child.on("close", () => done(out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))));
    for (const m of messages) child.stdin.write(JSON.stringify(m) + "\n");
    child.stdin.end();
  });
}

async function httpSession(messages) {
  const replies = [];
  for (const m of messages) {
    const r = await fetch(httpUrl, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" }, body: JSON.stringify(m) });
    if (r.status === 202) continue;
    replies.push(await r.json());
  }
  return replies;
}

const pick = [];
const pool = [...core.TOOLS];
while (pick.length < 20) pick.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
const calls = pick.map((t, i) => {
  const args = t.examples[Math.floor(rand() * t.examples.length)];
  return { tool: t.name, args, msg: { jsonrpc: "2.0", id: 100 + i, method: "tools/call", params: { name: t.name, arguments: args } } };
});
const script = [INIT, { jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: 2, method: "tools/list" }, ...calls.map((c) => c.msg)];

const report = { when: new Date().toISOString(), seed: Number(process.argv[3] ?? 20261107), benchCoreTools: core.TOOLS.length, transports: {} };
for (const [name, run] of [["stdio", stdioSession], ...(httpUrl ? [["http", httpSession]] : [])]) {
  const replies = await run(script);
  const byId = new Map(replies.map((r) => [r.id, r]));
  const list = byId.get(2)?.result?.tools ?? [];
  const listed = new Set(list.map((t) => t.name));
  const missing = core.TOOLS.map((t) => t.name).filter((n) => !listed.has(n));
  const results = calls.map((c) => {
    const reply = byId.get(c.msg.id)?.result;
    const local = core.callTool(c.tool, c.args);
    const got = reply && !reply.isError ? JSON.parse(reply.content[0].text) : null;
    return { tool: c.tool, args: c.args, match: local.ok && isDeepStrictEqual(got, local.result) };
  });
  report.transports[name] = {
    protocolVersion: byId.get(1)?.result?.protocolVersion,
    toolsListed: list.length,
    missingFromList: missing,
    G3_1: missing.length === 0 && list.length === core.TOOLS.length ? "PASS" : "FAIL",
    calls: results,
    matched: results.filter((r) => r.match).length,
    G3_2: results.every((r) => r.match) ? "PASS" : "FAIL",
  };
}
console.log(JSON.stringify(report, null, 2));
