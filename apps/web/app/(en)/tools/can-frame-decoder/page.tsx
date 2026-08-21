import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { CanFrameTool } from "@/components/tool/CanFrameTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/can-frame-decoder/" },
  title: "CAN Frame Decoder — ID, DLC, data breakdown",
  description:
    "Free online CAN 2.0 frame breakdown: identifier in hex/binary/decimal for 11- and 29-bit frames, DLC and data bytes, with range validation. 100% in your browser.",
  openGraph: { url: "/tools/can-frame-decoder/",
    images: ["/og/can-frame-decoder.png"], siteName: "TestBench.tools", title: "CAN Frame Decoder — ID, DLC, data breakdown", description: "CAN 2.0 identifier breakdown (11/29-bit), DLC and data bytes with validation.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What's the difference between 11-bit and 29-bit identifiers?",
    a: "CAN 2.0A uses an 11-bit identifier (0x000–0x7FF); CAN 2.0B extends it to 29 bits (0x00000000–0x1FFFFFFF) by adding an 18-bit extension. Both can coexist on one bus. Automotive OBD-II diagnostics, for example, conventionally uses 11-bit IDs like 0x7DF/0x7E8.",
  },
  {
    q: "Why does a lower identifier win arbitration?",
    a: "CAN bits are dominant (0) or recessive (1). During simultaneous transmission each node monitors the bus; a node sending recessive but reading dominant loses and backs off. Since the ID transmits MSB first, the numerically lowest identifier — the one with the earliest 0 — always wins. That is why the binary view here matters for priority planning.",
  },
  {
    q: "What is DLC exactly?",
    a: "The Data Length Code, 0–8 in classic CAN, declaring how many data bytes follow. This tool derives it from the bytes you enter. (CAN FD reuses DLC codes 9–15 for lengths up to 64 bytes — a different protocol generation.)",
  },
  {
    q: "What is an RTR frame?",
    a: "A remote frame: same identifier and DLC as a data frame but with the RTR bit recessive and no data field — it asks the producer of that identifier to transmit. Rarely used in modern designs, but still part of CAN 2.0.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Everything decodes locally in your browser.",
  },
];

const C_SNIPPET = `#include <stdint.h>

/* Typical received-frame struct on MCU CAN drivers */
typedef struct {
    uint32_t id;        /* 11-bit: 0..0x7FF, 29-bit: 0..0x1FFFFFFF */
    uint8_t  extended;  /* IDE flag */
    uint8_t  rtr;       /* remote frame */
    uint8_t  dlc;       /* 0..8 data bytes */
    uint8_t  data[8];
} can_frame_t;

int can_id_valid(const can_frame_t *f)
{
    return f->id <= (f->extended ? 0x1FFFFFFFu : 0x7FFu);
}`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "CAN Frame Decoder", description: metadata.description!, slug: "can-frame-decoder", faqs: FAQS })} />
      <ToolShell slug="can-frame-decoder">
        <CanFrameTool />
        <AdSlot id="can-frame-decoder-results" />

        <AnswerBox>
          This tool breaks a CAN 2.0 frame into its logical fields: the
          identifier rendered in hex, decimal and full-width binary (11- or
          29-bit), the DLC, and the data bytes — with validation of identifier
          range, data length and RTR consistency. The binary view exists for a
          reason: arbitration priority reads directly off those bits.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A classic CAN data frame carries an identifier (11-bit standard or
            29-bit extended, selected by the IDE bit), a 4-bit DLC declaring
            0–8 data bytes, the data itself and a CRC handled by the
            controller. The identifier doubles as the bus priority: IDs
            transmit MSB-first with dominant zeros, so the lowest number wins
            arbitration without any collision loss. This tool validates your
            fields against those structural rules and displays the identifier
            padded to its full bit width — the form you need when assigning
            priorities or configuring acceptance filters.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            ID 0x123 (standard) · data DE AD BE EF
            <br />
            binary <span className="text-ok">00100100011</span> (11-bit) · decimal 291 · DLC 4
            <br />
            0x0FF would beat 0x123 on the bus — earlier dominant bit
          </DataWell>
        </Section>

        <AdSlot id="can-frame-decoder-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Standard ID", value: "11-bit, 0x000 … 0x7FF" },
              { name: "Extended ID", value: "29-bit, 0 … 0x1FFFFFFF", note: "IDE bit set" },
              { name: "DLC", value: "0 … 8 bytes", note: "classic CAN 2.0" },
              { name: "Priority", value: "lower ID wins", note: "MSB-first, dominant 0" },
              { name: "RTR", value: "remote request", note: "no data field" },
            ]}
          />
        </Section>

        <Section title="C reference">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["can-bit-timing", "modbus-frame-decoder", "bit-field-extractor"]} />
      </ToolShell>
    </>
  );
}
