// C struct layout with natural alignment (System V-style ABI rules):
// each member aligns to min(its size, arch word); struct size rounds up to
// the largest member alignment. Pure TS, no DOM.

export type Arch = 32 | 64;

interface TypeInfo {
  size: (arch: Arch) => number;
}

const TYPES: Record<string, TypeInfo> = {
  char: { size: () => 1 },
  "signed char": { size: () => 1 },
  "unsigned char": { size: () => 1 },
  bool: { size: () => 1 },
  _Bool: { size: () => 1 },
  int8_t: { size: () => 1 },
  uint8_t: { size: () => 1 },
  short: { size: () => 2 },
  "unsigned short": { size: () => 2 },
  int16_t: { size: () => 2 },
  uint16_t: { size: () => 2 },
  int: { size: () => 4 },
  unsigned: { size: () => 4 },
  "unsigned int": { size: () => 4 },
  int32_t: { size: () => 4 },
  uint32_t: { size: () => 4 },
  float: { size: () => 4 },
  long: { size: (a) => (a === 64 ? 8 : 4) }, // LP64 convention (MSVC keeps long at 4)
  "unsigned long": { size: (a) => (a === 64 ? 8 : 4) },
  int64_t: { size: () => 8 },
  uint64_t: { size: () => 8 },
  "long long": { size: () => 8 },
  double: { size: () => 8 },
};

export const KNOWN_TYPES = Object.keys(TYPES);

export interface StructMember {
  type: string;
  name: string;
  /** Array element count (1 for scalars). */
  count: number;
  /** True for pointer members (size = arch word). */
  pointer: boolean;
}

export interface LayoutRow extends StructMember {
  size: number;
  align: number;
  offset: number;
  padBefore: number;
}

export interface StructLayout {
  rows: LayoutRow[];
  size: number;
  align: number;
  totalPadding: number;
}

export type ParseResult = { ok: true; members: StructMember[] } | { ok: false; error: string };

/** Parse simple member declarations, one per line: "uint8_t flags;", "char name[8];", "void *p;". */
export function parseStructBody(source: string): ParseResult {
  const members: StructMember[] = [];
  const lines = source
    .replace(/\/\*.*?\*\//gs, "")
    .split(/[\n;]/)
    .map((l) => l.replace(/\/\/.*$/, "").trim())
    .filter((l) => l.length > 0 && l !== "{" && l !== "}");
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_ ]*?)\s*(\*+)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\[(\d+)\])?$/);
    if (!m) return { ok: false, error: `Cannot parse: “${line}”` };
    const type = m[1]!.trim().replace(/\s+/g, " ");
    const pointer = !!m[2];
    if (!pointer && !(type in TYPES)) {
      return { ok: false, error: `Unknown type “${type}” — supported: ${KNOWN_TYPES.join(", ")}, or pointers.` };
    }
    members.push({ type, name: m[3]!, count: m[4] ? Number(m[4]) : 1, pointer });
  }
  if (members.length === 0) return { ok: false, error: "No members found." };
  return { ok: true, members };
}

export function layoutStruct(members: StructMember[], arch: Arch): StructLayout {
  const word = arch / 8;
  let offset = 0;
  let maxAlign = 1;
  let totalPadding = 0;
  const rows: LayoutRow[] = members.map((mem) => {
    const elemSize = mem.pointer ? word : TYPES[mem.type]!.size(arch);
    const align = Math.min(elemSize, word === 4 ? 4 : 8);
    const padBefore = (align - (offset % align)) % align;
    offset += padBefore;
    totalPadding += padBefore;
    const row: LayoutRow = { ...mem, size: elemSize * mem.count, align, offset, padBefore };
    offset += elemSize * mem.count;
    maxAlign = Math.max(maxAlign, align);
    return row;
  });
  const tailPad = (maxAlign - (offset % maxAlign)) % maxAlign;
  totalPadding += tailPad;
  return { rows, size: offset + tailPad, align: maxAlign, totalPadding };
}
