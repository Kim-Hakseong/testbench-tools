import { describe, expect, it } from "vitest";
import { TOOLS, callTool } from "./registry";

describe("registry shape", () => {
  it("names are unique and follow <prefix>.<snake_case>", () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z0-9]+\.[a-z0-9_]+$/);
  });
  it("every tool has an English description of one or two sentences with an example", () => {
    for (const t of TOOLS) {
      expect(t.description, t.name).toMatch(/Example/);
      const sentences = t.description.split(/(?<=[.!?])\s+(?=[A-Z])/).length;
      expect(sentences, t.name).toBeLessThanOrEqual(2);
    }
  });
  it("every tool has at least five examples and each one runs", () => {
    for (const t of TOOLS) {
      expect(t.examples.length, t.name).toBeGreaterThanOrEqual(5);
      for (const ex of t.examples) {
        const r = callTool(t.name, ex);
        expect(r.ok, `${t.name} ${JSON.stringify(ex)} → ${r.ok ? "" : r.error}`).toBe(true);
      }
    }
  });
  it("rejects unknown parameters and wrong types instead of guessing", () => {
    expect(callTool("crc.crc32", { data: "00", bogus: 1 })).toMatchObject({ ok: false });
    expect(callTool("crc.crc32", { data: 5 })).toMatchObject({ ok: false });
    expect(callTool("crc.crc32", {})).toMatchObject({ ok: false });
    expect(callTool("nope.nope", {})).toMatchObject({ ok: false });
  });
});
