import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { PlcZoneTool } from "@/components/tool/PlcZoneTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

// Every behavioural statement on this page is quoted or derived in
// spec/plc-jmp-mcr-semantics.md (CLAUDE.md §5.3). Assumptions D1–D3 are named there.

export const metadata: Metadata = {
  alternates: { canonical: "/tools/plc-jmp-mcr/" },
  title: "PLC JMP vs MCR — skipped rungs against a disabled zone, scan by scan",
  description:
    "Free Logix JMP and MCR simulator: see what happens to an OTE, TON, TOF and RTO when their rungs are jumped over versus switched off by an MCR zone, plus a conditional end MCR and a jump into a zone. From Rockwell's RM003. 100% in your browser.",
  openGraph: { url: "/tools/plc-jmp-mcr/",
    images: ["/og/plc-jmp-mcr.png"],
    siteName: "TestBench.tools",
    title: "PLC JMP vs MCR",
    description: "Skipped rungs against a disabled MCR zone, scan by scan.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "What is the difference between JMP and MCR?",
    a: "A JMP skips rungs: \"Jumped logic is not scanned.\" Nothing inside is written, so every output and timer keeps the state it had on the last scan that ran. An MCR zone does the opposite — the rungs still run, but the MCR forces \"every instruction to execute as if rung-condition-in is false.\" So an OTE in a disabled zone goes FALSE, while the same OTE in jumped logic stays where it was.",
  },
  {
    q: "What happens to a TON inside jumped logic?",
    a: "It stops being executed, so ACC and DN freeze. On the first scan back, the Logix accumulate step — ACC = ACC + (current_time − last_time_scanned) — adds all the time since the TON last ran, in one go. If its rung was true before the jump and true again after, the timer counts the whole gap as on-time, even if the input was off in between, and ACC can land far past PRE.",
  },
  {
    q: "Does an MCR zone reset timers?",
    a: "A TON, yes — a false rung clears it, and Rockwell says timers in a disabled zone \"will be cleared.\" A TOF, no: a false rung is exactly what starts an off-delay, so its DN stays TRUE for PRE after the zone is disabled. An RTO keeps its ACC and DN with a false rung, and starts accumulating again from that value when the zone comes back.",
  },
  {
    q: "Why should the terminating MCR be unconditional?",
    a: "Because every MCR with a false rung toggles the override. If the zone is enabled and the terminating MCR's rung is false, it switches the override on and \"will disable all of the rungs that follow it\" — logic outside the zone goes dead. The override is reset at the end of the routine, so the next scan starts clean.",
  },
  {
    q: "Can I jump into an MCR zone?",
    a: "Rockwell says not to: \"If the starting MCR is not executed, the zone will not be disabled.\" A JMP that lands past the starting MCR runs the zone's remaining rungs normally, whatever the start condition says.",
  },
  {
    q: "Does this apply to Siemens?",
    a: "The JMP part does: on an S7-1200, a JMP with power flow continues \"with the first instruction following the specified label\", so the rungs in between do not run. How a Siemens IEC timer behaves when its call is jumped over is not in the manual this tool uses, so the timer rows are Logix only. MCR as shown here is the Logix instruction.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. The simulation runs entirely in your browser, and the share link carries only the settings, after the #.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "PLC JMP vs MCR", description: metadata.description!, slug: "plc-jmp-mcr", faqs: FAQS })} />
      <ToolShell slug="plc-jmp-mcr">
        <PlcZoneTool />
        <AdSlot id="plc-jmp-mcr-results" />

        <AnswerBox>
          A JMP and an MCR both switch off a block of rungs, in opposite ways.
          Jumped rungs do not run, so their outputs and timers freeze. Rungs in
          a disabled MCR zone still run, with every rung forced false, so OTEs
          clear, TONs reset, TOFs start their off-delay and RTOs hold. This tool
          runs the same four rungs both ways scan by scan, plus two MCR mistakes
          — a conditional end MCR and a jump into a zone. The rules come from
          Rockwell&apos;s instruction reference, quoted in this site&apos;s spec.
        </AnswerBox>

        <Section title="Jumped logic is not scanned">
          <p>
            Rockwell: &ldquo;When true, the JMP instruction skips to the
            referenced LBL instruction and the controller continues executing
            from there,&rdquo; and, in an IMPORTANT note, &ldquo;Jumped logic is not
            scanned. Place critical logic outside the jumped zone.&rdquo; An
            OTE that does not run does not write, so Y keeps the value from the
            last scan that ran — even if A changes while it is skipped.
          </p>
          <p>
            Timers are the sharper edge. Logix timing is measured between
            executions: ACC = ACC + (current_time − last_time_scanned). A TON
            that was timing when the jump started adds the whole skipped span on
            the first scan back. With the default settings, T1.ACC goes from 90
            to 300 in one scan and DN comes on, although A was FALSE for 100 ms
            in the gap. This tool assumes last_time_scanned is not updated while
            the instruction is skipped (assumption D1): an instruction that does
            not run writes nothing.
          </p>
        </Section>

        <Section title="An MCR zone runs false">
          <p>
            &ldquo;The MCR instruction is able to override the normal behavior
            of rungs; forcing every instruction to execute as if
            rung-condition-in is false.&rdquo; Each instruction then does what
            its own false-rung row says:
          </p>
          <ParamsTable
            rows={[
              { name: "OTE", value: "cleared to FALSE", note: "JMP: keeps last value" },
              { name: "TON", value: "ACC = 0, DN off", note: "JMP: frozen, then catches up" },
              { name: "TOF", value: "off-delay starts; DN off after PRE", note: "JMP: frozen" },
              { name: "RTO", value: "ACC and DN held", note: "JMP: frozen, then catches up" },
            ]}
          />
          <p>
            Rockwell&apos;s MCR page says timers in a disabled zone &ldquo;will
            be cleared.&rdquo; That holds for a TON. A TOF&apos;s DN stays on
            for PRE, and an RTO keeps its count — each follows its own execution
            table, and this tool shows both.
          </p>
        </Section>

        <AdSlot id="plc-jmp-mcr-content" />

        <Section title="Two ways to break an MCR zone">
          <p>
            The override is a single bit that every MCR with a false rung
            toggles. &ldquo;If the terminating MCR is false, and the zone is
            enabled, the terminating MCR will disable all of the rungs that
            follow it.&rdquo; In the third program Y2 sits after the zone and
            still drops out whenever E is TRUE and X is FALSE — and works
            normally when the zone is disabled, because the forced-false end MCR
            toggles the override back.
          </p>
          <p>
            &ldquo;Do not jump into an MCR zone. If the starting MCR is not
            executed, the zone will not be disabled.&rdquo; In the fourth
            program a jump past the starting MCR lets Y2 follow A with E FALSE.
          </p>
          <p>
            One documentation slip: the &ldquo;MCR Flow Chart (False)&rdquo; in
            the 2024 reference routes its &ldquo;zone is disabled&rdquo; branch
            back into &ldquo;zone is enabled&rdquo;, so the drawing always ends
            enabled. The description and execution table say the override is
            toggled; this tool follows them.
          </p>
        </Section>

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Scan time", value: "ms, 1 or more", note: "rungs run once per scan" },
              { name: ".PRE", value: "ms", note: "shared by T1, T2 and T3" },
              { name: "A, E, X toggles", value: "times in ms", note: "inputs start FALSE" },
              { name: "Jumps", value: "forward only", note: "assumption D3" },
            ]}
          />
        </Section>

        <Section title="Sources">
          <p>
            Rockwell Automation Logix 5000 Controllers General Instructions,
            publication 1756-RM003 (JMP/LBL, MCR, OTE, TON, TOF, RTO); Siemens
            S7-1200 System Manual A5E02486680 (JMP, JMPN, LABEL). IEC 61131-3
            itself is not quoted.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["plc-scan-order", "plc-timer-comparison", "plc-edge-one-shot"]} />
      </ToolShell>
    </>
  );
}
