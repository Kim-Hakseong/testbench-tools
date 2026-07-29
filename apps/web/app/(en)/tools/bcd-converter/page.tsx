import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { BcdTool } from "@/components/tool/BcdTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "BCD Converter — packed BCD ↔ decimal with validation",
  description:
    "Free online BCD converter: packed BCD words to decimal and back, with per-nibble validation that pinpoints invalid digits. 100% in your browser.",
  alternates: toolAlternates("bcd-converter", "en"),
  openGraph: { images: ["/og/bcd-converter.png"], siteName: "TestBench.tools", title: "BCD Converter — packed BCD ↔ decimal with validation", description: "Free online BCD converter: packed BCD words to decimal and back, with per-nibble validation that pinpoints invalid digits. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What is packed BCD?",
    a: "Binary-coded decimal stores one decimal digit (0–9) in each 4-bit nibble. The hex word 0x1234 is literally the digits 1, 2, 3, 4 — decimal 1234. Older PLC function blocks, thumbwheel switches and 7-segment display drivers all speak BCD.",
  },
  {
    q: "Why is 0x12A4 invalid?",
    a: "Its third nibble (position 2, counting from the most significant) is 0xA — greater than 9, which no decimal digit maps to. The converter highlights exactly that nibble instead of silently producing a wrong number.",
  },
  {
    q: "How is BCD different from plain hex?",
    a: "In BCD, 0x1234 means decimal 1234. As a plain binary number, 0x1234 is 4660. Reading a BCD register as binary (or vice versa) is a classic PLC integration bug — if your values are consistently wrong in a pattern, check for exactly this.",
  },
  {
    q: "What range can be converted?",
    a: "Up to 8 digits (a 32-bit word): decimal 0 to 99 999 999. Each digit costs 4 bits, so a 16-bit word holds 4 digits, a 32-bit word 8.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Conversion runs locally in your browser.",
  },
];

const C_SNIPPET = `#include <stdint.h>

/* Packed BCD word -> decimal; returns -1 on an invalid nibble */
long bcd_to_dec(uint32_t bcd, int nibbles)
{
    long value = 0;
    for (int i = nibbles - 1; i >= 0; i--) {
        uint32_t nib = (bcd >> (i * 4)) & 0xF;
        if (nib > 9) return -1;      /* e.g. 0x12A4 fails here */
        value = value * 10 + (long)nib;
    }
    return value;                    /* 0x1234 -> 1234 */
}`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "BCD Converter",
          description: metadata.description!,
          slug: "bcd-converter",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="bcd-converter">
        <BcdTool />
        <AdSlot id="bcd-converter-results" />

        <AnswerBox>
          This tool converts packed BCD words to decimal and decimal values to
          BCD: <code>0x1234</code> ↔ <code>1234</code>. Every nibble is
          validated — a word like <code>0x12A4</code> is rejected with the
          offending digit highlighted, because 0xA is not a decimal digit.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Packed BCD encodes one decimal digit per 4-bit nibble, most
            significant digit first. Decoding walks the nibbles left to right,
            multiplying the accumulator by ten; any nibble above 9 aborts with
            its position. Encoding is the reverse: peel decimal digits off with
            division by ten and pack each into 4 bits. The BCD representation of
            a number is therefore identical to its decimal digits read as hex —
            which is exactly what makes accidental binary/BCD mix-ups so easy
            to miss.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            0x1234 → <span className="text-ok">1234</span>
            <br />
            5678 → <span className="text-ok">0x5678</span>
            <br />
            0x12A4 → <span className="text-err">invalid</span> — nibble 2 is 0xA (must be 0–9)
          </DataWell>
        </Section>

        <AdSlot id="bcd-converter-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Encoding", value: "packed BCD", note: "1 decimal digit per nibble" },
              { name: "Digit range", value: "0 – 9 per nibble", note: "0xA–0xF invalid" },
              { name: "Capacity", value: "8 digits / 32 bits", note: "0 … 99 999 999" },
              { name: "Error report", value: "nibble index from MSB", note: "0-based" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["number-base-converter", "plc-analog-scaling", "twos-complement"]} />
      </ToolShell>
    </>
  );
}
