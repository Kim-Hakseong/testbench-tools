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
  {
    slug: "xbf-ad04a-16000-or-4000",
    title: "The XBF-AD04A manual prints two different full-scale values",
    description:
      "A footnote says the unsigned digital output reaches 16000. The specification table on the same page says 4000. Three things in the manual settle which one is right.",
    published: "2026-07-29",
    source: "LS ELECTRIC XGB Analog Module User Manual V2.4, June 2024",
    tools: ["plc-analog-scaling", "ls-xgt-address-converter"],
  },
  {
    slug: "arinc-429-label-bit-order",
    title: "The same ARINC 429 word is label 205 and label 241",
    description:
      "Published sources number the label bits in opposite directions, so one word decodes to two different labels. Neither convention is a mistake, and no amount of reading resolves it.",
    published: "2026-07-29",
    source: "AIM, GE/Ballard, Holt, MaxT and Wikipedia — compared",
    tools: ["arinc-429-decoder", "arinc-429-builder"],
  },
  {
    slug: "ntc-beta-only-right-twice",
    title: "Your NTC's B value is exact at two temperatures and nowhere else",
    description:
      "B25/85 is a line drawn through two points on a curve. Measured against a published R/T table, a Beta-only conversion reads 3 °C high at −40 °C and 2.8 °C high at 150 °C — and exactly right at 25 and 85.",
    published: "2026-07-30",
    source: "Vishay BCcomponents NTCLE100E3 datasheet, document 29049, revision 07-May-2025",
    tools: ["ntc-thermistor-calculator", "pt100-calculator"],
  },
  {
    slug: "type-b-thermocouple-no-inverse",
    title: "A type B thermocouple barely cares what your cold junction is doing",
    description:
      "Its curve doubles back near room temperature, so below 250 °C no inverse exists at all — and the same property makes a 40 °C swing in the cold junction move a 1018 °C reading by 0.05 °C.",
    published: "2026-07-30",
    source: "NIST ITS-90 reference functions (SRD 60), cross-checked against Monograph 175",
    tools: ["thermocouple-calculator"],
  },
];

export function noteBySlug(slug: string): NoteMeta | undefined {
  return NOTES.find((n) => n.slug === slug);
}

/** Newest first — the order the index renders. */
export function notesByDate(): NoteMeta[] {
  return [...NOTES].sort((a, b) => b.published.localeCompare(a.published));
}
