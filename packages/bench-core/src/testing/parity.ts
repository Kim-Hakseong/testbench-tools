// G2-2 regression harness: a bench-core call must give exactly what the site's
// tool component computes for the same input.
//
// `expected` is written in each *.parity.test.ts by calling the engine the way
// the page component does (its glue copied from apps/web/components/tool/),
// never by calling the bench-core tool — otherwise the test would compare a
// function with itself.

import { expect, it } from "vitest";
import { callTool } from "../registry";

export interface ParityCase {
  input: Record<string, unknown>;
  expected: unknown;
}

export function parity(name: string, cases: ParityCase[]): void {
  it(`${name}: ${cases.length} cases match the page's computation`, () => {
    expect(cases.length).toBeGreaterThanOrEqual(5);
    for (const c of cases) {
      const r = callTool(name, c.input);
      if (!r.ok) throw new Error(`${name} ${JSON.stringify(c.input)} failed: ${r.error}`);
      expect(r.result, JSON.stringify(c.input)).toEqual(JSON.parse(JSON.stringify(c.expected)));
    }
  });
}

/** Same as the page: a CRC/byte value as uppercase hex with a 0x prefix. */
export const hx = (n: number, digits: number) => "0x" + (n >>> 0).toString(16).toUpperCase().padStart(digits, "0");
