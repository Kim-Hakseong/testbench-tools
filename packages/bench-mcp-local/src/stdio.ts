// stdio transport: newline-delimited JSON-RPC on stdin/stdout (MCP stdio
// transport). stdout carries protocol messages only; anything human-readable
// goes to stderr.

import { handleMcpMessage } from "@testbench/bench-core";

export function runStdio(): void {
  let buffer = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line === "") continue;
      let response;
      try {
        const msg = JSON.parse(line);
        response = Array.isArray(msg)
          ? msg.map(handleMcpMessage).filter((r) => r !== null)
          : handleMcpMessage(msg);
        if (Array.isArray(response) && response.length === 0) response = null;
      } catch {
        response = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } };
      }
      if (response) process.stdout.write(JSON.stringify(response) + "\n");
    }
  });
  process.stdin.on("end", () => process.exit(0));
  process.stderr.write("testbench-tools MCP server (stdio) ready\n");
}
