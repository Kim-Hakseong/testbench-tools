import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { PlcEdgeTool } from "@/components/tool/PlcEdgeTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

// Every behavioural statement on this page is quoted or derived in
// spec/plc-edge-semantics.md (CLAUDE.md §5.3). Assumption B1 is named there.

export const metadata: Metadata = {
  alternates: { canonical: "/tools/plc-edge-one-shot/" },
  title: "PLC Edge Detection & One-Shots — R_TRIG/F_TRIG vs ONS, OSR, OSF",
  description:
    "Free PLC edge-detection tool: run IEC R_TRIG/F_TRIG and Siemens P/N contacts side by side with Allen-Bradley ONS, OSR and OSF, scan by scan — first-scan behaviour, rung-out vs output bit, and edges lost between scans, from the vendor manuals. 100% in your browser.",
  openGraph: { url: "/tools/plc-edge-one-shot/",
    images: ["/og/plc-edge-one-shot.png"],
    siteName: "TestBench.tools",
    title: "PLC Edge Detection & One-Shots",
    description: "R_TRIG/F_TRIG and Siemens P/N against Logix ONS, OSR, OSF — scan by scan, from the manuals.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "What is the difference between ONS and OSR?",
    a: "Where the pulse goes. ONS \"makes the remainder of the rung true\" for one scan: the instructions after it on the rung see the pulse. OSR sets a separate output bit for one scan and leaves its rung-condition-out equal to the rung-condition-in, so instructions after an OSR on the same rung see the whole rung, not the pulse. To act once per edge with OSR, condition the action on its output bit.",
  },
  {
    q: "Does a one-shot fire on the first scan if the input is already on?",
    a: "On Allen-Bradley Logix, no: the prescan sets the ONS and OSR storage bits TRUE \"to prevent an invalid trigger during the first scan\", and clears the OSF storage bit for the same reason. On Siemens it depends on you: the S7-1200 manual says edge instructions evaluate the input and memory bit \"including the first execution\", and that you must account for their initial states to allow or avoid a first-scan edge. Set the memory bit's power-up value in the tool to see both cases.",
  },
  {
    q: "What does R_TRIG do?",
    a: "It is a rising-edge detector: Q is TRUE for one cycle when CLK goes from FALSE to TRUE, and FALSE otherwise. F_TRIG is the falling-edge version. Internally both keep the previous value of CLK and compare — the same memory-bit idea Siemens exposes as M_BIT on its P and N contacts.",
  },
  {
    q: "Why did my one-shot miss a short button press?",
    a: "Because an edge instruction only compares the input with its value on the previous execution. If the input turns on and off again between two scans, no execution ever sees it TRUE, and no edge is reported — on any vendor. The tool flags input pulses that fall between scans; the fix is a faster task, a hardware latch or an input module that captures the event, not a different one-shot.",
  },
  {
    q: "Can two edge instructions share a storage bit?",
    a: "They should not. Siemens says to use a unique memory bit for each edge instruction and not to use it anywhere else; Rockwell warns that unexpected operation may occur when structure operands are shared. A shared bit is written by both instructions, so neither compares against its own previous input any more.",
  },
  {
    q: "What are OSRI and OSFI?",
    a: "The function-block and structured-text one-shots on Logix. OSRI sets OutputBit when InputBit is TRUE and was FALSE on the previous scan; OSFI the reverse. On the first scan their history is set so that a real transition is required — the same no-first-scan-trigger result as OSR and OSF in ladder.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. The simulation runs entirely in your browser, and the share link carries only the settings, after the #.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "PLC Edge Detection & One-Shots", description: metadata.description!, slug: "plc-edge-one-shot", faqs: FAQS })} />
      <ToolShell slug="plc-edge-one-shot">
        <PlcEdgeTool />
        <AdSlot id="plc-edge-one-shot-results" />

        <AnswerBox>
          This tool runs PLC edge detection one scan at a time and draws it — the
          IEC R_TRIG / F_TRIG function blocks and Siemens P / N contacts next to
          the Allen-Bradley Logix one-shots ONS, OSR and OSF. You set the scan
          time, the moments the input changes and, on the IEC side, the memory
          bit&apos;s power-up value; it shows every memory or storage bit and
          every pulse, and says where the two families differ. The rules come
          from the vendors&apos; manuals, quoted in this site&apos;s spec.
        </AnswerBox>

        <Section title="Where they differ">
          <p>
            Once a program is running, every one of these instructions does the
            same thing: compare the input with its value on the last execution
            and report a change for exactly one scan. The differences are at the
            edges of that rule:
          </p>
          <ParamsTable
            rows={[
              { name: "First scan, input already TRUE", value: "Logix ONS/OSR: no pulse · Siemens P: depends on M_BIT", note: "Logix prescan sets the storage bit TRUE" },
              { name: "First scan, input FALSE (falling)", value: "Logix OSF: no pulse · Siemens N: pulse if M_BIT starts TRUE", note: "Logix prescan clears the storage bit" },
              { name: "Where the pulse appears", value: "ONS: rung-condition-out · OSR/OSF: output bit", note: "OSR's rung-out = rung-in" },
              { name: "Input change between scans", value: "missed by all", note: "no execution sees it" },
            ]}
          />
        </Section>

        <Section title="The first scan">
          <p>
            Rockwell decides it for you. The ONS and OSR prescan sets the
            storage bit TRUE &ldquo;to prevent an invalid trigger during the
            first scan&rdquo;, so a rung that is already true at power-up does
            not fire; the OSF prescan clears its storage bit, so a rung that is
            already false does not fire either.
          </p>
          <p>
            Siemens leaves it to the program: edge instructions &ldquo;evaluate
            the input and memory-bit values each time they are executed,
            including the first execution. You must account for the initial
            states of the input and memory bit in your program design either to
            allow or to avoid edge detection on the first scan.&rdquo; A P
            contact on an input that is ON at start-up, with its M_BIT starting
            FALSE, reports a rising edge on the first scan. Beckhoff and CODESYS
            do not document the starting value of R_TRIG&apos;s internal memory,
            so the tool makes it an explicit setting rather than guessing
            (assumption B1 in the spec).
          </p>
        </Section>

        <AdSlot id="plc-edge-one-shot-content" />

        <Section title="ONS against OSR on the same rung">
          <p>
            ONS &ldquo;makes the remainder of the rung true each time
            rung-condition-in transitions from false to true&rdquo; — whatever
            follows it on the rung runs once. OSR &ldquo;sets the output bit for
            one scan&rdquo;, and its flow chart sets rung-condition-out TRUE on
            every true scan. Put an ADD after each and the ONS rung adds once
            per edge; the OSR rung adds on every scan the rung is true, while
            its output bit pulses once. That is the most common way to misuse
            OSR.
          </p>
        </Section>

        <Section title="Edges that happen between scans">
          <p>
            All of these instructions compare with the previous execution, so
            the scan is their sampling rate. An input that turns on at 12 ms and
            off at 18 ms with a 10 ms scan is FALSE at both the 10 ms and 20 ms
            scans: no rising edge, no falling edge, nothing to see. The same goes
            for a short drop-out — a FALSE dip between two TRUE scans hides both
            edges. The tool lists every such pulse in the input you give it.
          </p>
        </Section>

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Scan time", value: "ms, 1 or more", note: "one execution per scan" },
              { name: "Input toggles", value: "times in ms", note: "input starts FALSE" },
              { name: "IEC memory bit at power-up", value: "FALSE or TRUE", note: "Logix is fixed by prescan" },
              { name: "Pulse length", value: "one scan", note: "all instructions" },
            ]}
          />
        </Section>

        <Section title="Sources">
          <p>
            Beckhoff TE1000 TwinCAT 3 PLC Library Tc2_Standard, v1.3.4 (R_TRIG,
            F_TRIG); CODESYS Standard library help (R_TRIG, F_TRIG); Siemens
            S7-1200 System Manual A5E02486680 (P/N contacts and coils, P_TRIG,
            N_TRIG, M_BIT note); Rockwell Automation Logix 5000 Controllers
            General Instructions, publication 1756-RM003 (ONS, OSR, OSF, OSRI,
            OSFI). IEC 61131-3 itself is not quoted.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["plc-timer-comparison", "s7-address-converter", "plc-analog-scaling"]} />
      </ToolShell>
    </>
  );
}
