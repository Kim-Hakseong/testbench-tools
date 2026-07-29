import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { S7AddressTool } from "@/components/tool/S7AddressTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/s7-address-converter/" },
  title: "Siemens S7 Address Converter — byte, word and overlap checker",
  description:
    "Free online Siemens S7 address tool: decode %MW100, %M10.3 and DB1.DBW20, see the bytes each one covers, and check whether two addresses overlap. 100% in your browser.",
  openGraph: {
    images: ["/og/s7-address-converter.png"], siteName: "TestBench.tools",
    title: "Siemens S7 Address Converter",
    description: "Decode S7 addresses, see the bytes they cover, and catch overlapping words before they bite.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "Do %MW100 and %MW101 overlap?",
    a: "Yes. An S7 address names a byte offset, and a word is two bytes, so %MW100 occupies bytes 100 and 101 while %MW101 occupies bytes 101 and 102. They share byte 101, and writing one corrupts part of the other. Consecutive words step by two: %MW100, %MW102, %MW104. Double words step by four.",
  },
  {
    q: "What does %M10.3 mean?",
    a: "Bit 3 of byte 10 in the bit-memory area. The number before the dot is always a byte offset and the number after it is the bit within that byte, so it only runs 0 to 7 — %M10.8 does not exist. Counting from the start of the area, %M10.3 is absolute bit 83 (10 × 8 + 3).",
  },
  {
    q: "How do I read DB1.DBW20?",
    a: "Data block 1, word access, starting at byte 20 — so bytes 20 and 21 of that block. The same block also supports DBX (bit, written DB1.DBX20.3), DBB (byte) and DBD (double word). Two different data blocks never overlap each other, even at the same offset.",
  },
  {
    q: "Why does my 32-bit value read back wrong?",
    a: "Two common causes. Either the double word overlaps a neighbour — %MD100 covers bytes 100 to 103, so %MD102 collides with it — or the byte order is being reinterpreted. S7 stores words and double words big-endian (most significant byte at the lowest address); a device or driver expecting word-swapped order will show the halves the wrong way round.",
  },
  {
    q: "Does it accept the German mnemonics?",
    a: "Yes. E (Eingang) is read as I and A (Ausgang) as Q, so E0.0 and %I0.0 are the same address. The leading % is optional and case does not matter.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Every address is parsed locally in your browser.",
  },
];

const SNIPPET = `/* S7 addressing in one line of arithmetic:
 *   an address = area + byte offset + access width
 *
 *   width   bytes covered
 *   X       1   (one bit inside it, 0-7)
 *   B       1
 *   W       2   offset .. offset+1
 *   D       4   offset .. offset+3
 *
 * absolute bit index = byte * 8 + bit        %M10.3 -> 83
 *
 * Overlap test for two accesses in the same area:
 *   overlap = !(aLast < bFirst || bLast < aFirst)
 *
 *   %MW100 -> 100..101
 *   %MW101 -> 101..102   shares byte 101 -> OVERLAP
 *   %MW102 -> 102..103   disjoint        -> safe
 */`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "Siemens S7 Address Converter",
          description: metadata.description!,
          slug: "s7-address-converter",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="s7-address-converter">
        <S7AddressTool />
        <AdSlot id="s7-address-converter-results" />

        <AnswerBox>
          This tool reads Siemens S7 address notation and tells you exactly which
          storage it occupies. Enter <code>%MW100</code>, <code>%M10.3</code> or{" "}
          <code>DB1.DBW20</code> and it returns the area, the access width, the
          byte range covered and the absolute bit index — then checks a second
          address for overlap. Reference: <code>%MW100</code> covers bytes 100–101,
          so it overlaps <code>%MW101</code> but not <code>%MW102</code>.
        </AnswerBox>

        <Section title="How it works">
          <p>
            An S7 address is not an index into a list of variables. It names a
            byte offset inside a memory area, together with how many bytes to
            read from there. That single rule explains everything else: a word
            access covers two bytes and a double word covers four, so addresses
            of different widths — and even of the same width — can occupy the
            same storage. The tool turns the notation into the byte range it
            really means, which is the form you need when you are laying out a
            data block or matching a device&apos;s memory map.
          </p>
          <p>
            The overlap check exists because the failure it catches is quiet.
            Nothing warns you that <code>%MW100</code> and <code>%MW101</code>{" "}
            share byte 101; the program compiles and downloads, and one value
            simply corrupts the other at runtime. Engineers coming from
            controllers whose registers are indexed one by one — where D100 and
            D101 are genuinely separate — meet this the hard way. Stepping words
            by two and double words by four is the fix, and the allocation list
            here generates that layout for you.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            %MW100 → area M, word, bytes 100–101, first bit 800
            <br />
            %MW101 → area M, word, bytes 101–102
            <br />
            shared byte 101 · <span className="text-err">overlap</span>
            <br />
            %MW102 → bytes 102–103 · <span className="text-ok">no overlap</span>
            <br />
            safe run of four: %MW100 · %MW102 · %MW104 · %MW106
          </DataWell>
        </Section>

        <AdSlot id="s7-address-converter-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "%I / %E", value: "Input area", note: "E = Eingang" },
              { name: "%Q / %A", value: "Output area", note: "A = Ausgang" },
              { name: "%M", value: "Bit memory" },
              { name: "DBx.DB…", value: "Data block x" },
              { name: "X", value: "Bit", note: "bit number 0–7" },
              { name: "B", value: "Byte", note: "1 byte" },
              { name: "W", value: "Word", note: "2 bytes, big-endian" },
              { name: "D", value: "Double word", note: "4 bytes, big-endian" },
            ]}
          />
        </Section>

        <Section title="The arithmetic">
          <CodeSnippet language="C" code={SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools
          slugs={["modbus-address-converter", "plc-analog-scaling", "bcd-converter"]}
        />
      </ToolShell>
    </>
  );
}
