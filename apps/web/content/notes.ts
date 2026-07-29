/**
 * Field notes — long-form write-ups that a tool page cannot carry.
 *
 * A tool page answers "convert this for me". These answer "why did the obvious
 * reading of the manual give me the wrong number", which is the question that
 * actually gets typed into a search box, and the one nobody else has written up.
 *
 * English only, like the tools' explanatory content: every claim here is tied to
 * a specific document, and a translation that drifts from the source it cites is
 * worse than no translation.
 */
export interface NoteMeta {
  slug: string;
  title: string;
  /** One line, used on the index, in metadata and on the social card. */
  description: string;
  /** ISO date. Shown, and used for Article JSON-LD. */
  published: string;
  /** Where the claims come from — shown on the index so the sourcing is visible. */
  source: string;
  /** Tool slugs this note leads to. */
  tools: string[];
}

export const NOTES: NoteMeta[] = [
  {
    slug: "1756-if8-integer-counts",
    title: "In integer mode, 32767 on a 1756-IF8 is not 20 mA",
    description:
      "The ControlLogix analog input's integer counts sit on the extended signal endpoints, so the obvious 0–20 mA to 0–32767 scaling is wrong at both ends.",
    published: "2026-07-29",
    source: "Rockwell Automation publication 1756-UM009G-EN-P, March 2025",
    tools: ["plc-analog-scaling", "ab-slc-address-converter"],
  },
];

export function noteBySlug(slug: string): NoteMeta | undefined {
  return NOTES.find((n) => n.slug === slug);
}

/** Newest first — the order the index renders. */
export function notesByDate(): NoteMeta[] {
  return [...NOTES].sort((a, b) => b.published.localeCompare(a.published));
}
