// CSV numeric parsing + hex dump formatting for the file tools. Pure TS.

// ---------------------------------------------------------------------------
// CSV → numeric columns
// ---------------------------------------------------------------------------
export interface CsvNumeric {
  headers: string[];
  columns: number[][];
  rowCount: number;
  delimiter: string;
  skippedRows: number;
}

export type CsvParseResult = { ok: true; csv: CsvNumeric } | { ok: false; error: string };

function detectDelimiter(line: string): string {
  const counts: [string, number][] = [",", ";", "\t"].map((d) => [d, line.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ",";
}

export function parseCsvNumeric(text: string, maxRows = 200_000): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { ok: false, error: "Empty input." };
  const delimiter = detectDelimiter(lines[0]!);
  const firstCells = lines[0]!.split(delimiter).map((c) => c.trim());
  const firstIsHeader = firstCells.some((c) => c !== "" && Number.isNaN(Number(c)));
  const headers = firstIsHeader ? firstCells : firstCells.map((_, i) => `col ${i + 1}`);
  const columns: number[][] = headers.map(() => []);
  let skippedRows = 0;
  const start = firstIsHeader ? 1 : 0;
  for (let i = start; i < Math.min(lines.length, start + maxRows); i++) {
    const cells = lines[i]!.split(delimiter);
    let anyNumber = false;
    const parsed = headers.map((_, c) => {
      const v = Number((cells[c] ?? "").trim());
      if (!Number.isNaN(v) && (cells[c] ?? "").trim() !== "") anyNumber = true;
      return v;
    });
    if (!anyNumber) {
      skippedRows++;
      continue;
    }
    parsed.forEach((v, c) => columns[c]!.push(Number.isNaN(v) ? NaN : v));
  }
  const rowCount = columns[0]?.length ?? 0;
  if (rowCount === 0) return { ok: false, error: "No numeric rows found." };
  return { ok: true, csv: { headers, columns, rowCount, delimiter, skippedRows } };
}

// ---------------------------------------------------------------------------
// Hex dump: offset · 16 hex bytes · ASCII column
// ---------------------------------------------------------------------------
export function hexDumpLines(bytes: Uint8Array, baseOffset = 0, width = 16): string[] {
  const lines: string[] = [];
  for (let off = 0; off < bytes.length; off += width) {
    const chunk = bytes.subarray(off, off + width);
    const hex = Array.from(chunk)
      .map((b, i) => b.toString(16).toUpperCase().padStart(2, "0") + (i === 7 ? " " : ""))
      .join(" ")
      .padEnd(width * 3 + 1, " ");
    const ascii = Array.from(chunk)
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`${(baseOffset + off).toString(16).toUpperCase().padStart(8, "0")}  ${hex} |${ascii}|`);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// CAN 2.0 frame field breakdown
// ---------------------------------------------------------------------------
export interface CanFrameAnalysis {
  id: number;
  idHex: string;
  idBinary: string;
  extended: boolean;
  rtr: boolean;
  dlc: number;
  data: Uint8Array;
  errors: string[];
}

export function analyzeCanFrame(
  idValue: number,
  extended: boolean,
  rtr: boolean,
  data: Uint8Array,
): CanFrameAnalysis {
  const errors: string[] = [];
  const maxId = extended ? 0x1fffffff : 0x7ff;
  if (!Number.isInteger(idValue) || idValue < 0) errors.push("Identifier must be a non-negative integer.");
  else if (idValue > maxId)
    errors.push(`Identifier exceeds ${extended ? "29" : "11"}-bit range (max 0x${maxId.toString(16).toUpperCase()}).`);
  if (data.length > 8) errors.push("CAN 2.0 data field is limited to 8 bytes.");
  if (rtr && data.length > 0) errors.push("RTR (remote) frames carry no data bytes.");
  const bits = extended ? 29 : 11;
  return {
    id: idValue,
    idHex: "0x" + idValue.toString(16).toUpperCase().padStart(Math.ceil(bits / 4), "0"),
    idBinary: (idValue >>> 0).toString(2).padStart(bits, "0"),
    extended,
    rtr,
    dlc: rtr ? data.length : data.length,
    data,
    errors,
  };
}
