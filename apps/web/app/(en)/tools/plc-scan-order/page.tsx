import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { PlcScanTool } from "@/components/tool/PlcScanTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

// Every behavioural statement on this page is quoted or derived in
// spec/plc-scan-order-semantics.md (CLAUDE.md §5.3). Assumptions C1–C2 are named there.

export const metadata: Metadata = {
  alternates: { canonical: "/tools/plc-scan-order/" },
  title: "PLC Scan Order Pitfalls — double coil, one-shot rung order, set vs reset",
  description:
    "Free PLC scan-order simulator: watch a double coil, a one-shot bit read above and below its OSR, and five ways to latch (SR, RS, OTL/OTU in both orders, seal-in) scan by scan, from the vendor manuals. 100% in your browser.",
  openGraph: { url: "/tools/plc-scan-order/",
    images: ["/og/plc-scan-order.png"],
    siteName: "TestBench.tools",
    title: "PLC Scan Order Pitfalls",
    description: "Double coil, one-shot rung order and set-vs-reset, scan by scan.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "What happens if the same output coil is used twice?",
    a: "Each coil writes the bit every time its rung executes: TRUE if the rung is true, FALSE if it is false (Rockwell's OTE table; CODESYS calls a coil \"similar to an assignment operator\"). So the bit ends the scan with whatever the last coil wrote, and the earlier coil's rung condition never reaches the output. Rungs between the two coils read the intermediate value — which is why a double coil can look correct in one part of the program and wrong in another.",
  },
  {
    q: "Does the physical output flicker with a double coil?",
    a: "Not on a controller that uses a process image. Siemens says the S7-1200 updates the output values in the process image during the scan \"instead of writing to the actual physical outputs\", which \"prevents the flickering of physical output points that might change state multiple times in the process image output area.\" The physical output gets the end-of-scan value. This tool does not make a claim about when Logix output modules receive data; that is outside its sources.",
  },
  {
    q: "Why does a rung above my one-shot see the pulse one scan late?",
    a: "Because rungs execute top to bottom and an OSR's output bit stays TRUE from the scan it is set until the OSR runs again in the next scan. A rung below the OSR reads it in the same scan; a rung above has already run, so it reads the bit at the start of the next scan, just before the OSR clears it. Each sees it exactly once — one scan apart.",
  },
  {
    q: "SR or RS — which one wins when set and reset are both on?",
    a: "SR is set-dominant: Q1 := (NOT RESET AND Q1) OR SET1. RS is reset-dominant: Q1 := NOT RESET1 AND (Q1 OR SET). Those are Beckhoff's published implementations. With both inputs TRUE, SR's output is TRUE and RS's is FALSE.",
  },
  {
    q: "What if OTL and OTU are both true in the same scan?",
    a: "There is no priority rule — the later rung wins. OTL sets the bit when its rung is true and leaves it alone otherwise; OTU clears it. If the unlatch rung comes after the latch rung, the bit ends the scan FALSE (like RS); swap the rungs and it ends TRUE (like SR). The tool runs both orders side by side.",
  },
  {
    q: "Is a seal-in circuit set- or reset-dominant?",
    a: "Written the usual way — (Start OR M) AND NOT Stop → M — it is stop-dominant: with Start and Stop both pressed the coil drops out, the same as RS. That follows from the coil rule and series-AND / parallel-OR alone, so it holds on any controller.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. The simulation runs entirely in your browser, and the share link carries only the settings, after the #.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "PLC Scan Order Pitfalls", description: metadata.description!, slug: "plc-scan-order", faqs: FAQS })} />
      <ToolShell slug="plc-scan-order">
        <PlcScanTool />
        <AdSlot id="plc-scan-order-results" />

        <AnswerBox>
          This tool runs three short ladder programs one scan at a time and
          shows every bit after the rung that writes it — a bit driven by two
          OTE coils, a one-shot bit read by a rung above and a rung below its
          OSR, and five ways to build a latch when set and reset arrive
          together. You set the scan time and when the inputs change; it says
          which rung wins and when each rung sees what. The rules come from the
          vendors&apos; manuals, quoted in this site&apos;s spec.
        </AnswerBox>

        <Section title="The two rules behind every scan-order bug">
          <p>
            First, rungs run in order. CODESYS: &ldquo;The networks are
            processed in order along the bus bar from top to bottom.&rdquo;
            Rockwell&apos;s instruction reference never says it in one sentence,
            but its JMP description depends on it — &ldquo;Jumping forward to a
            label saves program scan time by omitting a logic segment&rdquo; —
            and this tool assumes the same order for Logix (assumption C1).
          </p>
          <p>
            Second, a coil writes on every execution, true or false. Rockwell&apos;s
            OTE: rung true, &ldquo;The data bit is set to true&rdquo;; rung
            false, &ldquo;The data bit is cleared to false.&rdquo; Everything
            below follows from these two rules.
          </p>
        </Section>

        <Section title="Double coil">
          <p>
            Rung 1 writes Y from A, rung 2 copies Y into Z, rung 3 writes Y
            from B. Z always equals A — it reads what rung 1 just wrote — while
            Y leaves the scan equal to B. On a process-image controller only
            that end value goes to the terminal: the S7-1200 manual says the
            image &ldquo;prevents the flickering of physical output points that
            might change state multiple times in the process image output
            area.&rdquo; So A has no effect on the output at all, yet any logic
            between the coils behaves as if it did.
          </p>
        </Section>

        <AdSlot id="plc-scan-order-content" />

        <Section title="One-shot bit: above or below the OSR">
          <p>
            The OSR sets its output bit for one scan. A rung placed below it
            reads the bit in the edge scan; a rung placed above it reads the bit
            at the top of the next scan, before the OSR runs again and clears
            it. Both see exactly one pulse, one scan apart. That scan of delay
            is harmless for a counter and decisive for anything compared with a
            value captured in the edge scan.
          </p>
        </Section>

        <Section title="Five latches, one conflict">
          <ParamsTable
            rows={[
              { name: "SR (Beckhoff)", value: "Q1 := (NOT RESET AND Q1) OR SET1", note: "set wins" },
              { name: "RS (Beckhoff)", value: "Q1 := NOT RESET1 AND (Q1 OR SET)", note: "reset wins" },
              { name: "OTL rung, then OTU rung", value: "later rung wins", note: "reset wins" },
              { name: "OTU rung, then OTL rung", value: "later rung wins", note: "set wins" },
              { name: "Seal-in, stop in series", value: "(Start OR M) AND NOT Stop → M", note: "stop wins" },
            ]}
          />
          <p>
            Two documentation slips are worth knowing. Beckhoff&apos;s SR/RS
            input tables say the inputs act &ldquo;on a rising edge&rdquo;, but
            the implementation printed on the same page is level-based; this
            tool follows the implementation. Rockwell&apos;s 2024 OTU execution
            table reads &ldquo;The data bit is set to true&rdquo; for a true
            rung — the OTL wording, copied — while its description says OTU
            &ldquo;clears (unlatches) the data bit&rdquo;; this tool follows the
            description.
          </p>
        </Section>

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Scan time", value: "ms, 1 or more", note: "rungs run once per scan" },
              { name: "A, B toggles", value: "times in ms", note: "inputs start FALSE" },
              { name: "OTL/OTU bits at start", value: "FALSE", note: "prescan does not touch them (C2)" },
            ]}
          />
        </Section>

        <Section title="Sources">
          <p>
            CODESYS online help (LD basics; FBD/LD/IL); Beckhoff TE1000 TwinCAT 3
            PLC Library Tc2_Standard v1.3.4 (SR, RS); Siemens S7-1200 System
            Manual A5E02486680 (scan cycle, process image); Rockwell Automation
            Logix 5000 Controllers General Instructions, publication 1756-RM003
            (OTE, OTL, OTU, OSR, JMP). IEC 61131-3 itself is not quoted.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["plc-edge-one-shot", "plc-timer-comparison", "s7-address-converter"]} />
      </ToolShell>
    </>
  );
}
