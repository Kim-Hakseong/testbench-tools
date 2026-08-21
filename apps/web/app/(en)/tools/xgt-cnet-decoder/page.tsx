import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { XgtCnetDecoderTool } from "@/components/tool/XgtCnetDecoderTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/xgt-cnet-decoder/" },
  title: "LS XGT Cnet Frame Decoder — fields and BCC check",
  description:
    "Free LS XGT Cnet frame decoder: split a dedicated-protocol frame into station, command, blocks and error code, and verify the BCC. 100% in your browser.",
  openGraph: { url: "/tools/xgt-cnet-decoder/",
    images: ["/og/xgt-cnet-decoder.png"], siteName: "TestBench.tools", title: "LS XGT Cnet Frame Decoder", description: "Decode XGT Cnet frames field by field and check the BCC.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "When does an XGT frame carry a BCC?",
    a: "Only when the command letter is lowercase. LS states it plainly: with a lowercase command the BCC is added to the frame check, with an uppercase one it is not. So r, w, x and y frames end with two extra characters and R, W, X and Y frames do not — the decoder flags a frame that breaks either half of that rule.",
  },
  {
    q: "How is the BCC calculated?",
    a: "Add every byte from the header through the tail, both included, and keep the low byte: for a request that is ENQ through EOT, for a response ACK or NAK through ETX. The result is written as two ASCII hex characters after the tail. It is a plain unsigned 8-bit sum — no XOR, no seed, no complement.",
  },
  {
    q: "My BCC looks wrong — what does the decoder show?",
    a: "Both numbers. It always computes what the BCC should be and shows it next to what was actually sent, so you can see whether the mismatch is a checksum bug or a byte that went missing earlier in the frame. A payload that does not add up still decodes into blocks rather than failing outright, so a data error never hides the checksum verdict.",
  },
  {
    q: "What do the command types SS and SB mean?",
    a: "SS is the individual form and SB the continuous form. R with SS reads named devices one by one, up to sixteen blocks; R with SB reads a run of words from one starting device. Write mirrors it. Bit devices cannot be read or written continuously.",
  },
  {
    q: "Where does the NAK error code sit?",
    a: "Between the command type and the ETX, as two hex bytes written as four ASCII characters. The decoder looks the code up in the published table, so 0011 reads as a data error and 1232 as a request beyond sixty words.",
  },
  {
    q: "Is my frame uploaded?",
    a: "No. Decoding runs entirely in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "LS XGT Cnet Frame Decoder", description: metadata.description!, slug: "xgt-cnet-decoder", faqs: FAQS })} />
      <ToolShell slug="xgt-cnet-decoder">
        <XgtCnetDecoderTool />
        <AdSlot id="xgt-cnet-decoder-results" />

        <AnswerBox>
          This tool decodes an LS ELECTRIC XGT Cnet dedicated-protocol frame.
          Paste it as hex bytes, as raw text, or with <code>&lt;ENQ&gt;</code>
          markers, and it separates the station, command, command type, data
          blocks and any error code — then verifies the BCC and tells you what it
          should have been. Reference: the frame summing to <code>03A4</code>{" "}
          carries BCC <code>A4</code>.
        </AnswerBox>

        <Section title="How it works">
          <p>
            An XGT frame is delimited by control characters — ENQ opens a
            request, EOT closes it, and a response opens with ACK or NAK and
            closes with ETX. Between them everything is ASCII: the station is two
            hex characters, the command is a single letter whose case decides
            whether a BCC follows, and the command type says whether the data
            area lists devices individually or describes one continuous run.
          </p>
          <p>
            The checksum is where most time gets lost, because two different
            mistakes look identical on an analyser. Either the sum is wrong, or
            the frame lost a byte and the sum is right for what remains. Showing
            the expected value beside the received one separates them
            immediately, which is why the decoder computes it even for frames
            that are not required to carry a BCC at all.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            05 32 30 72 53 53 30 31 30 36 25 4D 57 31 30 30 04 41 34
            <br />
            ENQ · station 20 · r SS · 1 block · size 06 · %MW100 · EOT
            <br />
            sum ENQ…EOT = 03A4 → low byte <span className="text-ok">A4</span>
            <br />
            lowercase r → BCC required · sent A4 → <span className="text-ok">matches</span>
          </DataWell>
        </Section>

        <AdSlot id="xgt-cnet-decoder-content" />

        <Section title="Frame fields">
          <ParamsTable
            rows={[
              { name: "ENQ / EOT", value: "0x05 / 0x04", note: "request delimiters" },
              { name: "ACK / NAK / ETX", value: "0x06 / 0x15 / 0x03", note: "response delimiters" },
              { name: "Station", value: "2 ASCII hex chars" },
              { name: "Command", value: "R W X Y", note: "lowercase adds a BCC" },
              { name: "Command type", value: "SS / SB", note: "individual / continuous" },
              { name: "Variable size", value: "character count of the name" },
              { name: "Error code", value: "4 ASCII chars", note: "NAK frames only" },
              { name: "BCC", value: "sum header…tail mod 256" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Source: LS ELECTRIC, Cnet I/F Module (XGL-C22A/C22B/CH2A/CH2B/C42A/C42B)
            User&apos;s Manual V3.3, Ch.7; BCC arithmetic from the XGB Cnet I/F
            User&apos;s Manual V2.0, §7.2.1.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["xgt-cnet-builder", "ls-xgt-address-converter", "modbus-frame-decoder"]} />
      </ToolShell>
    </>
  );
}
