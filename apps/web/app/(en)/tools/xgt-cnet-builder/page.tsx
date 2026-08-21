import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { XgtCnetBuilderTool } from "@/components/tool/XgtCnetBuilderTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/xgt-cnet-builder/" },
  title: "LS XGT Cnet Frame Builder — RSS, RSB, WSS, WSB with BCC",
  description:
    "Free LS XGT Cnet frame builder: pick the command, station and devices and get the exact bytes, with the BCC computed and the command case handled for you. 100% in your browser.",
  openGraph: { url: "/tools/xgt-cnet-builder/",
    images: ["/og/xgt-cnet-builder.png"], siteName: "TestBench.tools", title: "LS XGT Cnet Frame Builder", description: "Build XGT Cnet request frames with the correct sizes and BCC.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Do I have to lowercase the command myself?",
    a: "No, and that is deliberate. The BCC toggle drives the letter case, because the two are the same decision: a lowercase command means the frame carries a BCC and an uppercase one means it does not. Tying them together makes it impossible to build the illegal combinations.",
  },
  {
    q: "What is the variable size field?",
    a: "The number of characters in the device name, not its byte width. %MW100 is six characters, so the size is 06; %MW000 is also six. The builder counts it for you, which removes the most common hand-assembly mistake.",
  },
  {
    q: "When do I use SS versus SB?",
    a: "SS reads or writes named devices individually — up to sixteen blocks in one frame, all of the same data type. SB works on a run: one starting device plus a count. Bit devices cannot be used with SB at all; the standard has no continuous bit transfer.",
  },
  {
    q: "How is write data formatted?",
    a: "As ASCII hex, most significant first, sized by the data type in the name. A word device takes four characters, so writing hFF to %MW230 sends 00FF. A bit is written as one byte, 00 or 01, and nothing else is accepted.",
  },
  {
    q: "How many words can one frame carry?",
    a: "Sixty, which is 120 bytes of payload. Requesting more earns error 1232 from the controller. The whole frame is capped at 256 bytes.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. The frame is assembled in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "LS XGT Cnet Frame Builder", description: metadata.description!, slug: "xgt-cnet-builder", faqs: FAQS })} />
      <ToolShell slug="xgt-cnet-builder">
        <XgtCnetBuilderTool />
        <AdSlot id="xgt-cnet-builder-results" />

        <AnswerBox>
          This tool assembles an LS ELECTRIC XGT Cnet request frame. Choose the
          command, the station and the devices, and it returns the exact
          characters and bytes to put on the wire — variable sizes counted, the
          BCC computed over the whole frame, and the command letter cased to
          match. Reference: reading <code>%MW100</code> from station 20 produces
          a frame whose BCC is <code>A4</code>.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Building an XGT frame by hand goes wrong in small, quiet ways. The
            variable size is a character count rather than a data width, so
            people write 02 for a word device. The BCC has to cover the ENQ and
            the EOT, which are easy to leave out of the sum. And the command
            letter&apos;s case is not cosmetic — it declares whether a BCC is
            present at all, so a lowercase letter with no checksum is as invalid
            as an uppercase one with a checksum appended.
          </p>
          <p>
            The builder derives all three from what you actually chose. Sizes are
            counted from the names you type, the BCC is summed across the
            finished frame including its delimiters, and the case follows the
            checksum toggle so the two can never contradict each other. What you
            get back is the frame as text, as a hex dump, and split into body and
            data area, so it can be compared against a capture field by field.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            command RSS · station 20 · %MW100 · BCC on
            <br />
            → 1 block · variable size 06 · lowercase r
            <br />
            frame: &lt;ENQ&gt;20rSS0106%MW100&lt;EOT&gt;A4
            <br />
            bytes: 05 32 30 72 53 53 30 31 30 36 25 4D 57 31 30 30 04 41 34
          </DataWell>
        </Section>

        <AdSlot id="xgt-cnet-builder-content" />

        <Section title="Commands">
          <ParamsTable
            rows={[
              { name: "RSS", value: "Read individually", note: "up to 16 blocks" },
              { name: "RSB", value: "Read continuously", note: "word devices only" },
              { name: "WSS", value: "Write individually", note: "one data type per frame" },
              { name: "WSB", value: "Write continuously", note: "max 60 words" },
              { name: "Lowercase r/w", value: "BCC appended" },
              { name: "Uppercase R/W", value: "no BCC" },
              { name: "Variable size", value: "character count", note: "%MW100 → 06" },
              { name: "Frame limit", value: "256 bytes" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Source: LS ELECTRIC, Cnet I/F Module (XGL-C22A/C22B/CH2A/CH2B/C42A/C42B)
            User&apos;s Manual V3.3, Ch.7; BCC arithmetic from the XGB Cnet I/F
            User&apos;s Manual V2.0, §7.2.1.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["xgt-cnet-decoder", "ls-xgt-address-converter", "custom-crc"]} />
      </ToolShell>
    </>
  );
}
