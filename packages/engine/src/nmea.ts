// NMEA 0183 sentence checksum + parsing. Pure TS, no DOM.
//
// A sentence is "$<body>*<HH>\r\n" where the checksum HH is the XOR of every
// character in <body> (between '$' and '*', exclusive).

/** XOR checksum over the sentence body (characters between '$' and '*'). */
export function nmeaChecksum(body: string): number {
  let x = 0;
  for (let i = 0; i < body.length; i++) x ^= body.charCodeAt(i) & 0xff;
  return x & 0xff;
}

export function checksumHex(v: number): string {
  return v.toString(16).toUpperCase().padStart(2, "0");
}

/** Build a full sentence from a body (no leading '$'): "$body*HH". */
export function buildNmea(body: string): string {
  return `$${body}*${checksumHex(nmeaChecksum(body))}`;
}

export interface NmeaSentence {
  /** Talker id, e.g. "GP" — best-effort split of the address field. */
  talker: string;
  /** Sentence type, e.g. "GGA". */
  type: string;
  /** Full address field, e.g. "GPGGA" (or proprietary "PXXX…"). */
  address: string;
  /** Data fields after the address (commas split, may contain empties). */
  fields: string[];
  /** Checksum found in the sentence, or null if none was present. */
  received: number | null;
  computed: number;
  /** true/false when a checksum was present; null when absent. */
  valid: boolean | null;
}

export type NmeaParseResult =
  | { ok: true; sentence: NmeaSentence }
  | { ok: false; error: string };

export function parseNmea(input: string): NmeaParseResult {
  const s = input.trim();
  if (s.length === 0) return { ok: false, error: "Empty sentence." };
  if (!s.startsWith("$") && !s.startsWith("!")) {
    return { ok: false, error: "A sentence must start with '$' (or '!' for encapsulated)." };
  }
  const starIdx = s.lastIndexOf("*");
  let body: string;
  let received: number | null = null;
  if (starIdx > 0) {
    body = s.slice(1, starIdx);
    const csText = s.slice(starIdx + 1).trim();
    if (!/^[0-9a-fA-F]{2}$/.test(csText)) {
      return { ok: false, error: `Checksum after '*' must be two hex digits (got “${csText}”).` };
    }
    received = parseInt(csText, 16);
  } else {
    body = s.slice(1);
  }
  const parts = body.split(",");
  const address = parts[0] ?? "";
  if (address.length === 0) return { ok: false, error: "Missing address field." };
  const proprietary = address.startsWith("P");
  const talker = proprietary ? "P" : address.slice(0, 2);
  const type = proprietary ? address.slice(1) : address.slice(2);
  const computed = nmeaChecksum(body);
  return {
    ok: true,
    sentence: {
      talker,
      type,
      address,
      fields: parts.slice(1),
      received,
      computed,
      valid: received === null ? null : received === computed,
    },
  };
}

// ---------------------------------------------------------------------------
// Field labels for the most common sentence types (NMEA 0183 standard layout).
// Unknown types fall back to generic numbered fields.
// ---------------------------------------------------------------------------
export const NMEA_FIELD_LABELS: Record<string, string[]> = {
  GGA: [
    "UTC time",
    "Latitude",
    "N/S",
    "Longitude",
    "E/W",
    "Fix quality (0=invalid, 1=GPS, 2=DGPS)",
    "Satellites in use",
    "HDOP",
    "Altitude",
    "Altitude unit",
    "Geoid separation",
    "Separation unit",
    "DGPS age",
    "DGPS station id",
  ],
  RMC: [
    "UTC time",
    "Status (A=valid, V=void)",
    "Latitude",
    "N/S",
    "Longitude",
    "E/W",
    "Speed over ground (knots)",
    "Course over ground (°)",
    "Date (ddmmyy)",
    "Magnetic variation",
    "Variation E/W",
    "Mode indicator",
  ],
  GLL: [
    "Latitude",
    "N/S",
    "Longitude",
    "E/W",
    "UTC time",
    "Status (A=valid, V=void)",
    "Mode indicator",
  ],
  VTG: [
    "Course (true, °)",
    "T",
    "Course (magnetic, °)",
    "M",
    "Speed (knots)",
    "N",
    "Speed (km/h)",
    "K",
    "Mode indicator",
  ],
  GSA: [
    "Mode (M=manual, A=auto)",
    "Fix type (1=none, 2=2D, 3=3D)",
    "SV 1", "SV 2", "SV 3", "SV 4", "SV 5", "SV 6",
    "SV 7", "SV 8", "SV 9", "SV 10", "SV 11", "SV 12",
    "PDOP",
    "HDOP",
    "VDOP",
  ],
};
