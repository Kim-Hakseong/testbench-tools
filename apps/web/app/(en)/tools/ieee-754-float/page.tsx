import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { FloatConverterTool } from "@/components/tool/FloatConverterTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/ieee-754-float/" },
  title: "IEEE 754 Converter — float32 bit layout, hex and Modbus word orders",
  description:
    "Free online IEEE 754 converter: float32 ↔ hex register pairs in all four Modbus word orders (ABCD, CDAB, BADC, DCBA), the sign/exponent/fraction bit layout with its bias-127 exponent, the bit patterns for zero, subnormals, ±Inf and NaN, and how far a 32-bit float carries counts exactly. 100% in your browser.",
  openGraph: { url: "/tools/ieee-754-float/",
    images: ["/og/ieee-754-float.png"], siteName: "TestBench.tools", title: "IEEE 754 Converter — float32 bit layout, hex and Modbus word orders", description: "Free online IEEE 754 converter: float32 ↔ hex register pairs in all four Modbus word orders (ABCD, CDAB, BADC, DCBA), the sign/exponent/fraction bit layout with its bias-127 exponent, the bit patterns for zero, subnormals, ±Inf and NaN, and how far a 32-bit float carries counts exactly. 100% in your browser.", type: "website" },
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
    q: "What is the exponent bias 127 for?",
    a: "The 8 exponent bits are stored as an unsigned number from 0 to 255 and the real exponent is that number minus 127, which lets one field cover both large and small magnitudes without a separate sign bit. A stored 127 means 2⁰, so 1.0 is 0x3F80 0000; stored 128 means 2¹, which is why π (0x4049 0FDB) comes out as 1.5707964 × 2. Stored 0 and 255 are reserved for zero/subnormals and for ±Inf/NaN.",
  },
  {
    q: "A Modbus read returns NaN or 3.4e38 — what happened?",
    a: "Those are the reserved and extreme bit patterns, and on a register pair they usually mean the two words are being assembled the wrong way round rather than the device reporting a huge measurement. Check all four interpretations: a pair that reads +Inf as ABCD (0x7F80 0x0000) is a harmless 4.6e-41 as CDAB, and a plausible process value in one order is often Inf or NaN in another. If every order gives Inf or NaN, the registers really do carry the all-ones exponent and the value is a fault indication, not a reading.",
  },
  {
    q: "Can a float32 carry my 8-digit counter exactly?",
    a: "Up to 16 777 216 (2²⁴) every integer is exact. Above that the spacing becomes 2, then 4, so 20 000 001 counts stores as 20 000 000 and the last digit of a long-running totalizer is lost. Transfer large counts as a 32-bit integer pair instead, or split them into a rollover count and a remainder.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. All conversion happens locally in your browser.",
  },
];

