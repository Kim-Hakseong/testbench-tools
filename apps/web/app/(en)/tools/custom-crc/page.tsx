import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { CustomCrcTool } from "@/components/tool/CustomCrcTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/custom-crc/" },
  title: "Custom CRC Calculator — any width, poly, init, reflect, xorout",
  description:
    "Free online parameterized CRC calculator: set width (1–32), polynomial, init, RefIn/RefOut and XorOut to match any CRC model. Runs 100% in your browser.",
  openGraph: { url: "/tools/custom-crc/",
    images: ["/og/custom-crc.png"], siteName: "TestBench.tools", title: "Custom CRC Calculator — any width, poly, init, reflect, xorout", description: "Free online parameterized CRC calculator: set width (1–32), polynomial, init, RefIn/RefOut and XorOut to match any CRC model. Runs 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What do the five parameters mean?",
    a: "Width is the CRC size in bits. Poly is the generator polynomial (normal, unreflected notation). Init is the register's starting value. RefIn/RefOut reverse the bit order of input bytes and of the final register. XorOut is XORed into the register at the very end. Together these form the Rocksoft parameter model that uniquely defines a CRC.",
  },
  {
    q: "How do I find the parameters for my unknown device CRC?",
    a: "If the documentation names an algorithm, load it from the preset list. If you only have example frames with known-good CRCs, adjust parameters until the output matches — or use the CRC Identifier tool, which searches the catalog automatically.",
  },
  {
    q: "Why does my result differ from another site for the same polynomial?",
    a: "The polynomial alone does not define a CRC. Different init, reflection or xorout values produce different results — for example the default parameters on this page (poly 0xD5, init 0xFF) give 0x7C over 123456789, while plain CRC-8 (poly 0x07, init 0x00) gives 0xF4.",
  },
  {
    q: "Does it support widths that are not a multiple of 8?",
    a: "Yes — any width from 1 to 32 bits. Sub-byte widths such as CRC-4 or CRC-5 are processed bit-by-bit internally.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All computation happens locally in your browser.",
  },
];

const PY_SNIPPET = `# Fully parameterized CRC (Rocksoft model), width 1..32.
def crc(data: bytes, width, poly, init, refin, refout, xorout):
    mask = (1 << width) - 1
    top = 1 << (width - 1)
    reg = init & mask
    for byte in data:
        if refin:
            byte = int(f"{byte:08b}"[::-1], 2)
        for b in range(7, -1, -1):
            bit = (byte >> b) & 1
            flag = ((reg & top) != 0) ^ bit
            reg = (reg << 1) & mask
            if flag:
                reg ^= poly
    if refout:
        reg = int(bin(reg)[2:].zfill(width)[::-1], 2)
    return reg ^ xorout

# Worked example: poly 0xD5, init 0xFF -> 0x7C
assert crc(b"123456789", 8, 0xD5, 0xFF, False, False, 0x00) == 0x7C`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "Custom CRC Calculator",
          description: metadata.description!,
          slug: "custom-crc",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="custom-crc">
        <CustomCrcTool />
        <AdSlot id="custom-crc-results" />

        <AnswerBox>
          This tool computes a CRC from the full Rocksoft parameter model —
          width (1–32 bits), polynomial, initial value, input/output reflection
          and final XOR — so you can reproduce any CRC a datasheet throws at
          you. Load a known preset as a starting point, or dial in parameters
          manually. The page loads with poly <code>0xD5</code>, init{" "}
          <code>0xFF</code>: over ASCII <code>123456789</code> that yields{" "}
          <code>0x7C</code>.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Every CRC is polynomial division over GF(2): the message is treated
            as a long binary polynomial, divided by the generator polynomial,
            and the remainder is the checksum. Five parameters pin down the
            exact algorithm. The register starts at <code>Init</code>. Each
            message byte (bit-reversed first if <code>RefIn</code>) is fed in
            most-significant bit first; whenever a 1 exits the register's top
            bit, the register is XORed with <code>Poly</code>. After the last
            byte, the register is bit-reversed if <code>RefOut</code> and XORed
            with <code>XorOut</code>.
          </p>
          <p>
            Two models with the same polynomial can produce completely different
            values — always validate against a known check value, conventionally
            the CRC of the ASCII string <code>123456789</code>.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            model&nbsp;: width 8 · poly 0xD5 · init 0xFF · no reflect · xorout 0x00
            <br />
            input&nbsp;: 123456789 (ASCII)
            <br />
            CRC&nbsp;&nbsp;&nbsp;: <span className="text-ok">0x7C</span>
          </DataWell>
          <p>
            Compare with standard CRC-8 (poly <code>0x07</code>, init{" "}
            <code>0x00</code>) which gives <code>0xF4</code> for the same input —
            same width, different model, different result.
          </p>
        </Section>

        <AdSlot id="custom-crc-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Width", value: "1–32 bits", note: "CRC size = remainder size" },
              { name: "Poly", value: "hex, normal notation", note: "e.g. 0x07, 0x1021, 0x04C11DB7" },
              { name: "Init", value: "hex", note: "register start value" },
              { name: "RefIn / RefOut", value: "true | false", note: "bit-reverse input bytes / final register" },
              { name: "XorOut", value: "hex", note: "XORed into the final value" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["crc-identifier", "crc-16-modbus", "crc-32"]} />
      </ToolShell>
    </>
  );
}
