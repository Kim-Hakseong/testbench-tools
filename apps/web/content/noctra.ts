// Noctra — the sister brand of offline, installable desktop instruments for
// air-gapped test benches. The web tools solve one frame or one value at a
// time; Noctra products are the same problems at full size, without a network.
//
// Brand spelling is "Noctra" everywhere (RUN-TB1). The three waitlist pages
// below describe products in preparation; their copy is only the one-line
// definitions given in RUN-TB1 — no feature list is claimed beyond that.

export interface NoctraWaitlist {
  slug: "bus" | "view" | "oneshot";
  name: string;
  /** One-line definition. */
  line: string;
  /** What it is the larger version of, on this site. */
  fromHere: string;
  /** Screenshot under /public, once a real one exists. Empty = no image is rendered (CLAUDE.md §5.4: no placeholders). */
  screenshot: string;
}

export const NOCTRA_WAITLIST: NoctraWaitlist[] = [
  {
    slug: "bus",
    name: "Noctra Bus",
    line: "Watch hundreds of messages on a live MIL-STD-1553 or ARINC 429 bus.",
    fromHere: "The 1553 and 429 decoders here read one word at a time.",
    screenshot: "",
  },
  {
    slug: "view",
    name: "Noctra View",
    line: "Explore multi-gigabyte measurement files the way DIAdem does.",
    fromHere: "The TDMS, CSV and HEX tools here open one file in a browser tab.",
    screenshot: "",
  },
  {
    slug: "oneshot",
    name: "Noctra OneShot",
    line: "From the drawing to an XG5000 ladder program, generated automatically.",
    fromHere: "The LS XGT tools here convert one address or one frame.",
    screenshot: "",
  },
];

/** Shipping Noctra products, described as on their own sites (moved from the old noktra-links.ts). */
export const NOCTRA_PRODUCTS = [
  { name: "ICD Refinery", line: "Turns messy interface control documents into a validated spec, then generates the codec — fully offline." },
  { name: "Protocol Bridge", line: "Unattended channel mapping across Modbus, UDP, serial and MQTT — configure once, keep running." },
  { name: "Telemetry Scope", line: "Live strip charts from one channel-definition file, with recording and timed replay." },
  { name: "Ch10 Viewer", line: "Opens IRIG 106 Chapter 10 flight-test recordings on a disconnected bench — no server, no conversion." },
];

export const NOCTRA_TRAITS = ["Air-gapped", "Installed", "Offline"];

export const CONTACT_EMAIL = "contact@testbench.tools";

/** Waitlist = an email to the existing contact address, product name in the subject. No new service. */
export function waitlistHref(name: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${name} — waitlist`)}`;
}
