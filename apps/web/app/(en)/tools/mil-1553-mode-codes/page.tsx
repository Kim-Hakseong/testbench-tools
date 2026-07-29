import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { Mil1553ModeCodesTool } from "@/components/tool/Mil1553ModeCodesTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/mil-1553-mode-codes/" },
  title: "MIL-STD-1553B Mode Code Reference — searchable table",
  description:
    "Free searchable MIL-STD-1553B mode code reference: code, T/R bit, data-word rule and function for every defined mode command. 100% in your browser.",
  openGraph: {
    images: ["/og/mil-1553-mode-codes.png"], siteName: "TestBench.tools", title: "MIL-STD-1553B Mode Code Reference", description: "Searchable table of MIL-STD-1553B mode codes: T/R bit, data-word rule and function.", type: "website" },
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

        <Section title="Worked example">
          <DataWell>
            command 0x2C02 → RT 5, T/R 1, subaddress <span className="text-ok">0</span> → mode command
            <br />
            mode code 2, T/R 1 → <span className="text-ok">Transmit Status Word</span> (no data word)
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
