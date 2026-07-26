import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { BitFieldTool } from "@/components/tool/BitFieldTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Bit Field Extractor — decode register fields visually",
  description:
    "Free online bit field extractor: enter a register value up to 64-bit, define named fields by LSB and width, and read each field's value on a colored bit strip. 100% in your browser.",
  openGraph: { title: "Bit Field Extractor — decode register fields visually", description: "Define named fields by LSB and width and read each field's value on a colored bit strip.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "How do I read a field defined as bits [15:8] in a datasheet?",
    a: "That notation means MSB 15 down to LSB 8 — enter LSB 8, width 8 here. The extraction is (value >> 8) & 0xFF: shift the field down to bit 0, then mask its width. The colored strip shows exactly which bits each field claims.",
  },
  {
    q: "Why does the bit strip number bits from the right?",
    a: "Bit 0 is by convention the least significant bit, on the right in the usual written order — matching how datasheets label register maps. The ruler under the strip marks every 4th bit to make nibble boundaries easy to count.",
  },
  {
    q: "Can fields overlap or leave gaps?",
    a: "Yes — the tool extracts each field independently, so overlapping definitions are allowed (the strip colors the first-defined owner) and undefined bits simply stay uncolored. That mirrors real register maps, which often have reserved gaps.",
  },
  {
    q: "How large a value can I decode?",
    a: "Up to 64 bits (16 hex digits). Extraction uses arbitrary-precision integers internally, so 64-bit registers with fields crossing the 32-bit boundary decode exactly.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Extraction runs locally in your browser.",
  },
];

const C_SNIPPET = `#include <stdint.h>

/* Extract WIDTH bits starting at LSB from a register value */
#define FIELD(reg, lsb, width) \\
    (((reg) >> (lsb)) & ((1u << (width)) - 1u))

uint32_t reg  = 0xCAFE1234;
uint32_t low  = FIELD(reg, 0, 8);    /* 0x34        */
uint32_t mid  = FIELD(reg, 8, 12);   /* 0xE12       */
uint32_t high = FIELD(reg, 20, 12);  /* 0xCAF       */`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Bit Field Extractor", description: metadata.description!, slug: "bit-field-extractor", faqs: FAQS })} />
      <ToolShell slug="bit-field-extractor">
        <BitFieldTool />
        <AdSlot id="bit-field-extractor-results" />

        <AnswerBox>
          This tool slices a register value into named bit fields: enter the
          hex value (up to 64-bit), define each field by LSB position and
          width, and read the decoded values in decimal and hex. The bit strip
          colors every field&apos;s bits so you can check your definitions
          against the datasheet&apos;s register map at a glance.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Extracting a bit field is two operations: shift the value right by
            the field&apos;s LSB, then mask to its width —{" "}
            <code>(value &gt;&gt; lsb) &amp; ((1 &lt;&lt; width) − 1)</code>.
            Datasheets specify fields as [MSB:LSB]; width is MSB − LSB + 1.
            The tool applies that formula per field with 64-bit-safe
            arithmetic and renders the value bit by bit, MSB on the left, so
            mistakes in LSB/width definitions show up visually as bits colored
            under the wrong field.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            value 0xCAFE1234
            <br />
            [7:0]&nbsp;&nbsp;→ (v&gt;&gt;0)&amp;0xFF&nbsp;&nbsp;= <span className="text-ok">0x34</span>
            <br />
            [19:8]&nbsp;→ (v&gt;&gt;8)&amp;0xFFF = 0xE12 · [31:20] → 0xCAF
          </DataWell>
        </Section>

        <AdSlot id="bit-field-extractor-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Extraction", value: "(v >> lsb) & (2ʷ−1)" },
              { name: "Field spec", value: "LSB + width", note: "[MSB:LSB] → width = MSB−LSB+1" },
              { name: "Value size", value: "up to 64 bit", note: "BigInt-exact" },
              { name: "Overlaps / gaps", value: "allowed", note: "reserved bits stay uncolored" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["number-base-converter", "struct-padding", "twos-complement"]} />
      </ToolShell>
    </>
  );
}
