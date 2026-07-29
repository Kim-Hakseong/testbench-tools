import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { HexAsciiTool } from "@/components/tool/HexAsciiTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/ascii-to-hex/" },
  title: "ASCII to Hex Converter — online, instant",
  description:
    "Free online ASCII to hex converter. Type text and get spaced uppercase hex bytes instantly — ready to paste into a serial terminal or test script. 100% in your browser.",
  openGraph: {
    images: ["/og/ascii-to-hex.png"], siteName: "TestBench.tools", title: "ASCII to Hex Converter — online, instant", description: "Free online ASCII to hex converter. Type text and get spaced uppercase hex bytes instantly — ready to paste into a serial terminal or test script. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What format is the hex output?",
    a: "Uppercase two-digit bytes separated by spaces, e.g. Hi becomes 48 69. That format pastes cleanly into most serial terminals, protocol test tools and this site's other calculators.",
  },
  {
    q: "How are line breaks and special characters handled?",
    a: "Every character in the input becomes exactly one byte of its ASCII code — a line break in the text box becomes 0A (LF). The byte counter under the input shows how many bytes the output contains.",
  },
  {
    q: "What about non-ASCII characters like é or 한?",
    a: "The converter keeps only the low byte of each character code, since it targets single-byte ASCII workflows. For multi-byte UTF-8 encoding use a dedicated Unicode tool.",
  },
  {
    q: "Can I convert hex back to text?",
    a: "Yes — the companion Hex to ASCII page, linked below the tool, does the reverse.",
  },
  {
    q: "Is my text uploaded?",
    a: "No. Conversion runs entirely in your browser.",
  },
];

const PY_SNIPPET = `# ASCII text -> spaced uppercase hex bytes
def ascii_to_hex(text: str) -> str:
    return " ".join(f"{ord(c) & 0xFF:02X}" for c in text)

assert ascii_to_hex("Hi") == "48 69"`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "ASCII to Hex Converter",
          description: metadata.description!,
          slug: "ascii-to-hex",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="ascii-to-hex">
        <HexAsciiTool direction="asciiToHex" />
        <p className="mt-3 text-sm text-mute">
          Need the other direction?{" "}
          <Link href="/tools/hex-to-ascii/" className="text-body underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink">
            Hex to ASCII Converter →
          </Link>
        </p>
        <AdSlot id="ascii-to-hex-results" />

        <AnswerBox>
          This tool converts ASCII text to hex bytes instantly: type{" "}
          <code>Hi</code> and you get <code>48 69</code>. The output is spaced,
          uppercase and two digits per byte — the format serial terminals,
          protocol testers and CRC calculators expect. A live byte counter shows
          exactly how many bytes you are about to send.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Every ASCII character has a numeric code: <code>H</code> is 72
            decimal, <code>0x48</code> hex; <code>i</code> is 105, i.e.{" "}
            <code>0x69</code>. The converter writes each character's code as a
            two-digit hex byte in order. Control characters typed into the box
            (like a newline, <code>0x0A</code>) convert the same way, which is
            useful when a device protocol requires an explicit CR/LF
            terminator.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            ascii: Hi
            <br />
            hex&nbsp;&nbsp;: <span className="text-ok">48 69</span>
            <br />
            <br />
            ascii: OK⏎&nbsp;&nbsp;(with newline)
            <br />
            hex&nbsp;&nbsp;: 4F 4B 0A
          </DataWell>
        </Section>

        <AdSlot id="ascii-to-hex-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Input", value: "ASCII text", note: "one byte per character" },
              { name: "Output", value: "spaced uppercase hex", note: "e.g. 48 69" },
              { name: "Control chars", value: "converted literally", note: "newline → 0A" },
              { name: "Non-ASCII", value: "low byte kept", note: "single-byte workflow" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["hex-to-ascii", "crc-16-modbus", "number-base-converter"]} />
      </ToolShell>
    </>
  );
}
