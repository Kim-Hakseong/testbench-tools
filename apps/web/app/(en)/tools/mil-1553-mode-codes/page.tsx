import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { Mil1553ModeCodesTool } from "@/components/tool/Mil1553ModeCodesTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/mil-1553-mode-codes/" },
  title: "MIL-STD-1553 Mode Codes — complete reference table",
  description:
    "All MIL-STD-1553B mode codes in one searchable table: code number, T/R bit, data-word rule and function, plus worked command-word examples. 100% in your browser.",
  openGraph: { url: "/tools/mil-1553-mode-codes/",
    images: ["/og/mil-1553-mode-codes.png"], siteName: "TestBench.tools", title: "MIL-STD-1553 Mode Codes — complete reference table", description: "Every defined MIL-STD-1553B mode code with T/R bit, data-word rule and function, plus worked command-word examples.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "When does a 1553 command carry a mode code?",
    a: "When the subaddress field is 0 or 31. That signals a mode command, so the last five bits of the command word are a mode code (0-31) rather than a word count. Mode commands manage the bus and terminals rather than moving payload data.",
  },
  {
    q: "How does the T/R bit affect a mode code?",
    a: "It selects which mode command a code means. Codes 0-15 are defined for T/R = 1 (transmit) and carry no data word. Codes 16-21 are associated with a data word and split by direction — for example code 17 (Synchronize with data word) uses T/R = 0, while code 16 (Transmit Vector Word) uses T/R = 1.",
  },
  {
    q: "Which mode codes have a data word?",
    a: "Codes with bit 4 set (16 and above): Transmit Vector Word (16), Synchronize with data word (17), Transmit Last Command (18), Transmit BIT Word (19), Selected Transmitter Shutdown (20) and its override (21). Codes 0-15 have no data word.",
  },
  {
    q: "What are the reserved codes?",
    a: "Codes 9-15 (no data word) and 22-31 (with data word) are reserved by MIL-STD-1553B and should not be used for custom functions. Encountering them in a capture usually points to a bit error or a non-conformant terminal.",
  },
  {
    q: "Which mode codes use T/R = 0 (receive)?",
    a: "Three of the data-word codes: Synchronize with data word (17), Selected Transmitter Shutdown (20) and Override Selected Transmitter Shutdown (21). In each case the bus controller sends a data word to the terminal, so the command is a receive from the RT's point of view. The other defined codes are transmit commands (T/R = 1).",
  },
  {
    q: "Is subaddress 0 different from subaddress 31?",
    a: "No — the standard designates both as mode-command indicators, and a terminal must decode either one the same way. Which of the two a given system uses is a program convention, so a capture may show either.",
  },
  {
    q: "How do I decode the rest of the command word?",
    a: "A 1553 command word is 16 bits: RT address (bits 15-11), T/R bit (bit 10), subaddress (bits 9-5) and word count or mode code (bits 4-0). The Command Word tool on this site breaks a hex word into those fields, and the Message Decoder handles full message sequences.",
  },
  {
    q: "Is this the official assignment?",
    a: "The table reflects the mode code assignments in the public MIL-STD-1553B standard. Always confirm against the controlling document for your program; some legacy systems restrict or extend the set.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "MIL-STD-1553B Mode Code Reference", description: metadata.description!, slug: "mil-1553-mode-codes", faqs: FAQS })} />
      <ToolShell slug="mil-1553-mode-codes">
        <Mil1553ModeCodesTool />
        <AdSlot id="mil-1553-mode-codes-results" />

        <AnswerBox>
          This is a searchable reference for MIL-STD-1553B mode codes — the
          command set that manages the bus rather than moving data. Filter by
          code or name to find the T/R bit, whether the command carries a data
          word, and its function. Mode commands are signalled by subaddress 0
          or 31; the five word-count bits then hold the mode code.
        </AnswerBox>

        <Section title="How it works">
          <p>
            When a command word&apos;s subaddress is 0 or 31, the terminal reads
            the last five bits as a mode code instead of a word count. The
            standard divides these into two groups: codes 0-15 command an
            action with no accompanying data word (Transmit Status Word, Reset
            Remote Terminal, Initiate Self-Test, and so on), while codes 16-21
            are paired with a single data word and are further distinguished by
            the T/R bit. Reserved codes fill the gaps.
          </p>
        </Section>

        <Section title="The defined codes at a glance">
          <p>
            Without a data word (codes 0–8, all T/R = 1): Dynamic Bus Control
            (0), Synchronize (1), Transmit Status Word (2), Initiate Self-Test
            (3), Transmitter Shutdown (4), Override Transmitter Shutdown (5),
            Inhibit Terminal Flag Bit (6), Override Inhibit Terminal Flag Bit
            (7) and Reset Remote Terminal (8).
          </p>
          <p>
            With a data word (codes 16–21): Transmit Vector Word (16, T/R 1),
            Synchronize with data word (17, T/R 0), Transmit Last Command Word
            (18, T/R 1), Transmit Built-In-Test Word (19, T/R 1), Selected
            Transmitter Shutdown (20, T/R 0) and its override (21, T/R 0).
            Everything else — 9–15 and 22–31 — is reserved.
          </p>
        </Section>

        <Section title="Worked examples">
          <DataWell>
            command 0x2C02 → RT 5, T/R 1, subaddress <span className="text-ok">0</span> → mode command
            <br />
            mode code 2, T/R 1 → <span className="text-ok">Transmit Status Word</span> (no data word)
          </DataWell>
          <DataWell>
            command 0x63F1 → RT 12, T/R 0, subaddress <span className="text-ok">31</span> → mode command
            <br />
            mode code 17, T/R 0 → <span className="text-ok">Synchronize (with data word)</span> — one data word follows
          </DataWell>
        </Section>

        <AdSlot id="mil-1553-mode-codes-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Trigger", value: "subaddress 0 or 31" },
              { name: "Codes 0–8", value: "T/R 1 · no data word", note: "bus / terminal management" },
              { name: "Codes 16–21", value: "with data word", note: "T/R selects direction" },
              { name: "Reserved", value: "9–15, 22–31" },
            ]}
          />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["mil-1553-command-word", "mil-1553-status-word", "mil-1553-message-decoder"]} />
      </ToolShell>
    </>
  );
}
