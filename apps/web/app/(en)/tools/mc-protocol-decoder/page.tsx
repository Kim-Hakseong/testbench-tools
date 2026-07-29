import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { McProtocolTool } from "@/components/tool/McProtocolTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/mc-protocol-decoder/" },
  title: "Mitsubishi MC Protocol Decoder — 3E frame, ASCII and binary",
  description:
    "Free MELSEC MC Protocol 3E frame decoder: access route, command, device and points, in both ASCII and binary code. 100% in your browser.",
  openGraph: {
    images: ["/og/mc-protocol-decoder.png"], siteName: "TestBench.tools", title: "Mitsubishi MC Protocol Decoder", description: "Decode MC Protocol 3E frames field by field, ASCII or binary.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why does my binary frame decode to the wrong device?",
    a: "Almost always because of the field order, which is not the same in the two codes. In ASCII the device code comes before the device number; in binary the number comes first and the code follows it. Swap them and D100 turns into something else entirely, which is the single most common MC Protocol bug.",
  },
  {
    q: "Which fields are little-endian?",
    a: "In binary code, every multi-byte numeric field: the request destination module I/O number, the request data length, the monitoring timer, the command, the subcommand, the point count, the device number and the end code. Only the subheader is sent as two plain bytes (50H 00H) rather than as a value. ASCII code is the opposite — each field is written as hex digits, upper digit first.",
  },
  {
    q: "What does subcommand 0000 versus 0002 mean?",
    a: "Which controller family you are talking to. Use 0000 for word units and 0001 for bit units on MELSEC-Q and MELSEC-L; use 0002 and 0003 for MELSEC iQ-R and iQ-L. The iQ-R forms also widen the device fields — four ASCII characters or two binary bytes for the device code, and eight digits or four bytes for the device number.",
  },
  {
    q: "What does the request data length count?",
    a: "Everything from the monitoring timer to the end of the request data. In binary that is a byte count; in ASCII it counts transmitted characters. The decoder shows the declared value beside what the frame actually carries, so a truncated capture is obvious.",
  },
  {
    q: "Why is there no table of end codes?",
    a: "Because the protocol manuals do not publish one — they explicitly redirect to the manual of the module in use. The decoder therefore reports the end code and whether it means normal completion, plus the command and subcommand echoed back in the error information, and leaves the meaning to your module's documentation.",
  },
  {
    q: "Is my frame uploaded?",
    a: "No. Decoding runs entirely in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Mitsubishi MC Protocol Decoder", description: metadata.description!, slug: "mc-protocol-decoder", faqs: FAQS })} />
      <ToolShell slug="mc-protocol-decoder">
        <McProtocolTool />
        <AdSlot id="mc-protocol-decoder-results" />

        <AnswerBox>
          This tool decodes a MELSEC MC Protocol 3E frame in either ASCII or
          binary code. It separates the subheader, the access route, the request
          data length and the monitoring timer, then names the command and
          subcommand, decodes the device and point count, and for responses
          reports the end code. Reference: the frame{" "}
          <code>500000FF03FF000018000A04010000D*0000000005</code> reads five
          words from D0.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A 3E frame is a fixed header followed by request data. The header
            never changes shape: subheader, then the access route that says which
            station and module the request is for, then how long the rest is and
            how long the CPU may take. What follows is the command, the
            subcommand and the device being addressed.
          </p>
          <p>
            The part that catches people is that the same frame is written two
            different ways. Binary code sends multi-byte numbers low byte first,
            while ASCII code writes them as hex digits with the upper digit
            first — so the bytes appear reversed between the two. Worse, the
            device code and the device number swap places: ASCII puts the code
            first, binary puts the number first. A decoder that assumes one order
            silently misreads the other, which is why this one asks which code
            you are looking at before it reads anything.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            5000 · subheader, request
            <br />
            00 FF 03FF 00 · access route — host station
            <br />
            0018 · 24 characters follow the length field
            <br />
            000A · monitoring timer 10 × 250 ms = 2.5 s
            <br />
            0401 0000 · batch read, word units, MELSEC-Q/L
            <br />
            D* 000000 0005 → <span className="text-ok">D0, 5 words</span>
          </DataWell>
        </Section>

        <AdSlot id="mc-protocol-decoder-content" />

        <Section title="3E frame fields">
          <ParamsTable
            rows={[
              { name: "Subheader", value: "5000H request / D000H response" },
              { name: "Access route", value: "network, PC, I/O No., station" },
              { name: "Request data length", value: "from the timer onward", note: "bytes, or ASCII chars" },
              { name: "Monitoring timer", value: "0 = wait forever", note: "else ×250 ms" },
              { name: "Batch read", value: "0401H" },
              { name: "Batch write", value: "1401H" },
              { name: "Subcommand", value: "0000/0001 Q·L", note: "0002/0003 iQ-R" },
              { name: "End code", value: "0000H = normal", note: "meanings: module manual" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Source: MELSEC Communication Protocol Reference Manual SH(NA)-080008-AB;
            SLMP Reference Manual SH(NA)-080956ENG-M; Q Corresponding Ethernet
            Interface Module User&apos;s Manual (Basic) SH(NA)-080009-X.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["mitsubishi-address-converter", "modbus-frame-decoder", "xgt-cnet-decoder"]} />
      </ToolShell>
    </>
  );
}
