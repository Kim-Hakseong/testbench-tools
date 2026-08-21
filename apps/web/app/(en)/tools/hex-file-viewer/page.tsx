import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { HexViewerTool } from "@/components/tool/HexViewerTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/hex-file-viewer/" },
  title: "Hex File Viewer — inspect any file as a hex dump",
  description:
    "Free online hex viewer: drop any file and read it as a classic hex dump with offsets and ASCII column, loaded incrementally. No upload, 100% in your browser.",
  openGraph: { url: "/tools/hex-file-viewer/",
    images: ["/og/hex-file-viewer.png"], siteName: "TestBench.tools", title: "Hex File Viewer — inspect any file as a hex dump", description: "Read any file as a classic hex dump with offsets and ASCII column, loaded incrementally.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "How do I read the three columns?",
    a: "Left: the byte offset from the start of the file, in hex. Middle: sixteen bytes per row as two-digit hex values, with a gap after the eighth for easy counting. Right: the same bytes as ASCII, with anything non-printable shown as a dot — the column where magic strings and embedded text jump out.",
  },
  {
    q: "What are magic numbers and where do I look for them?",
    a: "Most file formats open with a fixed signature in the first bytes: 89 50 4E 47 for PNG, 25 50 44 46 ('%PDF'), 50 4B for ZIP-based formats, 'TDSm' for TDMS. The first row of the dump usually identifies an unknown file immediately.",
  },
  {
    q: "Can it handle large files?",
    a: "Yes — the file is read lazily in 16 KB pages with the File API, so opening a gigabyte file is instant; you page through as far as you need. Nothing is ever loaded fully or uploaded.",
  },
  {
    q: "Why do I see 0xFF padding at the end of firmware dumps?",
    a: "Erased flash memory reads as all-ones, so unprogrammed regions of a firmware image appear as runs of FF. Long FF runs mark the boundary between code/data and unused flash.",
  },
  {
    q: "Is my file uploaded?",
    a: "No. Slicing and rendering run entirely in your browser.",
  },
];

const PY_SNIPPET = `# The same view on the command line
#   xxd firmware.bin | head
# or in Python:
def hexdump(data: bytes, base=0, width=16):
    for off in range(0, len(data), width):
        chunk = data[off:off + width]
        hexs = " ".join(f"{b:02X}" for b in chunk)
        text = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk)
        print(f"{base + off:08X}  {hexs:<47} |{text}|")`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Hex File Viewer", description: metadata.description!, slug: "hex-file-viewer", faqs: FAQS })} />
      <ToolShell slug="hex-file-viewer">
        <HexViewerTool />
        <AdSlot id="hex-file-viewer-results" />

        <AnswerBox>
          This tool renders any file as the classic hex dump: offset column,
          sixteen hex bytes per row, and an ASCII sidebar for spotting embedded
          strings. Files load lazily in 16 KB pages, so even huge binaries
          open instantly — the first screen is usually enough to identify a
          mystery file by its magic bytes.
        </AnswerBox>

        <Section title="How it works">
          <p>
            The viewer slices the file with the browser&apos;s File API — only
            the pages you have scrolled to are ever read from disk — and
            formats each 16-byte row as offset, hex values and printable ASCII.
            The layout is byte-exact with command-line tools like{" "}
            <code>xxd</code> and <code>hexdump -C</code>, so offsets you find
            here can be used directly in scripts, dd commands or firmware
            notes.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            00000000&nbsp;&nbsp;89 50 4E 47 0D 0A 1A 0A&nbsp; 00 00 00 0D 49 48 44 52&nbsp; |.PNG........IHDR|
            <br />
            → the first 8 bytes identify a PNG; “IHDR” names its first chunk
          </DataWell>
        </Section>

        <AdSlot id="hex-file-viewer-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Row format", value: "offset · 16 bytes hex · ASCII", note: "xxd-compatible" },
              { name: "Paging", value: "16 KB per load", note: "lazy File.slice reads" },
              { name: "Printable range", value: "0x20 – 0x7E", note: "others shown as “.”" },
              { name: "File size", value: "unlimited", note: "never fully loaded" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["hex-to-ascii", "hex-srec-bin", "tdms-viewer"]} />
      </ToolShell>
    </>
  );
}
