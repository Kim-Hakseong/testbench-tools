import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { NmeaGeneratorTool } from "@/components/tool/NmeaGeneratorTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/nmea-0183-generator/" },
  title: "NMEA 0183 Sentence Generator — GGA, RMC, custom, with checksum",
  description:
    "Free online NMEA 0183 sentence generator: build valid GGA and RMC sentences from decimal coordinates, or any custom body, with the checksum computed for you. 100% in your browser.",
  openGraph: {
    images: ["/og/nmea-0183-generator.png"],
    siteName: "TestBench.tools",
    title: "NMEA 0183 Sentence Generator",
    description: "Valid GGA/RMC/custom sentences with correct checksums, from decimal coordinates.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "Why is my latitude wrong when I put decimal degrees in the sentence?",
    a: "Because the NMEA coordinate field is not decimal degrees. It is degrees concatenated with decimal minutes — ddmm.mmmm for latitude, dddmm.mmmm for longitude. 37.5665° must be written 3733.9900 (0.5665° × 60 = 33.99′), not 3735.6650 or 37.5665. A receiver fed decimal degrees in that field places the fix tens of kilometres away, and nothing flags it, because the number still parses. This generator does the conversion and shows it next to the sentence.",
  },
  {
    q: "How is the NMEA checksum calculated?",
    a: "XOR every character between $ and * — exclusive of both — and print the result as two uppercase hex digits after the *. The $ and the * themselves are never included. That is the whole algorithm; it detects single-character corruption but is far weaker than a CRC, which is acceptable because a sentence also has strict framing to fail on.",
  },
  {
    q: "What is the difference between GGA and RMC?",
    a: "GGA is the fix: position, time, fix quality, satellites in use, HDOP and altitude — but no date and no speed. RMC is the recommended minimum: position, time, date, speed over ground and course — but no altitude and no satellite count. Loggers usually want both, which is why receivers interleave them.",
  },
  {
    q: "What do the talker IDs GP, GN, GL, GA and BD mean?",
    a: "The constellation the fix came from: GP is GPS, GL is GLONASS, GA is Galileo, BD (or GB) is BeiDou, and GN means the fix combined more than one system. A parser should match the sentence type and treat the talker as data — code that hard-matches only $GPGGA breaks the day a multi-constellation receiver starts sending $GNGGA, which is exactly what modern modules do.",
  },
  {
    q: "Can I generate a proprietary or unlisted sentence?",
    a: "Yes — the custom mode takes any body text, so $PMTK, $PUBX or your own $P… command gets a correct checksum appended. That is most of what a proprietary sentence needs; the field meanings are whatever the vendor defined.",
  },
  {
    q: "Why generate sentences at all?",
    a: "To test the consumer without the producer. A display, autopilot, PLC or LabVIEW VI that parses NMEA has to handle a receiver that is not on your desk: no fix (quality 0, empty fields), southern and western hemispheres, RTK quality codes, odd HDOP values. Typing those cases into a generator and replaying them over a serial port is faster than driving the hardware into each state — and some states, like RTK float, you cannot produce on demand.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. The sentence is assembled entirely in your browser.",
  },
];

const PY_SNIPPET = `# The same GGA sentence in Python
lat, lon = 37.5665, 126.9780

def nmea_coord(deg, width):
    d = int(abs(deg)); m = (abs(deg) - d) * 60
    return f"{d:0{width}d}{m:07.4f}"

body = (f"GPGGA,023000.00,{nmea_coord(lat, 2)},{'N' if lat >= 0 else 'S'},"
        f"{nmea_coord(lon, 3)},{'E' if lon >= 0 else 'W'},1,08,0.9,38.0,M,,M,,")
checksum = 0
for ch in body:
    checksum ^= ord(ch)
print(f"\${body}*{checksum:02X}")`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "NMEA 0183 Sentence Generator", description: metadata.description!, slug: "nmea-0183-generator", faqs: FAQS })} />
      <ToolShell slug="nmea-0183-generator">
        <NmeaGeneratorTool />
        <AdSlot id="nmea-0183-generator-results" />

        <AnswerBox>
          This tool builds valid NMEA 0183 sentences — GGA, RMC, or any custom
          body — with the checksum computed for you. Coordinates go in as
          ordinary decimal degrees and come out in the ddmm.mmmm field format
          receivers expect, with the conversion shown so you can see exactly
          what changed. Every sentence is round-tripped through this site&apos;s
          own decoder before it is shown.
        </AnswerBox>

        <Section title="The coordinate field is the whole difficulty">
          <p>
            Everything else in an NMEA sentence is plain text, but the position
            fields use a format nothing else uses: degrees concatenated with
            decimal <em>minutes</em>. Latitude is ddmm.mmmm, longitude is
            dddmm.mmmm, and the hemisphere travels in its own field as N/S/E/W
            rather than as a sign.
          </p>
          <DataWell>
            37.5665° N{"   "}→{"  "}3733.9900,N{"   "}(0.5665° × 60 = 33.99′)
            <br />
            126.9780° E{"  "}→{"  "}12658.6800,E
            <br />
            −33.8688°{"    "}→{"  "}3352.1280,S{"   "}(sign becomes the hemisphere)
          </DataWell>
          <p>
            The two classic mistakes are writing decimal degrees straight into
            the field, and treating the field as one decimal number when
            reading it back. Both produce values that parse cleanly and are
            wrong by up to tens of kilometres — the error is silent, which is
            why this converter shows its work.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            lat 37.5665, lon 126.9780, 02:30:00 UTC, quality 1, 8 sats →
            <br />
            $GPGGA,023000.00,3733.9900,N,12658.6800,E,1,08,0.9,38.0,M,,M,,*4B
            <br />
            <br />
            decoded back: GPGGA · 14 fields · checksum OK
          </DataWell>
        </Section>

        <AdSlot id="nmea-0183-generator-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Sentences", value: "GGA · RMC · custom body", note: "custom covers proprietary $P…" },
              { name: "Coordinates in", value: "decimal degrees", note: "encoded to ddmm.mmmm / dddmm.mmmm" },
              { name: "Checksum", value: "XOR of body, two hex digits", note: "$ and * excluded" },
              { name: "Talkers", value: "GP · GN · GL · GA · BD" },
              { name: "Verification", value: "round-trip through this site's decoder" },
            ]}
          />
        </Section>

        <Section title="Python equivalent">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["nmea-0183-decoder", "nmea-checksum", "can-frame-decoder"]} />
      </ToolShell>
    </>
  );
}
