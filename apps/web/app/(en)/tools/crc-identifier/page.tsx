import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { CrcIdentifierTool } from "@/components/tool/CrcIdentifierTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/crc-identifier/" },
  title: "CRC Identifier — find which CRC algorithm produced a checksum",
  description:
    "Free online CRC identifier: enter data with its known checksum and find the matching CRC algorithm — catalog lookup plus exhaustive parameter search in a Web Worker. 100% in your browser.",
  openGraph: {
    images: ["/og/crc-identifier.png"], siteName: "TestBench.tools", title: "CRC Identifier — find which CRC algorithm produced a checksum", description: "Free online CRC identifier: enter data with its known checksum and find the matching CRC algorithm — catalog lookup plus exhaustive parameter search in a Web Worker. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "How does identification work?",
    a: "Every catalog algorithm is run over your data and kept only if it reproduces your checksum — for every pair you provide. One pair usually leaves a few candidates; two pairs from the same device almost always compress the list to a single algorithm.",
  },
  {
    q: "Why should I add a second (data, checksum) pair?",
    a: "Different CRC models can coincidentally agree on one input but almost never on two. For example ('123456789', 0x4B37) plus ('01 03 00 00 00 0A', 0xCDC5) identifies CRC-16/MODBUS uniquely.",
  },
  {
    q: "What does the deep search do?",
    a: "If no catalog algorithm matches, the deep search brute-forces every odd polynomial of the chosen width, with init and xorout each set to zero or all-ones and all four reflect combinations — testing every candidate against all your pairs. It runs in a Web Worker, so the page stays responsive, with live progress.",
  },
  {
    q: "Which parameter combinations does the deep search cover?",
    a: "Width 8 or 16; every odd polynomial (2^7 or 2^15 of them); init ∈ {0, all-ones}; xorout ∈ {0, all-ones}; RefIn/RefOut in all four combinations. Exotic init or xorout values fall outside this space — reproduce those manually in the Custom CRC tool.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Both the catalog check and the exhaustive search run locally in your browser.",
  },
];

const PY_SNIPPET = `# Identify a CRC by testing candidate models against known pairs.
CATALOG = {
    "CRC-16/MODBUS":      (16, 0x8005, 0xFFFF, True,  True,  0x0000),
    "CRC-16/CCITT-FALSE": (16, 0x1021, 0xFFFF, False, False, 0x0000),
    "CRC-16/XMODEM":      (16, 0x1021, 0x0000, False, False, 0x0000),
}

def crc(data, width, poly, init, refin, refout, xorout):
    mask, top, reg = (1 << width) - 1, 1 << (width - 1), init
    for byte in data:
        if refin: byte = int(f"{byte:08b}"[::-1], 2)
        for b in range(7, -1, -1):
            flag = ((reg & top) != 0) ^ ((byte >> b) & 1)
            reg = (reg << 1) & mask
            if flag: reg ^= poly
    if refout: reg = int(bin(reg)[2:].zfill(width)[::-1], 2)
    return reg ^ xorout

pairs = [(b"123456789", 0x4B37)]
hits = [n for n, m in CATALOG.items() if all(crc(d, *m) == c for d, c in pairs)]
assert hits == ["CRC-16/MODBUS"]`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "CRC Identifier",
          description: metadata.description!,
          slug: "crc-identifier",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="crc-identifier">
        <CrcIdentifierTool />
        <AdSlot id="crc-identifier-results" />

        <AnswerBox>
          This tool answers “which CRC is this device using?”. Give it one or
          more (data, checksum) pairs you trust — a frame you captured and the
          CRC that came with it — and it reports every algorithm in its catalog
          that reproduces all of them. If nothing matches, an exhaustive
          polynomial sweep runs in a background Web Worker and recovers the raw
          parameter set.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A CRC algorithm is fully described by five parameters: width,
            polynomial, initial value, input/output reflection and final XOR.
            The identifier first tries its named catalog — the same twelve
            models the other CRC tools here use — keeping only those that map
            every one of your data samples onto its checksum. With a single
            sample, unrelated models can collide by chance; each additional
            sample intersects the candidate set, which is why two pairs almost
            always leave exactly one survivor.
          </p>
          <p>
            The deep search covers models outside the catalog: every odd
            polynomial of the selected width is tested with init and final-XOR
            values of zero and all-ones, across all four reflection
            combinations, against all pairs. That is 2¹⁵ polynomials × 16
            parameter combinations at width 16 — heavy enough to belong in a
            Web Worker, streaming progress while your tab stays usable.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            pair 1: data “123456789” · checksum 0x4B37
            <br />
            → candidates include <span className="text-ok">CRC-16/MODBUS</span>
            <br />
            <br />
            pair 2: data 01 03 00 00 00 0A · checksum 0xCDC5
            <br />
            → intersection: <span className="text-ok">CRC-16/MODBUS</span> (single candidate)
            <br />
            <br />
            (“123456789” with 0x29B1 instead → CRC-16/CCITT-FALSE)
          </DataWell>
        </Section>

        <AdSlot id="crc-identifier-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Catalog", value: "12 named models", note: "CRC-8/-16/-32 families used across this site" },
              { name: "Deep search width", value: "8 or 16", note: "32-bit space is impractical to sweep exhaustively" },
              { name: "Polynomials", value: "all odd values", note: "generator poly always has the x⁰ term" },
              { name: "Init / XorOut", value: "{0, all-ones}", note: "the overwhelmingly common choices" },
              { name: "Reflection", value: "ff / tt / tf / ft", note: "all four combinations" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["custom-crc", "crc-16-modbus", "crc-16-ccitt"]} />
      </ToolShell>
    </>
  );
}
