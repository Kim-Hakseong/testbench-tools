import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { CrcTool } from "@/components/tool/CrcTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/crc-16-ccitt/" },
  title: "CRC-16 CCITT Calculator — CCITT-FALSE, XMODEM, KERMIT, IBM-SDLC",
  description:
    "Free online CRC-16 CCITT calculator with selectable variants (CCITT-FALSE, XMODEM, KERMIT, IBM-SDLC) — all based on polynomial 0x1021. Runs 100% in your browser.",
  openGraph: {
    images: ["/og/crc-16-ccitt.png"], siteName: "TestBench.tools", title: "CRC-16 CCITT Calculator — CCITT-FALSE, XMODEM, KERMIT, IBM-SDLC", description: "Free online CRC-16 CCITT calculator with selectable variants (CCITT-FALSE, XMODEM, KERMIT, IBM-SDLC) — all based on polynomial 0x1021. Runs 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which variant is “the” CRC-CCITT?",
    a: "There is no single one — that is why this page has a variant selector. All four share polynomial 0x1021 but differ in init, reflection and final XOR. CCITT-FALSE (init 0xFFFF, no reflection) is what most people mean; XMODEM starts from 0x0000; KERMIT reflects; IBM-SDLC (X.25) reflects and inverts the result.",
  },
  {
    q: "What are the check values for each variant?",
    a: "Over the ASCII string 123456789: CCITT-FALSE → 0x29B1, XMODEM → 0x31C3, KERMIT → 0x2189, IBM-SDLC → 0x906E. All four are pinned in this site's automated test suite.",
  },
  {
    q: "My device documentation just says “CRC-CCITT 0x1021” — which variant do I pick?",
    a: "Compute your device's CRC over the string 123456789 (or any frame you already trust) and compare against each variant's result here. Matching the check value identifies the exact model; the CRC Identifier tool automates this search.",
  },
  {
    q: "Why does the same polynomial give four different results?",
    a: "The CRC value depends on the full parameter model, not the polynomial alone: the initial register value, whether input/output bits are reflected, and the final XOR all change the result.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Everything is computed locally in your browser.",
  },
];

const C_SNIPPET = `#include <stdint.h>
#include <stddef.h>

/* CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF,
 * no reflection, no final XOR. */
uint16_t crc16_ccitt_false(const uint8_t *data, size_t len)
{
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < len; i++) {
        crc ^= (uint16_t)data[i] << 8;
        for (int b = 0; b < 8; b++)
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    return crc; /* "123456789" -> 0x29B1 */
}`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "CRC-16 CCITT Calculator",
          description: metadata.description!,
          slug: "crc-16-ccitt",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="crc-16-ccitt">
        <CrcTool
          presetNames={[
            "CRC-16/CCITT-FALSE",
            "CRC-16/XMODEM",
            "CRC-16/KERMIT",
            "CRC-16/IBM-SDLC",
          ]}
        />
        <AdSlot id="crc-16-ccitt-results" />

        <AnswerBox>
          This tool computes the CCITT family of 16-bit CRCs — every variant
          built on polynomial <code>0x1021</code>. Pick the variant your
          protocol uses (CCITT-FALSE, XMODEM, KERMIT or IBM-SDLC) and the result
          updates live. Reference check values over ASCII{" "}
          <code>123456789</code>: CCITT-FALSE <code>0x29B1</code>, XMODEM{" "}
          <code>0x31C3</code>, KERMIT <code>0x2189</code>, IBM-SDLC{" "}
          <code>0x906E</code>.
        </AnswerBox>

        <Section title="How it works">
          <p>
            All four variants divide the message by the generator polynomial{" "}
            <code>0x1021</code> (x¹⁶ + x¹² + x⁵ + 1) and keep the 16-bit
            remainder, but they differ in three model parameters. CCITT-FALSE
            and XMODEM process bits most-significant first (no reflection) and
            differ only in the initial register value — <code>0xFFFF</code>{" "}
            versus <code>0x0000</code>. KERMIT and IBM-SDLC reflect the bit
            order; IBM-SDLC additionally starts from <code>0xFFFF</code> and
            inverts the final remainder.
          </p>
          <p>
            Because the parameter model — not the polynomial — determines the
            result, always confirm a variant against a known check value before
            trusting an integration.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            input (ASCII)&nbsp;&nbsp;&nbsp;: 123456789
            <br />
            CCITT-FALSE&nbsp;&nbsp;&nbsp;&nbsp;: <span className="text-ok">0x29B1</span>
            <br />
            XMODEM&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 0x31C3
            <br />
            KERMIT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 0x2189
            <br />
            IBM-SDLC&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 0x906E
          </DataWell>
        </Section>

        <AdSlot id="crc-16-ccitt-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "CRC-16/CCITT-FALSE", value: "init 0xFFFF · no reflect · xorout 0x0000", note: "check 0x29B1" },
              { name: "CRC-16/XMODEM", value: "init 0x0000 · no reflect · xorout 0x0000", note: "check 0x31C3" },
              { name: "CRC-16/KERMIT", value: "init 0x0000 · reflected · xorout 0x0000", note: "check 0x2189" },
              { name: "CRC-16/IBM-SDLC", value: "init 0xFFFF · reflected · xorout 0xFFFF", note: "check 0x906E" },
              { name: "Polynomial (all)", value: "0x1021" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["crc-16-modbus", "custom-crc", "crc-identifier"]} />
      </ToolShell>
    </>
  );
}
