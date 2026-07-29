import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { NmeaChecksumTool } from "@/components/tool/NmeaChecksumTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/nmea-checksum/" },
  title: "NMEA Checksum Calculator — validate & generate 0183 sentences",
  description:
    "Free online NMEA 0183 checksum tool: paste a sentence to validate its checksum, or type a body to generate the complete $…*HH sentence. 100% in your browser.",
  openGraph: {
    images: ["/og/nmea-checksum.png"], siteName: "TestBench.tools", title: "NMEA Checksum Calculator — validate & generate 0183 sentences", description: "Validate an NMEA 0183 sentence's checksum or generate the complete $…*HH sentence.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which characters does the NMEA checksum cover?",
    a: "Everything between the leading '$' and the '*' — exclusive of both. The two hex digits after '*' are the XOR of those characters. The '$', the '*', the checksum itself and the trailing CR/LF are never included, which is the most common mistake in hand-rolled implementations.",
  },
  {
    q: "Is the checksum mandatory?",
    a: "The NMEA 0183 standard makes it mandatory for some sentence types and optional for others, but virtually every modern GNSS receiver emits it and most parsers require it. This tool treats a missing checksum as 'not validated' and shows you the value to append.",
  },
  {
    q: "How strong is an XOR checksum?",
    a: "Weak by design: it catches any single-bit error and any odd number of bit errors per position, but two identical errors cancel and reordered characters can pass. It is a sanity check for a short ASCII line over a serial port, not a CRC — adequate for its job, nothing more.",
  },
  {
    q: "How do I verify this tool?",
    a: "The canonical example sentence $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47 must validate as correct — 0x47 is its published checksum, and this value is pinned in the site's automated test suite.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Validation and generation run locally in your browser.",
  },
];

const PY_SNIPPET = `# NMEA 0183 checksum: XOR of characters between '$' and '*'
from functools import reduce

def nmea_checksum(body: str) -> int:
    return reduce(lambda x, c: x ^ ord(c), body, 0)

body = "GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,"
assert f"{nmea_checksum(body):02X}" == "47"
print(f"$" + body + f"*{nmea_checksum(body):02X}")`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "NMEA Checksum Calculator", description: metadata.description!, slug: "nmea-checksum", faqs: FAQS })} />
      <ToolShell slug="nmea-checksum">
        <NmeaChecksumTool />
        <AdSlot id="nmea-checksum-results" />

        <AnswerBox>
          This tool validates and generates NMEA 0183 checksums. Paste a full
          sentence with <code>*HH</code> and it verdicts PASS/FAIL with the
          expected value; paste a body without one and it hands you the
          complete sentence ready to transmit. The checksum is simply the XOR
          of every character between <code>$</code> and <code>*</code>.
        </AnswerBox>

        <Section title="How it works">
          <p>
            An NMEA 0183 sentence is a printable ASCII line:{" "}
            <code>$&lt;address&gt;,&lt;fields…&gt;*HH</code>. The two hex
            digits HH are the bitwise XOR of every character after the{" "}
            <code>$</code> and before the <code>*</code> — the address field,
            all commas and all data characters. XOR is order-insensitive per
            bit position and costs one instruction per byte, which suited the
            4800-baud instrument links the standard was written for. When
            validation fails, the mismatch is almost always either a truncated
            sentence (dropped serial bytes) or a checksum computed over the
            wrong span.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*
            <span className="text-ok">47</span>
            <br />
            XOR(&quot;GPGGA,123519,…,M,,&quot;) = 0x47 → <span className="text-ok">VALID</span>
            <br />
            <br />
            body “GPGLL,4916.45,N,12311.12,W,225444,A” → checksum 0x31
          </DataWell>
        </Section>

        <AdSlot id="nmea-checksum-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Algorithm", value: "XOR of bytes", note: "8-bit" },
              { name: "Span", value: "between $ and *", note: "both exclusive" },
              { name: "Output", value: "two uppercase hex digits" },
              { name: "Line ending", value: "CR LF", note: "not part of the checksum" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["nmea-0183-decoder", "crc-8", "hex-to-ascii"]} />
      </ToolShell>
    </>
  );
}
