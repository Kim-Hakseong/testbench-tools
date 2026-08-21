import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { AbAddressTool } from "@/components/tool/AbAddressTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/ab-slc-address-converter/" },
  title: "Allen-Bradley SLC 500 Address Converter — N7:2/8, B3/16, I:2.1/3",
  description:
    "Free Allen-Bradley SLC 500 address decoder: file type, element and bit for N7:2/8, the B3/16 shorthand, and slot/word I/O like I:2.1/3. 100% in your browser.",
  openGraph: { url: "/tools/ab-slc-address-converter/",
    images: ["/og/ab-slc-address-converter.png"], siteName: "TestBench.tools",
    title: "Allen-Bradley SLC 500 Address Converter",
    description: "Decode SLC 500 data-table and I/O addresses: file, element, bit and slot.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "What does N7:2/8 mean?",
    a: "Bit 8 of element 2 in integer file 7. The colon separates the file from the element and the slash selects a bit inside it. An SLC element is one 16-bit word, so the element number runs 0 to 255 and the bit runs 0 to 15.",
  },
  {
    q: "Why is file 7 always integers?",
    a: "Files 0 to 8 are reserved with fixed meanings: O0 output, I1 input, S2 status, B3 bit, T4 timer, C5 counter, R6 control, N7 integer and F8 floating point. Files 9 to 255 are the ones you configure, and they can be bit, timer, counter, control, integer, floating point, ASCII or string.",
  },
  {
    q: "How does B3/16 relate to B3:1/0?",
    a: "They are the same bit. The shorthand counts bits straight through the file, and since each element holds 16 bits, bit 16 is the first bit of element 1. The tool shows both forms so you can move between a bit list and an element view.",
  },
  {
    q: "Why is I/O addressed differently?",
    a: "Because I/O words come from the chassis rather than from a data table. In I:2.1/3 the first number is the slot, the second is the word within that slot and the third is the bit. The word part is only needed when a module has more than 16 points, which is why O:5 and O:5.0 mean the same thing — your programming software will display the fuller form.",
  },
  {
    q: "Where does this come from?",
    a: "The SLC 500 Instruction Set Reference Manual, Rockwell Automation publication 1747-RM001G-EN-P (November 2008), in the Processor Files chapter: the element and bit delimiters and their ranges, the slot/word I/O format, and the default file assignments.",
  },
  {
    q: "Does it cover ControlLogix tags?",
    a: "No. Logix controllers are tag-based rather than file-based, so there is no numeric address to convert. This tool covers the SLC 500 style file addressing.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "Allen-Bradley SLC 500 Address Converter",
          description: metadata.description!,
          slug: "ab-slc-address-converter",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="ab-slc-address-converter">
        <AbAddressTool />
        <AdSlot id="ab-slc-address-converter-results" />

        <AnswerBox>
          This tool decodes Allen-Bradley SLC 500 addresses. Enter a data-table
          address such as <code>N7:2/8</code>, the bit shorthand{" "}
          <code>B3/16</code>, or an I/O address like <code>I:2.1/3</code>, and it
          returns the file and its type, the element, the bit, and the bit&apos;s
          position counted from the start of the file. Reference:{" "}
          <code>N7:2/8</code> is bit 8 of element 2 in integer file 7.
        </AnswerBox>

        <Section title="How it works">
          <p>
            SLC memory is organised as numbered files rather than one flat
            address space, so an address has to say which file it means, which
            element inside that file, and — when it is a bit operation — which of
            the sixteen bits. That is exactly what the punctuation encodes: a
            colon before the element, a slash before the bit. Because each
            element is a single 16-bit word, the bit range stops at 15, and an
            address like <code>N7:0/16</code> is not a deeper bit but a mistake.
          </p>
          <p>
            The first nine files are reserved, which is why you cannot put
            integers in file 3 or bits in file 7 — those numbers already mean
            something. From file 9 upward the type is whatever the program
            declares, so the letter in the address is the only clue to what a
            file holds. I/O breaks the pattern deliberately: its words come from
            physical slots, so the number after the colon is a slot position and
            the terminal you are chasing is the bit within that slot&apos;s word.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            N7:2/8 → integer file 7, element 2, bit 8
            <br />
            bit from start of file → 2 × 16 + 8 = <span className="text-ok">40</span>
            <br />
            same bit as shorthand → N7/40
            <br />
            I:2.1/3 → input, slot 2, word 1, bit 3 → terminal{" "}
            <span className="text-ok">19</span> of that slot
            <br />
            N7:0/16 → <span className="text-err">rejected</span> — an element holds bits 0-15
          </DataWell>
        </Section>

        <AdSlot id="ab-slc-address-converter-content" />

        <Section title="Reserved files and syntax">
          <ParamsTable
            rows={[
              { name: "O0 / I1", value: "Output / Input", note: "addressed by slot" },
              { name: "S2", value: "Status" },
              { name: "B3", value: "Bit" },
              { name: "T4 / C5 / R6", value: "Timer / Counter / Control" },
              { name: "N7", value: "Integer" },
              { name: "F8", value: "Floating point" },
              { name: "9–255", value: "User-assigned", note: "B T C R N F ST A" },
              { name: ":", value: "Element delimiter", note: "element 0–255" },
              { name: "/", value: "Bit delimiter", note: "bit 0–15" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Source: SLC 500 Instruction Set Reference Manual, Rockwell Automation
            publication 1747-RM001G-EN-P (November 2008), Processor Files.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["s7-address-converter", "mitsubishi-address-converter", "modbus-address-converter"]} />
      </ToolShell>
    </>
  );
}
