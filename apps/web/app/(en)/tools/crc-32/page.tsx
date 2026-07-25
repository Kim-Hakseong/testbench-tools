import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { CrcTool } from "@/components/tool/CrcTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "CRC-32 Calculator — online, instant",
  description:
    "Free online CRC-32 (ISO-HDLC) calculator for hex bytes or ASCII text. Instant results with byte-order views. Runs 100% in your browser.",
  openGraph: { title: "CRC-32 Calculator — online, instant", description: "Free online CRC-32 (ISO-HDLC) calculator for hex bytes or ASCII text. Instant results with byte-order views. Runs 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which CRC-32 does this calculate?",
    a: "The ubiquitous ISO-HDLC variant: polynomial 0x04C11DB7, init 0xFFFFFFFF, reflected input and output, final XOR 0xFFFFFFFF. Its check value over the ASCII string 123456789 is 0xCBF43926.",
  },
  {
    q: "Why do reflected implementations use 0xEDB88320?",
    a: "0xEDB88320 is the bit-reversed form of the polynomial 0x04C11DB7. Because CRC-32 reflects both input and output, an implementation can keep the register in reflected order the whole time and shift right, which is what the snippet below does.",
  },
  {
    q: "My firmware gives a different value for the same bytes — why?",
    a: "Check the model parameters: some systems use the same polynomial with different init/xorout or without reflection (e.g. the BZIP2 variant, check value 0xFC891918). The Custom CRC tool on this site lets you match any parameter combination.",
  },
  {
    q: "How do I verify this tool?",
    a: "Type 123456789 in ASCII mode: the result must be 0xCBF43926. That check value is pinned in this site's automated test suite.",
  },
  {
    q: "Is anything uploaded?",
    a: "No — the CRC is computed locally in your browser. Your data never leaves your machine.",
  },
];

const PY_SNIPPET = `# CRC-32 (ISO-HDLC): poly 0x04C11DB7 reflected -> 0xEDB88320,
# init 0xFFFFFFFF, xorout 0xFFFFFFFF, refin/refout.
def crc32(data: bytes) -> int:
    crc = 0xFFFFFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ 0xEDB88320 if crc & 1 else crc >> 1
    return crc ^ 0xFFFFFFFF

assert hex(crc32(b"123456789")) == "0xcbf43926"
# stdlib equivalents: zlib.crc32 / binascii.crc32`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "CRC-32 Calculator",
          description: metadata.description!,
          slug: "crc-32",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="crc-32">
        <CrcTool presetNames={["CRC-32"]} />
        <AdSlot id="crc-32-results" />

        <AnswerBox>
          This tool computes the standard 32-bit CRC (the ISO-HDLC model) over
          hex bytes or ASCII text, entirely in your browser. The reference check
          value: ASCII <code>123456789</code> → <code>0xCBF43926</code>. Both
          little- and big-endian byte views are shown so you can match whatever
          layout your protocol or file format expects.
        </AnswerBox>

        <Section title="How it works">
          <p>
            CRC-32 divides the message, treated as one long binary polynomial, by
            the generator polynomial <code>0x04C11DB7</code> and keeps the 32-bit
            remainder. The model reflects input and output bits, starts from an
            all-ones register (<code>0xFFFFFFFF</code>) and inverts the final
            remainder (XOR <code>0xFFFFFFFF</code>). Reflection lets software
            keep the register in bit-reversed order and shift right using the
            reversed polynomial <code>0xEDB88320</code> — one XOR and shift per
            bit, eight per byte.
          </p>
          <p>
            The same model family includes CRC-32/BZIP2, which keeps the same
            polynomial, init and final XOR but does not reflect — its check value
            over <code>123456789</code> is <code>0xFC891918</code>. If your
            device reports that value, it is the unreflected variant; you can
            reproduce it with the Custom CRC tool.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            input (ASCII): 123456789
            <br />
            bytes&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 31 32 33 34 35 36 37 38 39
            <br />
            CRC-32&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span className="text-ok">0xCBF43926</span>
            <br />
            LE bytes&nbsp;&nbsp;&nbsp;: 26 39 F4 CB&nbsp;&nbsp;·&nbsp;&nbsp;BE bytes: CB F4 39 26
          </DataWell>
        </Section>

        <AdSlot id="crc-32-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Width", value: "32" },
              { name: "Polynomial", value: "0x04C11DB7", note: "0xEDB88320 in reflected form" },
              { name: "Init", value: "0xFFFFFFFF" },
              { name: "RefIn / RefOut", value: "true / true" },
              { name: "XorOut", value: "0xFFFFFFFF" },
              { name: "Check (“123456789”)", value: "0xCBF43926" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["crc-16-modbus", "custom-crc", "crc-identifier"]} />
      </ToolShell>
    </>
  );
}
