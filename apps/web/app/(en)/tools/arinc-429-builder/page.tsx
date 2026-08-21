import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { Arinc429BuilderTool } from "@/components/tool/Arinc429BuilderTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/arinc-429-builder/" },
  title: "ARINC 429 Word Builder — label, SDI, SSM, data, parity computed",
  description:
    "Free ARINC 429 word builder: enter an octal label, SDI, SSM and data and get the 32-bit word with odd parity computed for you. 100% in your browser.",
  openGraph: { url: "/tools/arinc-429-builder/",
    images: ["/og/arinc-429-builder.png"], siteName: "TestBench.tools",
    title: "ARINC 429 Word Builder",
    description: "Build a 32-bit ARINC 429 word with correct parity, and see how it decodes back.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "Do I set the parity bit myself?",
    a: "No, and you cannot. Bit 32 is computed from the other 31 bits every time, so there is no input for it and no way to emit a word whose parity is wrong. Parity on ARINC 429 is odd across the whole word.",
  },
  {
    q: "Which label bit order should I choose?",
    a: "Whichever your equipment documentation uses. Public sources number the label bits in opposite directions, so the same octal label produces two different words depending on the convention. The builder shows the other reading beside the result, so you can confirm you picked the one your ICD means before putting the word on a bus.",
  },
  {
    q: "What goes in the data field?",
    a: "For BNR, a signed value occupying bits 29 to 11, where bit 29 is the sign — the scale that turns it into knots or degrees comes from the parameter's full-scale range in your ICD, not from the word. For BCD, up to five digits with the most significant one limited to three bits. Switching format changes the input accordingly.",
  },
  {
    q: "Why does the SSM list change with the format?",
    a: "Because the sign/status matrix means different things per data type. BNR reports failure warning, no computed data, functional test or normal operation; BCD carries sign and direction alongside the same failure states; discrete words use their own reading. The dropdown shows the readings for the format you selected rather than one merged list.",
  },
  {
    q: "Can I look up what a label means?",
    a: "Not here. Label assignments live in the ARINC 429 specification and in per-aircraft interface control documents, which are controlled, paid documents. Publishing a guessed table would produce words that look right and are not, so the builder takes the octal label you supply and leaves the meaning to your ICD.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. The word is assembled in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "ARINC 429 Word Builder", description: metadata.description!, slug: "arinc-429-builder", faqs: FAQS })} />
      <ToolShell slug="arinc-429-builder">
        <Arinc429BuilderTool />
        <AdSlot id="arinc-429-builder-results" />

        <AnswerBox>
          This tool assembles a 32-bit ARINC 429 word. Enter the octal label, the
          SDI, the SSM for your data type and the data itself, and it returns the
          word in hex with odd parity already computed — then decodes it straight
          back so you can check the fields landed where you meant. Reference:
          label 205 with BNR data 400 and SSM 3 builds a word whose parity is
          fixed for you.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Assembling a 429 word by hand goes wrong in two places. The first is
            parity: it is odd across all thirty-two bits, so it depends on every
            other field and has to be recomputed whenever any of them changes.
            This builder computes it rather than accepting it, which means a word
            with the wrong parity is not something it can produce.
          </p>
          <p>
            The second is the label. Its bits run opposite to the rest of the
            word, and published sources disagree about which end holds the octal
            number&apos;s most significant bit — so the same label builds two
            different words depending on the convention. Rather than pick one
            quietly, the builder makes it a choice and prints the other reading
            beside the result. Decoding the built word back on the spot is the
            cheapest way to confirm you chose correctly before anything reaches a
            bus.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            label 205 · SDI 2 · SSM 3 (Normal Operation) · BNR data 400
            <br />
            → parity computed on bit 32
            <br />
            decodes back as label <span className="text-ok">205</span>, SDI 2, SSM 3
            <br />
            same bits read the other way round → label 241
          </DataWell>
        </Section>

        <AdSlot id="arinc-429-builder-content" />

        <Section title="Fields you supply">
          <ParamsTable
            rows={[
              { name: "Label", value: "3-digit octal", note: "bit order is a choice" },
              { name: "SDI", value: "0–3", note: "bits 9–10" },
              { name: "Data", value: "bits 11–29", note: "BNR signed, bit 29 is sign" },
              { name: "BCD", value: "up to 5 digits", note: "top digit is 3 bits" },
              { name: "SSM", value: "0–3", note: "meaning follows the format" },
              { name: "Parity", value: "computed", note: "odd, not an input" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Field map and parity cross-checked against the AIM ARINC 429 tutorial,
            the GE Intelligent Platforms / Condor-Ballard protocol tutorial, and
            the Holt HI-35850 datasheet. Label assignments and equipment IDs are
            deliberately not published here.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["arinc-429-decoder", "mil-1553-command-word", "bit-field-extractor"]} />
      </ToolShell>
    </>
  );
}
