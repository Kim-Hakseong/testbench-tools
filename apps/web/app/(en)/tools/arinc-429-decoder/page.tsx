import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { Arinc429Tool } from "@/components/tool/Arinc429Tool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/arinc-429-decoder/" },
  title: "ARINC 429 Word Decoder — label, SDI, SSM, BNR/BCD, parity",
  description:
    "Free ARINC 429 word decoder: octal label with both bit-order readings, SDI, SSM, BNR and BCD data and an odd-parity check. 100% in your browser.",
  openGraph: { url: "/tools/arinc-429-decoder/",
    images: ["/og/arinc-429-decoder.png"], siteName: "TestBench.tools",
    title: "ARINC 429 Word Decoder",
    description: "Decode a 32-bit ARINC 429 word field by field, with both label bit-order conventions shown.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "Why does my label read 205 in one tool and 241 in another?",
    a: "Because the two tools number the label bits in opposite directions, and the readings are bit-reverses of each other. Public sources genuinely disagree: some annotate word bit 1 as the label's most significant bit, others put the MSB at bit 8. Both describe the same sequence on the wire — the difference only appears once you write the word as a hex number. This decoder shows both readings on every word so you can match whichever your equipment documentation uses.",
  },
  {
    q: "How is an ARINC 429 word laid out?",
    a: "Thirty-two bits, numbered from 1: label in bits 1-8, SDI in bits 9-10, data in bits 11-29, SSM in bits 30-31 and odd parity in bit 32. Bit 1 goes out first, and the label is the one field whose bits are ordered opposite to the rest — which is exactly why its octal reading is contested.",
  },
  {
    q: "What does the SSM mean?",
    a: "It depends on the data format, which is why there is no single table. For BNR it reports failure warning, no computed data, functional test or normal operation; for BCD it carries sign and direction (plus/north/east versus minus/south/west) alongside the same failure states; discrete words use their own reading. Tell the tool which format your parameter uses and it shows that one, otherwise it shows the alternatives rather than guessing.",
  },
  {
    q: "Why do I have to enter the full-scale range myself?",
    a: "Because a BNR field carries no units. The 19 data bits are a signed two's-complement number whose meaning comes from the parameter's full-scale range, published in the equipment's interface control document. The decoder gives you the raw signed value and applies whatever scale you supply.",
  },
  {
    q: "Why is there no table of what each label means?",
    a: "Label assignments live in the ARINC 429 specification and in per-aircraft interface control documents, which are paid, controlled documents. Publishing a guessed table would produce silently wrong readings, so this tool reports the octal label and leaves the meaning to your ICD. The same applies to equipment IDs.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. The word is decoded entirely in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "ARINC 429 Word Decoder", description: metadata.description!, slug: "arinc-429-decoder", faqs: FAQS })} />
      <ToolShell slug="arinc-429-decoder">
        <Arinc429Tool />
        <AdSlot id="arinc-429-decoder-results" />

        <AnswerBox>
          This tool decodes a 32-bit ARINC 429 word. Paste it as hex and it
          returns the octal label — under both bit-order conventions, because
          published sources disagree — plus the SDI, the SSM read for your data
          format, the BNR and BCD views of the data field, and an odd-parity
          check on bit 32. Reference: <code>0xE00640A1</code> decodes field by
          field with valid parity.
        </AnswerBox>

        <Section title="How it works">
          <p>
            An ARINC 429 word is thirty-two bits with a fixed map: label, source
            or destination identifier, data, sign/status matrix, parity. Bit 1
            leaves first, and the label leaves ahead of everything else. What
            makes the label awkward is that its bits run in the opposite
            direction to every other field, so writing the word as a hex number
            forces a choice about which end of the label byte is most
            significant — and the public documentation splits on that choice.
          </p>
          <p>
            Rather than pick one and hope, this decoder treats it as a setting
            and always prints the other reading beside the answer. If your
            analyser says 205 and your ICD says 241, that is not a fault in
            either: they are the same eight bits counted from opposite ends. The
            same restraint governs the rest of the tool — the SSM is only
            interpreted once you say whether the parameter is BNR, BCD or
            discrete, and the BNR value stays raw until you supply the
            full-scale range that gives it units.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            0xE00640A1 → 32 bits, bit 32 first
            <br />
            P 1 · SSM 11 · data 0000000011001000000 · SDI 10 · label 10100001
            <br />
            parity <span className="text-ok">valid</span> (odd across all 32 bits)
            <br />
            label reads one way as 205, the other as 241
            <br />
            BNR 512 full scale → <span className="text-ok">268</span>
          </DataWell>
        </Section>

        <AdSlot id="arinc-429-decoder-content" />

        <Section title="Word fields">
          <ParamsTable
            rows={[
              { name: "Bits 1–8", value: "Label", note: "octal, bit order contested" },
              { name: "Bits 9–10", value: "SDI", note: "source/destination" },
              { name: "Bits 11–29", value: "Data", note: "BNR or BCD" },
              { name: "Bit 29", value: "BNR sign", note: "1 = negative" },
              { name: "Bits 30–31", value: "SSM", note: "meaning follows the format" },
              { name: "Bit 32", value: "Parity", note: "odd, over all 32 bits" },
              { name: "BCD", value: "5 digits", note: "top digit is 3 bits" },
              { name: "Bit rate", value: "12.5 or 100 kbit/s" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Field map and parity cross-checked against the AIM ARINC 429 tutorial,
            the GE Intelligent Platforms / Condor-Ballard protocol tutorial, and
            the Holt HI-35850 datasheet. Label assignments and equipment IDs are
            deliberately not published here — they live in the paid specification
            and in per-aircraft interface control documents.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["mil-1553-command-word", "bit-field-extractor", "twos-complement"]} />
      </ToolShell>
    </>
  );
}
