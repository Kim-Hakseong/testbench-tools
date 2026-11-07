// The JSON Schema subset every tool input is written in, and a validator for it.
//
// MCP clients receive these schemas verbatim in tools/list, so they are plain
// JSON Schema (draft 2020-12 keywords only). The validator covers exactly the
// keywords used here — type, properties, required, enum, minimum, maximum,
// pattern, items, minItems, maxItems, additionalProperties: false — and nothing
// else, which keeps it small enough to read and keeps the package free of
// dependencies (CLAUDE.md §4).

export type JsonSchema =
  | { type: "string"; description?: string; enum?: string[]; pattern?: string; default?: string; maxLength?: number }
  | { type: "number" | "integer"; description?: string; minimum?: number; maximum?: number; enum?: number[]; default?: number }
  | { type: "boolean"; description?: string; default?: boolean }
  | { type: "array"; description?: string; items: JsonSchema; minItems?: number; maxItems?: number }
  | ObjectSchema;

export interface ObjectSchema {
  type: "object";
  description?: string;
  properties: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: false;
}

/** Returns a list of problems; empty means valid. Paths look like `fields[2].offset`. */
export function validate(schema: JsonSchema, value: unknown, path = "input"): string[] {
  switch (schema.type) {
    case "string": {
      if (typeof value !== "string") return [`${path} must be a string`];
      if (schema.enum && !schema.enum.includes(value)) return [`${path} must be one of: ${schema.enum.join(", ")}`];
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) return [`${path} does not match ${schema.pattern}`];
      if (schema.maxLength !== undefined && value.length > schema.maxLength) return [`${path} is longer than ${schema.maxLength} characters`];
      return [];
    }
    case "number":
    case "integer": {
      if (typeof value !== "number" || !Number.isFinite(value)) return [`${path} must be a finite number`];
      if (schema.type === "integer" && !Number.isInteger(value)) return [`${path} must be an integer`];
      if (schema.enum && !schema.enum.includes(value)) return [`${path} must be one of: ${schema.enum.join(", ")}`];
      if (schema.minimum !== undefined && value < schema.minimum) return [`${path} must be ≥ ${schema.minimum}`];
      if (schema.maximum !== undefined && value > schema.maximum) return [`${path} must be ≤ ${schema.maximum}`];
      return [];
    }
    case "boolean":
      return typeof value === "boolean" ? [] : [`${path} must be true or false`];
    case "array": {
      if (!Array.isArray(value)) return [`${path} must be an array`];
      if (schema.minItems !== undefined && value.length < schema.minItems) return [`${path} needs at least ${schema.minItems} item(s)`];
      if (schema.maxItems !== undefined && value.length > schema.maxItems) return [`${path} allows at most ${schema.maxItems} item(s)`];
      return value.flatMap((v, i) => validate(schema.items, v, `${path}[${i}]`));
    }
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) return [`${path} must be an object`];
      const o = value as Record<string, unknown>;
      const errors: string[] = [];
      for (const k of schema.required ?? []) if (o[k] === undefined) errors.push(`${path}.${k} is required`);
      for (const [k, v] of Object.entries(o)) {
        const sub = schema.properties[k];
        if (!sub) {
          if (schema.additionalProperties === false) errors.push(`${path}.${k} is not a known parameter`);
          continue;
        }
        if (v !== undefined) errors.push(...validate(sub, v, `${path}.${k}`));
      }
      return errors;
    }
  }
}

/** Fill `default`s for absent top-level properties, so tool code sees a complete input. */
export function withDefaults(schema: ObjectSchema, input: Record<string, unknown>): Record<string, unknown> {
  const out = { ...input };
  for (const [k, s] of Object.entries(schema.properties)) {
    if (out[k] === undefined && "default" in s && s.default !== undefined) out[k] = s.default;
  }
  return out;
}
