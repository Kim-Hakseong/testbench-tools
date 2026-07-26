import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { NmeaDecoderTool } from "@/components/tool/NmeaDecoderTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "NMEA 0183 Decoder — labeled fields, checksum check",
  description:
    "Free online NMEA 0183 decoder: paste a sentence and get labeled fields for GGA, RMC, GLL, VTG, GSA and generic parsing for the rest, with checksum verdict. 100% in your browser.",
  openGraph: { title: "NMEA 0183 Decoder — labeled fields, checksum check", description: "Labeled field decoding for GGA/RMC/GLL/VTG/GSA sentences with checksum verdict.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which sentence types get labeled fields?",
    a: "GGA (fix data), RMC (recommended minimum), GLL (position), VTG (course/speed) and GSA (DOP and satellites) — the types that carry most of the information engineers actually read. Anything else, including proprietary $P… sentences, decodes generically with numbered fields.",
  },
  {
    q: "How do I read the latitude field 4807.038?",
    a: "NMEA packs degrees and minutes together: ddmm.mmmm. 4807.038 means 48° 07.038′ — to get decimal degrees, 48 + 7.038/60 = 48.1173°. The hemisphere letter in the following field (N/S) sets the sign.",
  },
  {
    q: "What does fix quality 0/1/2 mean in a GGA sentence?",
    a: "0 = no valid fix, 1 = standard GNSS fix, 2 = differential (DGPS) fix. Higher values exist for RTK modes on capable receivers. Combined with the satellites-in-use and HDOP fields, this is the quick health check of a receiver.",
  },
  {
    q: "Why are some fields empty?",
    a: "NMEA leaves a field's position in place but empty when the receiver has no value — two adjacent commas. Empty DGPS age or altitude fields are normal on receivers without those features; the decoder shows them as dashes.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Decoding runs locally in your browser.",
  },
];

const PY_SNIPPET = `# Minimal NMEA field split with checksum verification
def parse_nmea(line: str):
    body, _, cs = line.strip().lstrip("$").rpartition("*")
    computed = 0
    for ch in body:
        computed ^= ord(ch)
    fields = body.split(",")
    return fields[0], fields[1:], computed == int(cs, 16)

addr, fields, ok = parse_nmea(
    "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47")
assert addr == "GPGGA" and ok and fields[0] == "123519"`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "NMEA 0183 Decoder", description: metadata.description!, slug: "nmea-0183-decoder", faqs: FAQS })} />
      <ToolShell slug="nmea-0183-decoder">
        <NmeaDecoderTool />
        <AdSlot id="nmea-0183-decoder-results" />

        <AnswerBox>
          This tool decodes an NMEA 0183 sentence into a labeled field table:
          talker and type up top, checksum verdict, then every field with its
          meaning for the common types (GGA, RMC, GLL, VTG, GSA) or numbered
          fields for anything else. Paste a line straight from your serial
          capture and see what the receiver is actually saying.
        </AnswerBox>

        <Section title="How it works">
          <p>
            NMEA 0183 sentences are printable ASCII:{" "}
            <code>$TTSSS,field1,field2,…*HH</code>, where TT is the talker (GP
            = GPS, GN = multi-constellation), SSS the sentence type, and HH an
            XOR checksum over everything between <code>$</code> and{" "}
            <code>*</code>. Field positions are fixed per sentence type, so
            decoding is a split on commas plus a lookup table of meanings —
            which is exactly what this tool applies, after verifying the
            checksum so you know the line survived the serial link intact.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
            <br />
            → GP / GGA · checksum <span className="text-ok">VALID (0x47)</span>
            <br />
            → UTC 12:35:19 · lat 48°07.038′N · lon 011°31.000′E
            <br />
            → fix quality 1 (GPS) · 8 satellites · HDOP 0.9 · alt 545.4 M
          </DataWell>
        </Section>

        <AdSlot id="nmea-0183-decoder-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Structure", value: "$address,fields*HH", note: "ASCII, CR LF terminated" },
              { name: "Talker", value: "GP · GN · GL · P (proprietary)…" },
              { name: "Labeled types", value: "GGA · RMC · GLL · VTG · GSA" },
              { name: "Checksum", value: "XOR between $ and *" },
              { name: "Coordinates", value: "ddmm.mmmm + hemisphere", note: "degrees·minutes packed" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["nmea-checksum", "modbus-frame-decoder", "can-frame-decoder"]} />
      </ToolShell>
    </>
  );
}
