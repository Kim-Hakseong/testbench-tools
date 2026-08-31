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
    "Free online MIL-STD-1553 decoder: paste the words of a bus capture and see each word's role — command, data or status — laid out with decoded fields and parity. 100% in your browser.",
  openGraph: { url: "/tools/mil-1553-message-decoder/",
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
    q: "What do the status word bits tell me?",
    a: "The status word repeats the responding RT's address in bits 15-11 and then reports its condition: message error (bit 10), service request (bit 8), broadcast command received (bit 4), busy (bit 3), subsystem flag (bit 2), dynamic bus control acceptance (bit 1) and terminal flag (bit 0). Bit 9 (instrumentation) and bits 7-5 are reserved and normally zero. A status word of 0x2800 is therefore RT 5 answering with every flag clear — a healthy response.",
  },
  {
    q: "My capture starts in the middle of a message — what happens?",
    a: "The decoder always treats the first word you paste as the command word, so a capture that begins on a data word will be laid out against the wrong template. The word-count check is what usually reveals it: the expected and actual word counts disagree. Trim the capture back to the command word — the one whose bits 15-11 hold the RT address you expect — and decode again.",
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
          <p>
            The same RT reading data back inverts the order, because a transmit
            command puts the RT&apos;s status word before its data:
          </p>
          <DataWell>
            words: 2C22 2800 1234 5678
            <br />
            [1] 0x2C22 command → RT 5, transmit, SA 1, WC 2
            <br />
            [2] 0x2800 status → RT 5
            <br />
            [3] 0x1234 data · [4] 0x5678 data ·{" "}
            <span className="text-ok">layout matches (RT → BC)</span>
          </DataWell>
          <p>
            Only bit 10 differs between <code>0x2822</code> and{" "}
            <code>0x2C22</code> — the T/R bit. That single bit is what reorders
            the whole transfer, which is why a capture decoded against the wrong
            direction looks like the data and status words swapped places.
          </p>
        </Section>

        <Section title="Decoding a 1553 capture">
          <p>
            Bus analysers hand you a flat list of 16-bit words with no
            annotation, and nothing inside a word says whether it is a command,
            a data word or a status word — only its position within a transfer
            does. Decoding therefore always starts at a command word: it names
            the RT, the direction, the subaddress and how many data words
            follow, and everything after it is fixed by that declaration.
          </p>
          <p>
            Split a long capture into transfers before pasting. Each transfer
            begins at a command word and ends after the word count this tool
            reports as expected; the next command word starts the next message.
            If a transfer comes up short or long, that boundary is where a
            dropped word or a bus error sits. Mode commands (subaddress 0 or 31)
            are the exception to the word-count rule — their low five bits carry
            a mode code rather than a count. Codes 0–8 (dynamic bus control
            through reset remote terminal) carry no data word, so the transfer
            is just command and status; codes 16–21 carry exactly one.
          </p>
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
