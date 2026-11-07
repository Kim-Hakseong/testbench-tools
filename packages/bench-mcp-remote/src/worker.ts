// Remote MCP server: Streamable HTTP transport on Cloudflare Workers.
//
// One endpoint, /mcp. A POST carries one JSON-RPC message (or a batch) and is
// answered with plain application/json — the transport allows that in place of
// an SSE stream, and a server with no long-running tools has nothing to stream.
// GET /mcp would open a server-initiated stream; this server never sends
// unprompted messages, so it answers 405 as the transport specifies.
//
// Stateless: no Mcp-Session-Id is issued, nothing is stored, nothing is logged.
// The Worker has no bindings at all — no KV, no D1, no Analytics Engine — so
// there is nowhere an input could be kept even by mistake.

import { SUPPORTED_PROTOCOL_VERSIONS, handleMcpMessage } from "@testbench/bench-core";

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id, authorization",
  "access-control-expose-headers": "mcp-protocol-version",
};

const MAX_BODY = 4 * 1024 * 1024;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
  });
}

export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (url.pathname === "/" && request.method === "GET") {
    return new Response(
      "TestBench.tools MCP server — Streamable HTTP at /mcp. Stateless: inputs are computed and discarded, never stored.\nhttps://testbench.tools/mcp/\n",
      { headers: { "content-type": "text/plain; charset=utf-8", ...CORS } },
    );
  }

  if (url.pathname !== "/mcp") return json({ error: "Not found" }, 404);
  if (request.method === "GET" || request.method === "DELETE") {
    return new Response(null, { status: 405, headers: { allow: "POST, OPTIONS", ...CORS } });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const version = request.headers.get("mcp-protocol-version");
  if (version && !SUPPORTED_PROTOCOL_VERSIONS.includes(version)) {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: `Unsupported MCP-Protocol-Version: ${version}` } }, 400);
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, 413);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, 413);

  let msg: unknown;
  try {
    msg = JSON.parse(text);
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  const responses = (Array.isArray(msg) ? msg : [msg]).map(handleMcpMessage).filter((r) => r !== null);
  // Only notifications or responses: accepted, nothing to say.
  if (responses.length === 0) return new Response(null, { status: 202, headers: CORS });
  return json(Array.isArray(msg) ? responses : responses[0]);
}

export default { fetch: handle };
