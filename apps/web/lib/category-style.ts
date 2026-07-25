import type { CategoryId } from "@/content/tools-meta";

/* Per-category color language. All values are CSS custom properties so each
   theme resolves its own intensity (dark = bright accents + glows,
   light = AA-dark accents, no glows). */

/** Strong glow — tool page hero (one per page). */
export const CATEGORY_GLOW: Record<CategoryId, string> = {
  "checksum-crc": "var(--tb-glow-green)",
  "protocol-decoders": "var(--tb-glow-blue)",
  "data-converters": "var(--tb-glow-slate)",
  "plc-industrial": "var(--tb-glow-orange)",
  "sensor-signal": "var(--tb-glow-yellow)",
  "embedded-mcu": "var(--tb-glow-red)",
  "file-tools": "var(--tb-glow-blue)",
};

/** Soft wash — hub category sections (several per page). */
export const CATEGORY_WASH: Record<CategoryId, string> = {
  "checksum-crc": "var(--tb-wash-green)",
  "protocol-decoders": "var(--tb-wash-blue)",
  "data-converters": "var(--tb-wash-slate)",
  "plc-industrial": "var(--tb-wash-orange)",
  "sensor-signal": "var(--tb-wash-yellow)",
  "embedded-mcu": "var(--tb-wash-red)",
  "file-tools": "var(--tb-wash-blue)",
};

/** Accent ink — category icons and counts. */
export const CATEGORY_ACCENT: Record<CategoryId, string> = {
  "checksum-crc": "var(--tb-accent-green)",
  "protocol-decoders": "var(--tb-accent-blue)",
  "data-converters": "var(--tb-accent-slate)",
  "plc-industrial": "var(--tb-accent-orange)",
  "sensor-signal": "var(--tb-accent-yellow)",
  "embedded-mcu": "var(--tb-accent-red)",
  "file-tools": "var(--tb-accent-blue)",
};
