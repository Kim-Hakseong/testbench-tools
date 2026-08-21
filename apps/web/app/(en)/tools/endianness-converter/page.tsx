import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { EndiannessTool } from "@/components/tool/EndiannessTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/endianness-converter/" },
  title: "Endianness Converter — byte swap 16/32/64-bit, word swap",
  description:
    "Free online endianness converter: full byte reversal, 16-bit byte swap and 32-bit word swap for any hex value. See every reordering at once. 100% in your browser.",
  openGraph: { url: "/tools/endianness-converter/",
    images: ["/og/endianness-converter.png"], siteName: "TestBench.tools", title: "Endianness Converter — byte swap 16/32/64-bit, word swap", description: "Full byte reversal, 16-bit byte swap and 32-bit word swap for any hex value.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What is endianness in one sentence?",
    a: "It is the order in which a multi-byte value's bytes are stored or transmitted: big-endian puts the most significant byte first (0x12345678 → 12 34 56 78), little-endian puts the least significant byte first (78 56 34 12).",
  },
  {
    q: "Which swap do I need — byte reversal, byte swap, or word swap?",
    a: "Full byte reversal converts between big- and little-endian of the whole value. 'Byte swap within 16-bit words' fixes data that passed through a system treating memory as 16-bit units (common with Modbus registers). 'Word swap' reorders the two 16-bit halves of a 32-bit value — the CDAB arrangement many PLCs use. This tool shows all three so you can pattern-match against what your device produces.",
  },
  {
    q: "Why do Modbus 32-bit values often need a word swap rather than a byte swap?",
    a: "Modbus transfers data as 16-bit registers, and each register travels big-endian. Vendors disagree only about the order of the two registers, so mismatches show up as swapped 16-bit halves (CDAB) rather than fully reversed bytes.",
  },
  {
    q: "How can I tell my capture is byte-swapped?",
    a: "Numbers look wildly wrong but not random — e.g. an expected small integer decodes as a huge one, and ASCII text appears with characters pairwise exchanged ('eHll o'). Run the bytes through the three transforms here and see which one produces sensible values.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All transforms run locally in your browser.",
  },
];

const C_SNIPPET = `#include <stdint.h>

uint16_t swap16(uint16_t v) { return (v >> 8) | (v << 8); }

uint32_t swap32(uint32_t v)
{
    return ((v & 0x000000FFu) << 24) | ((v & 0x0000FF00u) << 8) |
           ((v & 0x00FF0000u) >> 8)  | ((v & 0xFF000000u) >> 24);
}

/* 32-bit word swap (ABCD -> CDAB), the classic Modbus fix: */
uint32_t wordswap32(uint32_t v) { return (v >> 16) | (v << 16); }`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Endianness Converter", description: metadata.description!, slug: "endianness-converter", faqs: FAQS })} />
      <ToolShell slug="endianness-converter">
        <EndiannessTool />
        <AdSlot id="endianness-converter-results" />

        <AnswerBox>
          This tool reorders the bytes of a hex value every way that occurs in
          practice: full byte reversal (big ↔ little endian), byte swap inside
          each 16-bit word, and 16-bit word swap inside each 32-bit group.
          Paste the bytes you captured and compare the three outputs against
          what you expected — the matching transform tells you exactly how the
          producing system stores data.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A multi-byte value has no inherent byte order — 0x12345678 can sit
            in memory as <code>12 34 56 78</code> (big-endian, network order)
            or <code>78 56 34 12</code> (little-endian, x86 and most MCUs).
            Protocols and file formats each pick a convention, and every
            boundary between conventions is a chance for corruption. The three
            transforms here cover the real-world cases: full reversal for
            endianness conversion, adjacent-byte swap for 16-bit-oriented
            transports, and 16-bit word swap for the register-pair orderings
            PLC vendors use.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            input&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 12 34 56 78
            <br />
            byte-reversed&nbsp;&nbsp;&nbsp;: <span className="text-ok">78 56 34 12</span>&nbsp;&nbsp;(big ↔ little)
            <br />
            16-bit byte swap: 34 12 78 56
            <br />
            word swap&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 56 78 12 34&nbsp;&nbsp;(ABCD → CDAB)
          </DataWell>
        </Section>

        <AdSlot id="endianness-converter-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Byte reversal", value: "any length", note: "full endianness flip" },
              { name: "16-bit byte swap", value: "even byte counts", note: "AB CD → BA DC" },
              { name: "Word swap", value: "multiples of 4 bytes", note: "AB CD EF GH → EF GH AB CD" },
              { name: "Input format", value: "hex bytes", note: "spaces / 0x prefixes accepted" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["ieee-754-float", "twos-complement", "hex-to-ascii"]} />
      </ToolShell>
    </>
  );
}
