import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { CrcTool } from "@/components/tool/CrcTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "CRC-8 Calculator — standard and MAXIM/Dallas variants",
  description:
    "Free online CRC-8 calculator for hex or ASCII data: plain CRC-8 (poly 0x07) and CRC-8/MAXIM (Dallas 1-Wire, poly 0x31). 100% in your browser.",
  openGraph: { title: "CRC-8 Calculator — standard and MAXIM/Dallas variants", description: "Plain CRC-8 (poly 0x07) and CRC-8/MAXIM (Dallas 1-Wire, poly 0x31) over hex or ASCII data.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which CRC-8 variants does this page compute?",
    a: "Plain CRC-8 (polynomial 0x07, init 0x00, no reflection — check value 0xF4 over 123456789) and CRC-8/MAXIM (polynomial 0x31 reflected, init 0x00, check 0xA1), the algorithm Dallas/Maxim 1-Wire devices such as the DS18B20 use for their scratchpad and ROM CRCs.",
  },
  {
    q: "My sensor datasheet says poly 0x31 but my result doesn't match — why?",
    a: "Reflection is the usual culprit: CRC-8/MAXIM processes bits LSB-first, which is equivalent to using the reversed polynomial 0x8C in code. If your implementation shifts left with 0x31 without reflecting, you compute a different (also valid, but incompatible) CRC. The Custom CRC tool lets you match any parameter set exactly.",
  },
  {
    q: "When is an 8-bit CRC enough?",
    a: "For short frames — a handful of bytes on a sensor bus — CRC-8 detects all single- and double-bit errors and any burst up to 8 bits, at the cost of a single byte. Longer frames or noisier links usually step up to CRC-16.",
  },
  {
    q: "How can I verify this calculator?",
    a: "Type 123456789 in ASCII mode: plain CRC-8 must give 0xF4 and CRC-8/MAXIM 0xA1. Both values are pinned in this site's automated test suite.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Everything is computed locally in your browser.",
  },
];

const C_SNIPPET = `#include <stdint.h>
#include <stddef.h>

/* CRC-8/MAXIM (Dallas 1-Wire): poly 0x31 reflected -> 0x8C,
 * init 0x00, refin/refout. "123456789" -> 0xA1 */
uint8_t crc8_maxim(const uint8_t *data, size_t len)
{
    uint8_t crc = 0x00;
    for (size_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (int b = 0; b < 8; b++)
            crc = (crc & 1) ? (crc >> 1) ^ 0x8C : crc >> 1;
    }
    return crc;
}`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "CRC-8 Calculator", description: metadata.description!, slug: "crc-8", faqs: FAQS })} />
      <ToolShell slug="crc-8">
        <CrcTool presetNames={["CRC-8", "CRC-8/MAXIM"]} />
        <AdSlot id="crc-8-results" />

        <AnswerBox>
          This tool computes 8-bit CRCs over hex bytes or ASCII text in the two
          models that dominate practice: plain CRC-8 (polynomial{" "}
          <code>0x07</code>) and CRC-8/MAXIM, the reflected polynomial{" "}
          <code>0x31</code> algorithm used by Dallas/Maxim 1-Wire sensors.
          Reference check values over <code>123456789</code>: plain{" "}
          <code>0xF4</code>, MAXIM <code>0xA1</code>.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Like every CRC, an 8-bit CRC is the remainder of dividing the
            message by a generator polynomial over GF(2) — just with an 8-bit
            register. Plain CRC-8 feeds bits most-significant first with
            polynomial <code>0x07</code> and a zero initial register.
            CRC-8/MAXIM reflects input and output, so practical code keeps the
            register reversed and shifts right with the mirrored polynomial{" "}
            <code>0x8C</code>: XOR the byte in, then eight shift-and-XOR steps.
          </p>
          <p>
            One byte of check data is a deliberate trade-off: it catches all
            single- and double-bit errors and 8-bit bursts on short sensor
            frames while adding minimal overhead — exactly the regime of 1-Wire
            scratchpads, SMBus PEC-style links and small register protocols.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            input (ASCII): 123456789
            <br />
            CRC-8 (0x07)&nbsp;&nbsp;&nbsp;&nbsp;: <span className="text-ok">0xF4</span>
            <br />
            CRC-8/MAXIM: 0xA1&nbsp;&nbsp;(poly 0x31 reflected = 0x8C)
          </DataWell>
        </Section>

        <AdSlot id="crc-8-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "CRC-8", value: "poly 0x07 · init 0x00 · no reflect", note: "check 0xF4" },
              { name: "CRC-8/MAXIM", value: "poly 0x31 · init 0x00 · reflected", note: "check 0xA1 · 1-Wire" },
              { name: "Width", value: "8 bits", note: "detects 8-bit bursts" },
              { name: "Other models", value: "Custom CRC tool", note: "any poly/init/xorout" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["custom-crc", "crc-16-modbus", "crc-identifier"]} />
      </ToolShell>
    </>
  );
}
