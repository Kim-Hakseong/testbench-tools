import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { Mil1553CommandTool } from "@/components/tool/Mil1553CommandTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/mil-1553-command-word/" },
  title: "MIL-STD-1553B Command Word Decoder — RT, T/R, subaddress, word count",
  description:
    "Free online MIL-STD-1553B command word decoder and builder: RT address, T/R bit, subaddress, word count and mode codes, with odd parity. 100% in your browser.",
  openGraph: { title: "MIL-STD-1553B Command Word Decoder", description: "Decode and build 1553B command words: RT address, T/R, subaddress, word count and mode codes.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "How is a 1553B command word laid out?",
    a: "Sixteen bits, MSB first: bits 15-11 are the remote terminal (RT) address (0-31), bit 10 is the Transmit/Receive (T/R) bit, bits 9-5 are the subaddress (0-31), and bits 4-0 are the word count or mode code. A 3-bit command sync and an odd-parity bit bracket these 16 bits on the wire.",
  },
  {
    q: "When is the last field a word count versus a mode code?",
    a: "The subaddress decides. Subaddress 0 or 31 signals a mode command, so bits 4-0 are a mode code (0-31). Any other subaddress means a data transfer, and bits 4-0 are the word count — where a field value of 0 means 32 data words, not zero.",
  },
  {
    q: "What does the T/R bit mean?",
    a: "1 = transmit: the addressed RT sends data to the bus controller (RT → BC). 0 = receive: the RT receives data from the bus controller (BC → RT). For mode commands the T/R bit also selects between transmit-type and receive-type mode codes.",
  },
  {
    q: "What is RT address 31?",
    a: "Address 31 (0b11111) is the broadcast address — all RTs act on the command and, per the standard, do not return a status word for a broadcast receive. Individual RTs use addresses 0-30.",
  },
  {
    q: "How is the parity computed?",
    a: "Odd parity over the 16-bit word: the parity bit is set so the total number of 1s across the 16 content bits plus the parity bit is odd. This tool shows the parity bit for any word you decode or build.",
  },
];

const C_SNIPPET = `#include <stdint.h>

/* Decode a MIL-STD-1553B command word (16-bit content) */
typedef struct { uint8_t rt, tr, sa, wc_mode; } cw_t;

cw_t decode_cw(uint16_t w)
{
    cw_t c;
    c.rt      = (w >> 11) & 0x1F;   /* RT address 0-31         */
    c.tr      = (w >> 10) & 0x01;   /* 1=transmit, 0=receive   */
    c.sa      = (w >>  5) & 0x1F;   /* subaddress (0/31=mode)  */
    c.wc_mode =  w        & 0x1F;   /* word count or mode code */
    return c;                        /* 0x183E -> RT3 Rx SA1 WC30 */
}`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "MIL-STD-1553B Command Word Decoder", description: metadata.description!, slug: "mil-1553-command-word", faqs: FAQS })} />
      <ToolShell slug="mil-1553-command-word">
        <Mil1553CommandTool />
        <AdSlot id="mil-1553-command-word-results" />

        <AnswerBox>
          This tool decodes and builds MIL-STD-1553B command words. Enter a
          16-bit hex word to break out the RT address, T/R direction,
          subaddress, and word count or mode code — or set the fields to
          generate the word. It handles the mode-command rule (subaddress 0/31)
          and shows the odd-parity bit. Reference: <code>0x183E</code> = RT 3,
          receive, subaddress 1, 30 data words.
        </AnswerBox>

        <Section title="How it works">
          <p>
            The bus controller starts every 1553 transfer with a command word.
            Its 16 bits pack four fields — <code>RT(5) · T/R(1) · SA(5) ·
            WC/mode(5)</code> — transmitted most-significant bit first, framed
            by a 3-bit command sync and closed with an odd-parity bit. The
            subaddress is the switch that changes the meaning of the final
            field: 0 or 31 makes it a mode code, anything else makes it a word
            count (with 0 meaning a full 32 words). Getting that rule right is
            the whole game when reading a captured word.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            0x183E = 0001 1000 0011 1110
            <br />
            RT <span className="text-ok">3</span> · T/R 0 (receive) · SA 1 · WC 30
            <br />
            → BC → RT transfer of 30 data words to RT 3, subaddress 1
            <br />
            0x2C02 → RT 5, transmit, SA 0 → mode code 2 = Transmit Status Word
          </DataWell>
        </Section>

        <AdSlot id="mil-1553-command-word-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "RT address", value: "bits 15–11", note: "0–30, 31 = broadcast" },
              { name: "T/R", value: "bit 10", note: "1 transmit, 0 receive" },
              { name: "Subaddress", value: "bits 9–5", note: "0 or 31 → mode command" },
              { name: "Word count", value: "bits 4–0", note: "1–32 (field 0 → 32)" },
              { name: "Mode code", value: "bits 4–0", note: "when subaddress 0/31" },
              { name: "Parity", value: "odd", note: "over the 16 bits" },
            ]}
          />
        </Section>

        <Section title="C reference">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["mil-1553-status-word", "mil-1553-message-decoder", "mil-1553-mode-codes"]} />
      </ToolShell>
    </>
  );
}
