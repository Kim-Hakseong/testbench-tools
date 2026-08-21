import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { HexAsciiTool } from "@/components/tool/HexAsciiTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/hex-to-ascii/" },
  title: "Hex to ASCII Converter — online, instant",
  description:
    "Free online hex to ASCII converter. Paste hex bytes in any format (spaced, 0x-prefixed, packed) and read them as text instantly. 100% in your browser.",
  openGraph: { url: "/tools/hex-to-ascii/",
    images: ["/og/hex-to-ascii.png"], siteName: "TestBench.tools", title: "Hex to ASCII Converter — online, instant", description: "Free online hex to ASCII converter. Paste hex bytes in any format (spaced, 0x-prefixed, packed) and read them as text instantly. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which input formats are accepted?",
    a: "Spaced pairs (48 69), packed strings (4869), comma or dash separated bytes, and 0x-prefixed values (0x48 0x69) all parse. Invalid characters are reported with their exact position so you can fix the paste.",
  },
  {
    q: "What happens to bytes that are not printable characters?",
    a: "Bytes outside the printable ASCII range 0x20–0x7E are shown as a dot, the same convention hex editors use. The byte count below the input tells you how many bytes were actually parsed.",
  },
  {
    q: "Why do I see dots where I expected Korean or accented text?",
    a: "This tool decodes plain single-byte ASCII only. Multi-byte encodings such as UTF-8 will show their constituent bytes as dots when they fall outside the printable ASCII range.",
  },
  {
    q: "Can I convert in the other direction?",
    a: "Yes — use the companion ASCII to Hex page, linked below the tool, which converts text into spaced uppercase hex bytes.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Conversion runs entirely in your browser.",
  },
];

const PY_SNIPPET = `# Hex string -> ASCII, non-printables as "."
def hex_to_ascii(s: str) -> str:
    data = bytes.fromhex(s.replace(" ", ""))
    return "".join(chr(b) if 0x20 <= b <= 0x7E else "." for b in data)

assert hex_to_ascii("48 69") == "Hi"`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "Hex to ASCII Converter",
          description: metadata.description!,
          slug: "hex-to-ascii",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="hex-to-ascii">
        <HexAsciiTool direction="hexToAscii" />
        <p className="mt-3 text-sm text-mute">
          Need the other direction?{" "}
          <Link href="/tools/ascii-to-hex/" className="text-body underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink">
            ASCII to Hex Converter →
          </Link>
        </p>
        <AdSlot id="hex-to-ascii-results" />

        <AnswerBox>
          This tool turns a hex byte string into readable ASCII text instantly:
          paste <code>48 69</code> and you get <code>Hi</code>. It accepts
          spaced, packed, comma-separated and 0x-prefixed input, flags the exact
          position of any invalid character, and renders non-printable bytes as
          dots — handy when fishing readable strings out of a serial capture or
          register dump.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Each pair of hex digits is one byte, and printable ASCII bytes map
            directly to characters: <code>0x48</code> is <code>H</code>,{" "}
            <code>0x69</code> is <code>i</code>. The printable range runs from{" "}
            <code>0x20</code> (space) to <code>0x7E</code> (tilde); anything
            outside — control characters like CR (<code>0x0D</code>) and LF (
            <code>0x0A</code>), or bytes above <code>0x7F</code> — is shown as a
            dot so the output length still matches the byte count.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            hex&nbsp;&nbsp;: 48 69
            <br />
            ascii: <span className="text-ok">Hi</span>
            <br />
            <br />
            hex&nbsp;&nbsp;: 4F 4B 0D 0A
            <br />
            ascii: OK..&nbsp;&nbsp;(CR and LF are non-printable)
          </DataWell>
        </Section>

        <AdSlot id="hex-to-ascii-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Input", value: "hex bytes", note: "spaces, commas, dashes, 0x prefixes allowed" },
              { name: "Output", value: "ASCII text", note: "one character per byte" },
              { name: "Printable range", value: "0x20 – 0x7E", note: "others render as “.”" },
              { name: "Encoding", value: "single-byte ASCII", note: "not UTF-8 aware" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["ascii-to-hex", "number-base-converter", "modbus-frame-decoder"]} />
      </ToolShell>
    </>
  );
}
