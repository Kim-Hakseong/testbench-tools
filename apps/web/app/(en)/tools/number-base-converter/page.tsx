import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { NumberBaseTool } from "@/components/tool/NumberBaseTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/number-base-converter/" },
  title: "Number Base Converter — binary, octal, decimal, hex",
  description:
    "Free online number base converter with four synced fields: edit binary, octal, decimal or hexadecimal and the others update live. Arbitrary size, 100% in your browser.",
  openGraph: { title: "Number Base Converter — binary, octal, decimal, hex", description: "Free online number base converter with four synced fields: edit binary, octal, decimal or hexadecimal and the others update live. Arbitrary size, 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "How large a number can I convert?",
    a: "Arbitrarily large — the converter uses big-integer arithmetic, so 64-bit register values and beyond convert without losing precision, unlike converters built on 53-bit floating point.",
  },
  {
    q: "Are prefixes like 0x, 0b and 0o accepted?",
    a: "Yes. Each field accepts its own conventional prefix (0x for hex, 0b for binary, 0o for octal), and you can group digits with underscores or spaces — 0b1111_1111 parses fine.",
  },
  {
    q: "Does it handle negative numbers?",
    a: "Yes, with a leading minus sign — the sign carries across all four fields. Note this is mathematical negation, not a two's-complement bit pattern; for raw register interpretation use the Two's Complement tool.",
  },
  {
    q: "Why does editing one field change the other three?",
    a: "All four fields represent the same value. Whichever field you type into becomes the source; the other three are reformatted from it as soon as the input parses. An invalid digit freezes the others and points at the exact offending position.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. All conversion happens locally in your browser.",
  },
];

const PY_SNIPPET = `# Same value in four bases (Python int handles arbitrary size)
value = int("FF", 16)
assert bin(value) == "0b11111111"
assert oct(value) == "0o377"
assert value == 255
assert hex(value) == "0xff"`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "Number Base Converter",
          description: metadata.description!,
          slug: "number-base-converter",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="number-base-converter">
        <NumberBaseTool />
        <AdSlot id="number-base-converter-results" />

        <AnswerBox>
          This tool converts a number between binary, octal, decimal and
          hexadecimal — four synced fields, edit any one and the rest follow
          live. It uses big-integer math, so long 64-bit register values keep
          full precision, and invalid digits are flagged with their exact
          position.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A positional numeral system with base <em>b</em> weights each digit
            by a power of <em>b</em>. The same quantity 255 is{" "}
            <code>11111111</code> in base 2 (eight ones: 128+64+32+16+8+4+2+1),{" "}
            <code>377</code> in base 8, and <code>FF</code> in base 16. Because
            16 is 2⁴, each hex digit maps to exactly four binary digits — which
            is why hex is the standard shorthand for register and memory values.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            binary&nbsp;&nbsp;: 11111111
            <br />
            octal&nbsp;&nbsp;&nbsp;: 377
            <br />
            decimal : <span className="text-ok">255</span>
            <br />
            hex&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: FF
          </DataWell>
        </Section>

        <AdSlot id="number-base-converter-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Bases", value: "2, 8, 10, 16" },
              { name: "Size", value: "arbitrary", note: "big-integer arithmetic" },
              { name: "Prefixes", value: "0b, 0o, 0x", note: "optional" },
              { name: "Grouping", value: "_ or space", note: "0b1111_1111" },
              { name: "Sign", value: "leading −", note: "mathematical, not two's complement" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["twos-complement", "hex-to-ascii", "bit-field-extractor"]} />
      </ToolShell>
    </>
  );
}
