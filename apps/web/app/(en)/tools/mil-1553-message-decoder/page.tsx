import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { Mil1553MessageTool } from "@/components/tool/Mil1553MessageTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/mil-1553-message-decoder/" },
  title: "MIL-STD-1553B Message Decoder — command, data, status layout",
  description:
    "Free online MIL-STD-1553B message decoder: paste the words of a transfer and see each word's role — command, data or status — laid out with fields and parity. 100% in your browser.",
  openGraph: {
    images: ["/og/mil-1553-message-decoder.png"], siteName: "TestBench.tools", title: "MIL-STD-1553B Message Decoder", description: "Lay out a full 1553B transaction: command, data words and status, with roles and parity.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "How does the decoder know each word's role?",
    a: "It treats the first word as the command word and derives the transfer format from its T/R bit and subaddress. A receive command (T/R = 0) lays out command → data words → status; a transmit command (T/R = 1) lays out command → status → data words; mode commands follow their own short formats. The word count in the command tells it how many data words to expect.",
  },
  {
    q: "Which transfer formats are supported?",
    a: "BC-to-RT (receive), RT-to-BC (transmit), and mode commands with or without a data word, including broadcast (RT address 31, no status word returned). RT-to-RT transfers use two command words and are not auto-laid-out here — decode their command words individually with the command word tool.",
  },
  {
    q: "Why does it flag a word-count mismatch?",
    a: "The command word declares how many data words the transfer carries, which fixes the total word count for the message. If the number of words you paste does not match that expectation, the decoder says so — a quick way to spot a dropped or extra word in a capture.",
  },
  {
    q: "How are data words interpreted?",
    a: "Data words are 16-bit payload with no protocol-level structure, so the decoder shows the raw value and its signed 16-bit interpretation. What the bits actually mean is defined by the subsystem's interface control document, not by 1553 itself.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. The whole transfer is decoded locally in your browser.",
  },
];

const C_SNIPPET = `/* BC -> RT receive transfer layout (word count N):
 *   [0] command   (T/R = 0)
 *   [1..N] data words
 *   [N+1] RT status word
 *
 * RT -> BC transmit transfer:
 *   [0] command   (T/R = 1)
 *   [1] RT status word
 *   [2..N+1] data words
 *
 * The command word's WC field (0 => 32) sets N. */`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "MIL-STD-1553B Message Decoder", description: metadata.description!, slug: "mil-1553-message-decoder", faqs: FAQS })} />
      <ToolShell slug="mil-1553-message-decoder">
        <Mil1553MessageTool />
        <AdSlot id="mil-1553-message-decoder-results" />

        <AnswerBox>
          This tool lays out a whole MIL-STD-1553B transfer. Paste the 16-bit
          words of a message — the first is the command — and it assigns each
          word its role (command, data or status), decodes the command and
          status fields, and checks that the word count matches the layout.
          Reference: <code>2822 1234 5678 2800</code> decodes as a BC → RT
          transfer of two data words to RT 5.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A 1553 message is an ordered sequence of words whose roles are
            fixed by the leading command word. The decoder reads that command —
            its T/R direction, subaddress and word count — and builds the
            expected role sequence: receive transfers put the data words
            between the command and the RT&apos;s status; transmit transfers put
            the status first; mode commands use their own short forms. Mapping
            your pasted words onto that sequence turns a raw hex dump into a
            readable transaction, and a length check catches missing or extra
            words.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            words: 2822 1234 5678 2800
            <br />
            [1] 0x2822 command → RT 5, receive, SA 1, WC 2
            <br />
            [2] 0x1234 data · [3] 0x5678 data
            <br />
            [4] 0x2800 status → RT 5 · <span className="text-ok">layout matches (BC → RT)</span>
          </DataWell>
        </Section>

        <AdSlot id="mil-1553-message-decoder-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "BC → RT (receive)", value: "command · data×WC · status" },
              { name: "RT → BC (transmit)", value: "command · status · data×WC" },
              { name: "Mode (no data)", value: "command · status" },
              { name: "Broadcast", value: "RT 31 · no status word" },
              { name: "Word count", value: "from command", note: "field 0 → 32" },
            ]}
          />
        </Section>

        <Section title="Transfer formats">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["mil-1553-command-word", "mil-1553-status-word", "mil-1553-mode-codes"]} />
      </ToolShell>
    </>
  );
}
