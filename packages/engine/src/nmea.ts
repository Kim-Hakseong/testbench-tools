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

// ---------------------------------------------------------------------------
// Sentence generation
// ---------------------------------------------------------------------------

/**
 * NMEA's coordinate encoding is the classic trap in this format: it is NOT
 * decimal degrees. Latitude is ddmm.mmmm and longitude dddmm.mmmm — degrees
 * concatenated with decimal MINUTES. 37.5665° becomes 3733.9900, because
 * 0.5665° × 60 = 33.99′. Reading that field as a plain number puts a fix in
 * the wrong city; that mistake is why this helper exists as tested code
 * rather than a format string in the UI.
 */
export interface NmeaCoordinate {
  /** The numeric field exactly as it appears in the sentence. */
  field: string;
  /** Hemisphere letter: N/S for latitude, E/W for longitude. */
  hemisphere: string;
}

export type NmeaCoordinateResult =
  | { ok: true; value: NmeaCoordinate }
  | { ok: false; error: string };

/** Encode decimal degrees as an NMEA latitude field (ddmm.mmmm + N/S). */
export function nmeaLatitude(decimalDegrees: number): NmeaCoordinateResult {
  return encodeCoordinate(decimalDegrees, 90, 2, ["N", "S"]);
}

/** Encode decimal degrees as an NMEA longitude field (dddmm.mmmm + E/W). */
export function nmeaLongitude(decimalDegrees: number): NmeaCoordinateResult {
  return encodeCoordinate(decimalDegrees, 180, 3, ["E", "W"]);
}

function encodeCoordinate(
  decimalDegrees: number,
  limit: number,
  degreeDigits: number,
  hemispheres: [string, string],
): NmeaCoordinateResult {
  if (!Number.isFinite(decimalDegrees)) {
    return { ok: false, error: "Enter the coordinate in decimal degrees" };
  }
  if (Math.abs(decimalDegrees) > limit) {
    return { ok: false, error: `Must be within ±${limit}°` };
  }

  const hemisphere = decimalDegrees < 0 ? hemispheres[1] : hemispheres[0];
  const abs = Math.abs(decimalDegrees);
  let degrees = Math.floor(abs);
  // Minutes to 4 decimals, carrying 60.0000′ over into the next degree so
  // 36.9999999° never prints the illegal "3660.0000".
  let minutes = Math.round((abs - degrees) * 60 * 10000) / 10000;
  if (minutes >= 60) {
    minutes -= 60;
    degrees += 1;
  }

  const mm = minutes.toFixed(4).padStart(7, "0");
  return {
    ok: true,
    value: { field: `${String(degrees).padStart(degreeDigits, "0")}${mm}`, hemisphere },
  };
}

/** Decode an NMEA coordinate field back to decimal degrees. */
export function nmeaCoordinateToDegrees(field: string, hemisphere: string): number | null {
  const m = /^(\d{2,3})(\d{2}\.\d+)$/.exec(field.trim());
  if (!m) return null;
  const degrees = Number(m[1]) + Number(m[2]) / 60;
  return /^[SW]$/i.test(hemisphere.trim()) ? -degrees : degrees;
}

/** hhmmss.ss UTC field from hours/minutes/seconds. */
export function nmeaTime(hours: number, minutes: number, seconds: number): string | null {
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return null;
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;
  if (!Number.isFinite(seconds) || seconds < 0 || seconds >= 60) return null;
  const ss = seconds.toFixed(2).padStart(5, "0");
  return `${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}${ss}`;
}

/** ddmmyy date field. The two-digit year is the format's own limitation. */
export function nmeaDate(day: number, month: number, year: number): string | null {
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 0) return null;
  const yy = year % 100;
  return (
    String(day).padStart(2, "0") +
    String(month).padStart(2, "0") +
    String(yy).padStart(2, "0")
  );
}
