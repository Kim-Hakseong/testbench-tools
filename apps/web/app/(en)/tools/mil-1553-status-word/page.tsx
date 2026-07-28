import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { Mil1553StatusTool } from "@/components/tool/Mil1553StatusTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/mil-1553-status-word/" },
  title: "MIL-STD-1553B Status Word Decoder — RT address & flag bits",
  description:
    "Free online MIL-STD-1553B status word decoder: RT address plus Message Error, Service Request, Busy, Terminal Flag and every status bit. 100% in your browser.",
  openGraph: { title: "MIL-STD-1553B Status Word Decoder", description: "Decode 1553B status words: RT address and every status flag bit.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What fields make up a 1553B status word?",
    a: "Bits 15-11 are the responding RT's address; the remaining bits are status flags: Message Error (10), Instrumentation (9, reserved 0), Service Request (8), three reserved bits (7-5), Broadcast Command Received (4), Busy (3), Subsystem Flag (2), Dynamic Bus Control Acceptance (1) and Terminal Flag (0).",
  },
  {
    q: "How do I tell a status word from a command word?",
    a: "You can't from the 16 bits alone — both share the same command/status sync on the wire, and the RT address occupies the same top 5 bits. Context in the message tells you: an RT transmits its status word in response to a valid command. The Instrumentation bit (bit 9) is fixed at 0 in status words, which some systems use as an aid.",
  },
  {
    q: "What does the Message Error bit indicate?",
    a: "The RT sets Message Error when it detects a problem with the command or data it received — a parity error, an invalid word, an illegal command or a word-count mismatch. It tells the bus controller the last transfer to that RT should not be trusted.",
  },
  {
    q: "What are the Busy and Service Request bits for?",
    a: "Busy signals the RT cannot move data to or from the subsystem right now (it is discouraged in newer designs). Service Request is a general-purpose flag asking the bus controller for attention — typically to schedule a transfer the RT wants to perform.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. Decoding runs entirely in your browser.",
  },
];

const C_SNIPPET = `#include <stdint.h>
#include <stdbool.h>

/* Extract the common MIL-STD-1553B status flags */
uint8_t rt_address(uint16_t s) { return (s >> 11) & 0x1F; }
bool message_error(uint16_t s) { return (s >> 10) & 1; }
bool service_req  (uint16_t s) { return (s >>  8) & 1; }
bool busy         (uint16_t s) { return (s >>  3) & 1; }
bool terminal_flag(uint16_t s) { return  s        & 1; }
/* 0x1808 -> RT 3, Busy set */`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "MIL-STD-1553B Status Word Decoder", description: metadata.description!, slug: "mil-1553-status-word", faqs: FAQS })} />
      <ToolShell slug="mil-1553-status-word">
        <Mil1553StatusTool />
        <AdSlot id="mil-1553-status-word-results" />

        <AnswerBox>
          This tool decodes a MIL-STD-1553B status word: enter the 16-bit hex
          value and it breaks out the responding RT address and the state of
          every status flag — Message Error, Service Request, Busy, Subsystem
          Flag, Terminal Flag and the rest — with the odd-parity bit. Reference:{" "}
          <code>0x1800</code> = RT 3, all flags clear; <code>0x1808</code> adds
          the Busy bit.
        </AnswerBox>

        <Section title="How it works">
          <p>
            An RT answers a valid command by transmitting its status word. The
            top five bits echo the RT&apos;s own address so the bus controller
            can confirm the right terminal responded; the lower eleven bits are
            a fixed set of condition flags defined by MIL-STD-1553B. Because a
            status word shares the same sync and address layout as a command
            word, the message context — not the bits — tells you which it is.
            The Instrumentation bit (bit 9) is held at 0 in status words.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            0x1808 = 0001 1000 0000 1000
            <br />
            RT address <span className="text-ok">3</span> · Busy bit (3) <span className="text-ok">set</span>
            <br />
            all other flags 0 · odd parity 0
          </DataWell>
        </Section>

        <AdSlot id="mil-1553-status-word-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "RT address", value: "bits 15–11" },
              { name: "Message Error", value: "bit 10" },
              { name: "Service Request", value: "bit 8" },
              { name: "Broadcast Received", value: "bit 4" },
              { name: "Busy", value: "bit 3" },
              { name: "Subsystem Flag", value: "bit 2" },
              { name: "Dynamic Bus Control Acc.", value: "bit 1" },
              { name: "Terminal Flag", value: "bit 0" },
            ]}
          />
        </Section>

        <Section title="C reference">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["mil-1553-command-word", "mil-1553-message-decoder", "mil-1553-mode-codes"]} />
      </ToolShell>
    </>
  );
}
