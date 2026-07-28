import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { XgtAddressTool } from "@/components/tool/XgtAddressTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/ls-xgt-address-converter/" },
  title: "LS XGT / XGK Address Converter — P00105, hex bit, D0011.A",
  description:
    "Free LS ELECTRIC XGK/XGB device address decoder: the last digit of a bit device is the bit in hex, word devices take a dotted hex bit. 100% in your browser.",
  openGraph: {
    title: "LS XGT / XGK Address Converter",
    description: "Split XGK addresses into word and hex bit, for bit devices and dotted word devices alike.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "What does P00105 mean?",
    a: "Word 10, bit 5 of the I/O relay area. On a bit device the last digit is the bit and it is written in hexadecimal, while everything before it is the word number in decimal. So P00105 splits as word 0010 and bit 5.",
  },
  {
    q: "Why does P0000F exist but P00016 does not?",
    a: "Because the bit digit is hexadecimal and a word holds sixteen bits, numbered 0 to F. P0000F is bit 15 of word 0. Writing P00016 does not give you bit 16 — there is no such bit; it reads as word 1, bit 6.",
  },
  {
    q: "How do I address a bit of a data register?",
    a: "With a dot: D0011.A is bit 10 of D word 11. D is a word device, so its bit is selected by a dot rather than by an extra digit, but the bit number is hexadecimal in both cases — the manual's own example is D0011.A for bit 10.",
  },
  {
    q: "Which devices are bit devices and which are word devices?",
    a: "The manual classifies P, M, K, F, L and S — plus the T and C contacts — as bit devices, addressed without a dot. D, R, U, Z and the T and C present values are word devices, where a dot selects the bit. The tool applies the right rule per device.",
  },
  {
    q: "Where do these rules come from?",
    a: "From LS ELECTRIC's XGK/XGB Instructions and Programming manual, version 2.2: section 2.2 states that a bit device's lowest place is marked in hexadecimal, and that for a word device the device number is decimal while the bit number is hexadecimal; section 2.3 lists which devices are which.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. Addresses are parsed locally in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "LS XGT / XGK Address Converter",
          description: metadata.description!,
          slug: "ls-xgt-address-converter",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="ls-xgt-address-converter">
        <XgtAddressTool />
        <AdSlot id="ls-xgt-address-converter-results" />

        <AnswerBox>
          This tool splits an LS ELECTRIC XGK/XGB device address into its word
          and bit. Bit devices such as <code>P</code> and <code>M</code> carry the
          bit as their last digit in hexadecimal, so <code>P00105</code> is word
          10, bit 5; word devices such as <code>D</code> take a dotted hex bit, so{" "}
          <code>D0011.A</code> is word 11, bit 10. Enter either form and it
          returns the split, the flat bit position and the plain word address.
        </AnswerBox>

        <Section title="How it works">
          <p>
            XGK writes a bit address by gluing the bit onto the end of the word
            number, and that last digit is hexadecimal. It reads naturally once
            you know it — <code>P0000F</code> is the sixteenth bit of the first
            word — but it makes two mistakes easy. The first is reading{" "}
            <code>P00105</code> as &ldquo;point 105&rdquo; rather than word 10 bit
            5. The second is expecting decimal to keep going: after{" "}
            <code>P00009</code> the next bit is <code>P0000A</code>, not{" "}
            <code>P00010</code>, which is already the next word.
          </p>
          <p>
            Word devices work the other way round: the number stays decimal and a
            dot introduces the bit, still in hexadecimal. Mixing the two forms is
            what the controller rejects — a bit device does not take a dot, and a
            word device does not absorb the bit into its digits. The tool applies
            the classification from the manual&apos;s device area table, so the
            error you get names the rule rather than just refusing the input.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            P00105 → word <span className="text-ok">10</span>, bit{" "}
            <span className="text-ok">5</span> (hex 5)
            <br />
            P0000F → word 0, bit 15 · flat bit 15
            <br />
            P00010 → word 1, bit 0 · flat bit 16
            <br />
            D0011.A → D word 11, bit 10 (hex A)
            <br />
            P0000.1 → <span className="text-err">rejected</span> — bit devices do not take a dot
          </DataWell>
        </Section>

        <AdSlot id="ls-xgt-address-converter-content" />

        <Section title="Device areas and syntax">
          <ParamsTable
            rows={[
              { name: "P", value: "I/O relay", note: "bit device" },
              { name: "M", value: "Auxiliary relay", note: "bit device" },
              { name: "K", value: "Keep relay", note: "bit device" },
              { name: "F", value: "Special relay", note: "bit device" },
              { name: "L / S", value: "Link / Step control relay", note: "bit device" },
              { name: "D", value: "Data register", note: "word device" },
              { name: "R / Z", value: "File / Index register", note: "word device" },
              { name: "Bit device form", value: "word + last hex digit", note: "P2047F = word 2047 bit 15" },
              { name: "Word device form", value: "decimal word . hex bit", note: "D0011.A = word 11 bit 10" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Source: LS ELECTRIC, XGK/XGB Instructions and Programming V2.2 — §2.2
            data types and §2.3 Device Area.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["s7-address-converter", "mitsubishi-address-converter", "ab-slc-address-converter"]} />
      </ToolShell>
    </>
  );
}
