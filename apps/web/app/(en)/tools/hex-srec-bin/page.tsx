import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { HexSrecBinTool } from "@/components/tool/HexSrecBinTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/hex-srec-bin/" },
  title: "Intel HEX · S-Record ↔ BIN Converter — firmware images",
  description:
    "Free online firmware image converter: Intel HEX or Motorola S-Record to raw binary and back, with checksum validation and segment map. 100% in your browser.",
  openGraph: {
    images: ["/og/hex-srec-bin.png"], siteName: "TestBench.tools", title: "Intel HEX · S-Record ↔ BIN Converter — firmware images", description: "Convert firmware between Intel HEX, S-Record and raw binary with checksum validation.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "How does the tool tell Intel HEX from S-Record apart?",
    a: "By the first character: Intel HEX records start with ':' and S-Records with 'S'. Both formats carry per-line checksums, and every line is verified — a single flipped character is reported with its line number instead of producing a silently corrupted binary.",
  },
  {
    q: "What happens to address gaps when converting to BIN?",
    a: "A raw binary has no address information, so gaps between segments are filled with 0xFF — the value erased flash reads as, which flashing tools expect. The segment map shows exactly which ranges contained real data before you download.",
  },
  {
    q: "Why do I need a base address for BIN → HEX/SREC?",
    a: "A .bin file starts at byte 0 with no notion of where it lives in the MCU's memory map. HEX and SREC embed absolute addresses, so you must supply the flash base — 0x08000000 for STM32 on-chip flash is a common example — and the records are generated from there.",
  },
  {
    q: "Which record types are handled?",
    a: "Intel HEX: data (00), EOF (01), extended segment (02), extended linear (04) and start-address records (03/05). S-Record: S0 header, S1/S2/S3 data with 16/24/32-bit addresses, S5 counts, and S7/S8/S9 entry records. Generation picks S1/S9 or S3/S7 automatically by address width.",
  },
  {
    q: "Is my firmware uploaded?",
    a: "No. Parsing and generation run entirely in your browser — firmware never leaves your machine.",
  },
];

const PY_SNIPPET = `# Verify an Intel HEX record checksum by hand
line = ":10010000214601360121470136007EFE09D2190140"
data = bytes.fromhex(line[1:])
assert sum(data) & 0xFF == 0     # all bytes incl. checksum sum to zero

count, addr, rtype = data[0], int.from_bytes(data[1:3], "big"), data[3]
assert (count, addr, rtype) == (16, 0x0100, 0)   # 16 data bytes @ 0x0100`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Intel HEX · S-Record ↔ BIN Converter", description: metadata.description!, slug: "hex-srec-bin", faqs: FAQS })} />
      <ToolShell slug="hex-srec-bin">
        <HexSrecBinTool />
        <AdSlot id="hex-srec-bin-results" />

        <AnswerBox>
          This tool converts firmware images between the three formats
          toolchains emit and flashers expect: Intel HEX, Motorola S-Record
          and raw binary. Paste or open a HEX/SREC file to get a validated
          segment map and a .bin download (gaps filled with 0xFF); or take a
          .bin, give it a base address, and generate proper HEX or SREC
          records — every checksum computed for you.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Both text formats encode address + data + checksum per line. Intel
            HEX keeps 16-bit addresses per record and adds extended-linear
            records for the upper 16 bits; S-Records widen the address field
            itself (S1/S2/S3 for 16/24/32-bit). The parser validates every
            line&apos;s checksum and length, resolves the addressing scheme,
            merges touching byte runs into segments, and either flattens them
            into a binary or re-emits them as records — the same round trip
            your toolchain&apos;s objcopy performs.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            :10010000214601360121470136007EFE09D2190140
            <br />
            → 16 bytes at 0x0100, checksum <span className="text-ok">0x40 valid</span>
            <br />
            :00000001FF → end of file · output: 32-byte segment 0x0100–0x011F
          </DataWell>
        </Section>

        <AdSlot id="hex-srec-bin-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Intel HEX records", value: "00 · 01 · 02 · 04 · 03/05" },
              { name: "S-Records", value: "S0 · S1/S2/S3 · S5 · S7/S8/S9" },
              { name: "Checksums", value: "verified per line", note: "line number on failure" },
              { name: "Gap fill", value: "0xFF", note: "erased-flash value" },
              { name: "BIN base address", value: "user-supplied hex", note: "e.g. 0x08000000" },
            ]}
          />
        </Section>

        <Section title="Python reference">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["hex-file-viewer", "struct-padding", "crc-32"]} />
      </ToolShell>
    </>
  );
}