const SPECIAL_ROWS = [
  { name: "+0.0", value: "0x0000 0x0000", note: "exponent 0, fraction 0" },
  { name: "−0.0", value: "0x8000 0x0000", note: "sign bit only; compares equal to +0" },
  { name: "1.4012985e−45", value: "0x0000 0x0001", note: "smallest subnormal, 2⁻¹⁴⁹" },
  { name: "1.1754944e−38", value: "0x0080 0x0000", note: "smallest normal, 2⁻¹²⁶" },
  { name: "1.0", value: "0x3F80 0x0000", note: "stored exponent 127, fraction 0" },
  { name: "3.4028235e38", value: "0x7F7F 0xFFFF", note: "largest finite, (2 − 2⁻²³)·2¹²⁷" },
  { name: "+Inf", value: "0x7F80 0x0000", note: "exponent 255, fraction 0" },
  { name: "−Inf", value: "0xFF80 0x0000", note: "same with the sign bit set" },
  { name: "NaN", value: "0x7FC0 0x0000", note: "exponent 255, fraction non-zero (quiet NaN)" },
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
          a readback looks like garbage. The sections below give the float32 bit
          layout (sign, bias-127 exponent, 23 fraction bits), the register pairs
          for zero, the subnormal limits, ±Inf and NaN, and how far the format
          carries counts exactly.
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

        <Section title="Inside the 32 bits: sign, exponent, fraction">
          <p>
            Bit 31 is the sign, bits 30–23 are the exponent and bits 22–0 are
            the fraction. The exponent is stored biased: the field holds an
            unsigned 0–255 and the real power of two is that value minus 127.
            For a stored exponent <code>e</code> between 1 and 254 the number is{" "}
            <code>(−1)ˢ · 2^(e−127) · 1.f</code>, where the leading 1 is implied
            and never stored — that implied bit is what gives a 24-bit
            significand out of 23 stored bits. A stored exponent of 0 drops the
            implied 1 and gives zero and the subnormals, and 255 is reserved for
            ±Inf and NaN.
          </p>
          <DataWell>
            0x4049 0x0FDB → 0100 0000 0100 1001 0000 1111 1101 1011
            <br />
            sign 0 · exponent 1000 0000 = 128 → 2^(128−127) = 2
            <br />
            fraction 100 1001 0000 1111 1101 1011 = 4 788 187 / 2²³ = 0.5707964
            <br />
            value = 1.5707964 × 2 = <span className="text-ok">3.1415927</span>
          </DataWell>
          <p>
            That is the whole decode, and it is why the two halves of a float
            are not interchangeable: the first register in ABCD order carries
            the sign and the entire exponent, the second carries only the low
            16 fraction bits. Lose or swap the high word and the magnitude is
            gone; corrupt the low word and you only lose resolution.
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

        <Section title="Special values and the register pairs that carry them">
          <p>
            Zero, the subnormals, the two infinities and NaN all live in the
            exponent values 0 and 255, which is why they look like ordinary
            hex until you know where to split the bits. The pairs below are in
            ABCD order; paste any of them into the Registers → Float tab to see
            what the other three orders make of the same words.
          </p>
          <ParamsTable rows={SPECIAL_ROWS} />
          <p>
            On a live bus these patterns are usually a clue about the transport
            rather than the process. An all-ones exponent means the register pair
            is not carrying a measurement at all, and a pair reading +Inf as
            ABCD (0x7F80 0x0000) reads as 4.6e−41 in CDAB — one of those two is a
            word-order mistake and the other is a device genuinely reporting a
            non-value. The reverse trap is worth remembering too: 0x0000 0x7F80
            is not a tiny number followed by noise, it is +Inf from a
            word-swapped device. Only a zero pair is safe in every order, since
            0x0000 0x0000 decodes to 0.0 whichever way the bytes are assembled.
          </p>
        </Section>

        <Section title="How much a float32 actually resolves">
          <p>
            The significand is 24 bits including the implied one, so the format
            carries log₁₀(2²⁴) ≈ 7.2 decimal digits — about 7 significant
            figures, independent of magnitude. In absolute terms the step
            between neighbouring floats is <code>2^(e−127−23)</code>: around a
            100.0 bar reading the spacing is 2⁻¹⁷ ≈ 7.6 µbar, which is far below
            any transmitter&apos;s own uncertainty, so single precision is never
            the limiting factor on a scaled analog value.
          </p>
          <p>
            Counts are the case where it does bite. Integers are exact up to
            2²⁴ = 16 777 216; past that the spacing is 2, then 4, so a totalizer
            or pulse counter sent as a float32 silently starts rounding its last
            digit. The same arithmetic explains the rounding you see on ordinary
            setpoints: a float32 stores the nearest representable value, which
            is why a 3.1415927 you wrote reads back as 3.1415927410125732.
          </p>
        </Section>

        <Section title="If you have one 32-bit hex word instead of two registers">
          <p>
            Captures from a protocol analyser often show the float as a single
            32-bit word, e.g. <code>0x40490FDB</code>. Split it into two 4-digit
            halves — <code>4049</code> and <code>0FDB</code> — and enter them in
            that order in the Registers → Float tab; ABCD is then the
            interpretation that matches the hex word as written. If your capture
            shows the bytes in transmission order from a device whose
            documentation mentions word swapping, read the CDAB row instead.
          </p>
        </Section>

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Format", value: "IEEE 754 binary32", note: "1 + 8 + 23 bits" },
              { name: "Bit positions", value: "31 sign · 30–23 exponent · 22–0 fraction", note: "A = bits 31–24, D = bits 7–0" },
              { name: "Exponent", value: "stored 0–255, bias 127", note: "0 = zero/subnormal, 255 = Inf/NaN" },
              { name: "Significand", value: "24 bits (23 stored + implied 1)", note: "≈ 7.2 decimal digits" },
              { name: "Normal range", value: "±1.1754944e−38 … ±3.4028235e38", note: "2⁻¹²⁶ to (2 − 2⁻²³)·2¹²⁷" },
              { name: "Exact integers", value: "up to 16 777 216", note: "2²⁴; spacing 2 above it" },
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
