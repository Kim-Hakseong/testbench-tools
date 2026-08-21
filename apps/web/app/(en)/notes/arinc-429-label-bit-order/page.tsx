import type { Metadata } from "next";
import { Callout, H2, NoteShell, P, Quoted } from "@/components/notes/NoteShell";
import { Figure, WordLayout } from "@/components/notes/Figure";
import { parseArinc429 } from "@testbench/engine";
import { JsonLd, noteJsonLd } from "@/lib/jsonld";
import { noteBySlug } from "@/content/notes";

const NOTE = noteBySlug("arinc-429-label-bit-order")!;

// The bit string comes out of the decoder itself, so the diagram is the word
// the tool actually reports rather than one typed out by hand.
const W = parseArinc429("0xE00640A1", { labelBitOrder: "bit1-msb" });
const BITS = W.ok ? W.word.bits : "";
const FIELDS = [
  { label: "P", bits: BITS.slice(0, 1), span: 1 },
  { label: "SSM", bits: BITS.slice(1, 3), span: 2 },
  { label: "Data 29-11", bits: BITS.slice(3, 22), span: 19 },
  { label: "SDI", bits: BITS.slice(22, 24), span: 2 },
  { label: "Label 8-1", bits: BITS.slice(24, 32), span: 8 },
];

export const metadata: Metadata = {
  alternates: { canonical: "/notes/arinc-429-label-bit-order/" },
  title: "The same ARINC 429 word is label 205 and label 241",
  description:
    "ARINC 429 label bits are numbered in opposite directions by different published sources, so one word yields two different octal labels. Why both are defensible, and how to tell which one your tool means.",
  openGraph: { url: "/notes/arinc-429-label-bit-order/",
    images: ["/og/note-arinc-429-label-bit-order.png"],
    siteName: "TestBench.tools",
    type: "article",
    publishedTime: NOTE.published,
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={noteJsonLd(NOTE)} />
      <NoteShell slug={NOTE.slug}>
        <P>
          Take the 32-bit word <code>0xE00640A1</code>. Its label field — bits 1 through 8 —
          holds the bit pattern <code>10100001</code>. Ask one decoder what the label is and
          it says <strong>205</strong>. Ask another and it says <strong>241</strong>. Both
          have the same eight bits in front of them, and neither is malfunctioning.
        </P>

        <P>
          This costs people hours, because every instinct says one of the two must be a bug.
          It is not. The disagreement is in the documentation, and it does not resolve by
          reading more of it.
        </P>

        <H2>What is actually in dispute</H2>

        <P>
          Nothing about the wire. The sequence of ones and zeros a transmitter puts on the bus
          is the same under both readings. What differs is which end of the label field is
          called the most significant bit — and therefore what octal number those eight bits
          spell.
        </P>

        <P>
          Read <code>10100001</code> with the MSB at bit 8 and you get octal 241. Read the same
          field with the MSB at bit 1 — that is, reverse it to <code>10000101</code> — and you
          get octal 205. One field, two numbers, no contradiction in the bits themselves.
        </P>

        <Figure caption="0xE00640A1 laid out as the fields everyone agrees on. Only the last block is disputed: read 10100001 from the left and it is 241, read it from the right and it is 205.">
          <WordLayout
            fields={FIELDS}
            ariaLabel="A 32-bit ARINC 429 word shown as five fields from bit 32 down to bit 1: one parity bit, two SSM bits, nineteen data bits, two SDI bits, and the eight label bits 1 to 8 holding the pattern 10100001."
          />
        </Figure>

        <H2>Both conventions are published</H2>

        <P>
          <strong>MSB at bit 1.</strong> Holt's bit-mapping table for the HI-35850 annotates
          ARINC bit 1 as “Label (MSB)”. Holt and Wikipedia both give the same worked example:
        </P>

        <Quoted>
          to transmit a Label 213 octal (or 8B hex) the bit-reversed value D1 hex is written
          to the Label octet
        </Quoted>

        <P>
          Most software decoders you will meet do this, which is why it is the default here.
        </P>

        <P>
          <strong>MSB at bit 8.</strong> The transmission order published by AIM, GE/Ballard
          and MaxT is bits 8, 7, 6, 5, 4, 3, 2, 1, then 9, 10, … 32 — label MSB first. Under
          that ordering the label octet reads directly as the octal number, with no reversal.
          GE's tabulated discrete word backs it up concretely: it spells out label 005 as bit
          1 set and bit 3 set.
        </P>

        <Callout>
          These are not two descriptions of one convention. They are two conventions, each
          internally consistent, each with worked examples in vendor documentation. Picking
          one because it appeared in more search results is guessing.
        </Callout>

        <H2>What everyone does agree on</H2>

        <P>
          It is worth being precise about how narrow the disagreement is, because it is easy to
          conclude the whole standard is unreliable. It is not.
        </P>

        <P>
          The field layout is unanimous across AIM, GE, MaxT, Holt and Wikipedia: bits 1–8
          label, 9–10 SDI, 11–29 data, 30–31 SSM, 32 parity. Parity is unanimous: odd, on bit
          32 — GE states it as “if bits 1–31 contain an even number of 1 bits, bit 32 must be
          set to create ODD parity”. SSM index construction is unanimous. BNR negatives are
          two's complement in both AIM and GE.
        </P>

        <P>
          One field's bit numbering is in dispute. Everything else lines up.
        </P>

        <H2>How to tell which one you need</H2>

        <P>
          Not by reasoning about it — by testing against something you already know. Two ways
          that work:
        </P>

        <P>
          <strong>Use a label from your own ICD.</strong> If your interface document says a
          particular parameter is label 203, capture that word and decode it both ways. One
          reading gives 203; that is your convention. This is the reliable method, because it
          settles the question with your equipment rather than with someone's datasheet.
        </P>

        <P>
          <strong>Decode a whole capture, not one word.</strong> A real bus carries a small
          set of labels repeating at fixed rates, not arbitrary values. Decode the entire
          capture both ways and compare each resulting set against the label list in your
          ICD — one reading will produce labels that are on the list and the other will
          produce labels that are not. A set is far more decisive than a single word, because
          a single word looks equally plausible either way.
        </P>

        <P>
          Two things that do not work. Hoping an invalid label gives it away: reversing eight
          bits produces another eight-bit value, so both readings are always a legal
          three-digit octal label and there is no illegal case to catch the wrong convention.
          And assuming the tool that produced the capture and the tool reading it share a
          convention — they frequently do not, and neither will say so.
        </P>

        <H2>Why the decoder here shows both</H2>

        <P>
          Because the alternative is silently picking one, and a decoder that silently picks a
          side is worse than useless when the value does not match: you have no way to tell
          whether your word is wrong, your ICD is wrong, or the tool just numbers bits the
          other way.
        </P>

        <P>
          So the bit order is a setting, and every decoded word carries the other reading next
          to the chosen one. <code>0xE00640A1</code> reports label 205 with the note that read
          the other way it is 241 — and the same word under the other setting reports 241 with
          205 alongside. The builder does the same, so a word you construct can be checked
          against whichever numbering the receiving equipment uses.
        </P>

        <P>
          The label-to-meaning tables are a separate matter and are deliberately not
          implemented. Those live in ARINC's paid specifications and in per-aircraft interface
          documents; a decoder that guesses at them would be plausibly wrong, which is the
          worst thing an engineering tool can be.
        </P>
      </NoteShell>
    </>
  );
}
