import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { FloatConverterTool } from "@/components/tool/FloatConverterTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/ieee-754-float/" },
  title: "IEEE 754 Float Converter — Modbus word orders ABCD/CDAB/BADC/DCBA",
  description:
    "Free online IEEE 754 float ↔ Modbus register converter covering all four word orders (ABCD, CDAB, BADC, DCBA). Find the right byte order for your PLC. 100% in your browser.",
  openGraph: {
    images: ["/og/ieee-754-float.png"], siteName: "TestBench.tools", title: "IEEE 754 Float Converter — Modbus word orders ABCD/CDAB/BADC/DCBA", description: "Free online IEEE 754 float ↔ Modbus register converter covering all four word orders (ABCD, CDAB, BADC, DCBA). Find the right byte order for your PLC. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "My float reads as a nonsense value — how do I find the right word order?",
    a: "Enter the two raw registers in Registers → Float mode and look at all four interpretations at once. The one producing a plausible engineering value is your device's order. For example registers 0x4049 0x0FDB read as ABCD give 3.1415927; the same pair in another order gives a completely different number.",
  },
  {
    q: "What do ABCD, CDAB, BADC and DCBA mean?",
    a: "A is the most significant byte of the IEEE 754 value and D the least. ABCD is straight big-endian (high word first), CDAB swaps the two 16-bit words, BADC swaps bytes within each word, and DCBA is fully little-endian. Vendors disagree on which to use, which is why all four exist in the wild.",
  },
  {
    q: "Why does 3.1415927 come back as 3.1415927410125732?",
    a: "A 32-bit float has about 7 significant decimal digits. The converter stores your input in the nearest representable float32 and shows that stored value — the difference is the rounding inherent to single precision, not a bug.",
  },
  {
    q: "Which registers hold a float in Modbus?",
    a: "A float32 occupies two consecutive 16-bit holding registers. The protocol itself does not define how the four bytes map onto those registers — that is a device convention, hence the word-order selector.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. All conversion happens locally in your browser.",
  },
];

const PY_SNIPPET = `import struct

# float -> two 16-bit registers in each Modbus word order
def to_regs(value: float, order: str = "ABCD") -> tuple[int, int]:
    a, b, c, d = struct.pack(">f", value)
    pairs = {"ABCD": (a, b, c, d), "CDAB": (c, d, a, b),
             "BADC": (b, a, d, c), "DCBA": (d, c, b, a)}
    p = pairs[order]
    return (p[0] << 8) | p[1], (p[2] << 8) | p[3]

assert to_regs(3.1415927, "ABCD") == (0x4049, 0x0FDB)
assert to_regs(3.1415927, "CDAB") == (0x0FDB, 0x4049)`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "IEEE 754 Float Converter",
          description: metadata.description!,
          slug: "ieee-754-float",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="ieee-754-float">
        <FloatConverterTool />
        <AdSlot id="ieee-754-float-results" />

        <AnswerBox>
          This tool converts between an IEEE 754 single-precision float and the
          two 16-bit Modbus registers that carry it — in all four word orders
          (ABCD, CDAB, BADC, DCBA) at once. Use it to encode a setpoint for
          writing, or to find out which byte order your PLC or sensor uses when
          a readback looks like garbage.
        </AnswerBox>

        <Section title="How it works">
          <p>
            An IEEE 754 float32 is four bytes: 1 sign bit, 8 exponent bits and
            23 fraction bits. Call the bytes A B C D from most to least
            significant. Two consecutive Modbus registers hold those four bytes,
            but the mapping is a vendor convention: ABCD puts the high word
            first (big-endian), CDAB swaps the two words, BADC swaps the bytes
            inside each word, and DCBA reverses everything (little-endian).
          </p>
          <p>
            The same four bytes therefore decode to different numbers depending
            on the assumed order — showing all four interpretations side by side
            makes the correct one obvious in practice.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            value: 3.1415927 → IEEE 754 bytes: 40 49 0F DB
            <br />
            ABCD: <span className="text-ok">0x4049 0x0FDB</span>&nbsp;&nbsp;·&nbsp;&nbsp;CDAB: 0x0FDB 0x4049
            <br />
            BADC: 0x4940 0xDB0F&nbsp;&nbsp;·&nbsp;&nbsp;DCBA: 0xDB0F 0x4940
            <br />
            <br />
            All four register pairs decode back to 3.1415927 in their own order.
          </DataWell>
        </Section>

        <AdSlot id="ieee-754-float-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Format", value: "IEEE 754 binary32", note: "1 + 8 + 23 bits" },
              { name: "Registers", value: "2 × 16-bit", note: "consecutive holding registers" },
              { name: "ABCD", value: "reg0 = A·B, reg1 = C·D", note: "big-endian, high word first" },
              { name: "CDAB", value: "reg0 = C·D, reg1 = A·B", note: "word swap" },
              { name: "BADC", value: "reg0 = B·A, reg1 = D·C", note: "byte swap within words" },
              { name: "DCBA", value: "reg0 = D·C, reg1 = B·A", note: "little-endian" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["modbus-frame-decoder", "endianness-converter", "twos-complement"]} />
      </ToolShell>
    </>
  );
}
