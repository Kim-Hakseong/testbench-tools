import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { PlcPulseTool } from "@/components/tool/PlcPulseTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

// Every behavioural statement on this page is quoted or derived in
// spec/plc-pulse-semantics.md (CLAUDE.md §5.3). Assumptions E1–E2 are named there.

export const metadata: Metadata = {
  alternates: { canonical: "/tools/plc-pls-plf/" },
  title: "PLS/PLF and OUTP/OUTN — Mitsubishi and LS pulse instructions, scan by scan",
  description:
    "Free pulse-instruction simulator for Mitsubishi FX5 (LDP, LDF, PLS, PLF) and LS ELECTRIC XGK/XGB (LOADP, LOADN, OUTP, OUTN): see the one-scan pulse, which rung sees it, and why a pulse coil skipped by CJ or JMP stays ON. From the vendor manuals. 100% in your browser.",
  openGraph: { url: "/tools/plc-pls-plf/",
    images: ["/og/plc-pls-plf.png"],
    siteName: "TestBench.tools",
    title: "PLS/PLF and OUTP/OUTN",
    description: "Mitsubishi and LS pulse instructions, scan by scan.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "What does the PLS instruction do?",
    a: "Mitsubishi: it \"turns ON the specified device for one scan when the PLS command turns from OFF to ON, and turns OFF in other cases.\" PLF does the same on the ON-to-OFF change. LS ELECTRIC's OUTP and OUTN are documented the same way: the contact is \"On for 1 scan and the others than that, it will be Off.\"",
  },
  {
    q: "LDP or PLS — which should I use?",
    a: "For a single rung they give the same pulse. Mitsubishi draws LDP X0 → OUT M0 next to LD X0 → PLS M0 and says the operation is the same. The difference is where the pulse lives: LDP makes the rung result itself one scan long, while PLS puts the pulse on a device that other rungs read.",
  },
  {
    q: "Why does a rung above the PLS see the pulse one scan late?",
    a: "The PLS turns its device ON when it runs and OFF the next time it runs. A rung below it reads the device in the same scan; a rung above has already run, so it reads the device at the top of the next scan, before the PLS clears it. Both see exactly one scan.",
  },
  {
    q: "Why does my PLS device stay ON for more than one scan?",
    a: "Usually because the PLS was skipped. Mitsubishi: the device \"sometimes turns ON for one scan or more when the PLS instruction is made to jump by the CJ instruction or the executed subroutine program was not called.\" A skipped PLS cannot turn its device off, and CJ keeps skipped devices as they were. LS says instructions between JMP and LABEL \"will not be operated\", which leads to the same result.",
  },
  {
    q: "Does a pulse fire again after STOP and RUN?",
    a: "Not on a Mitsubishi FX5 if the input stayed ON: \"If the RUN/STOP/RESET switch is changed from RUN to STOP after execution of the PLS instruction, the PLS instruction will not be executed even if the switch is set to RUN again.\" After a write during RUN, rising-edge instructions also wait for the next OFF-to-ON change. What happens on the very first scan after power-up is not documented, so the tool lets you choose (assumption E2).",
  },
  {
    q: "Is anything uploaded?",
    a: "No. The simulation runs entirely in your browser, and the share link carries only the settings, after the #.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "PLS/PLF and OUTP/OUTN", description: metadata.description!, slug: "plc-pls-plf", faqs: FAQS })} />
      <ToolShell slug="plc-pls-plf">
        <PlcPulseTool />
        <AdSlot id="plc-pls-plf-results" />

        <AnswerBox>
          Mitsubishi&apos;s LDP/LDF and PLS/PLF and LS ELECTRIC&apos;s
          LOADP/LOADN and OUTP/OUTN turn an input change into a pulse one scan
          long. This tool runs them scan by scan — the contact form and the
          coil form side by side, which rungs see the pulse, and what happens
          when a jump skips the pulse coil: its device stays ON, and a press
          made during the jump can be lost. Switch the vendor to change the
          mnemonics; the documented behaviour is the same.
        </AnswerBox>

        <Section title="Contact pulse and coil pulse">
          <ParamsTable
            rows={[
              { name: "Rising contact", value: "LDP  /  LOADP", note: "rung result ON for one scan" },
              { name: "Falling contact", value: "LDF  /  LOADN", note: "rung result ON for one scan" },
              { name: "Rising coil", value: "PLS  /  OUTP", note: "device ON for one scan" },
              { name: "Falling coil", value: "PLF  /  OUTN", note: "device ON for one scan" },
            ]}
          />
          <p>
            Mitsubishi: LDP &ldquo;becomes conductive (ON) only at the rising
            edge (OFF to ON) of the specified bit device,&rdquo; and
            &ldquo;When only the LDP instruction is programmed, operation is the
            same as the conversion of the instruction under execution to pulse
            instruction (P).&rdquo; LS: LOADP&apos;s &ldquo;Operation result is
            On when specified contact changes Off to On.&rdquo; An edge is a
            difference between two executions, so in this tool — which reads
            inputs once at the start of each scan — an input that changes and
            changes back between two scans produces no pulse at all.
          </p>
        </Section>

        <Section title="A jumped pulse coil stays ON">
          <p>
            Mitsubishi&apos;s CJ keeps skipped devices as they are — &ldquo;The
            value in the device skipped with these instructions remains the
            same&rdquo; — and the PLS page warns that its device
            &ldquo;sometimes turns ON for one scan or more when the PLS
            instruction is made to jump by the CJ instruction.&rdquo; LS:
            &ldquo;all instructions between JMP instruction and LABEL will not
            be operated.&rdquo; If the jump starts the scan after a pulse, the
            device stays ON until the coil runs again.
          </p>
          <p>
            The second effect follows from how the instruction remembers the
            input. This tool assumes each pulse instruction updates its memory
            only when it runs (assumption E1) — a skipped instruction writes
            nothing. Then an input that drops and rises again during the jump is
            invisible: when the coil runs again, it sees ON now and ON before.
          </p>
        </Section>

        <AdSlot id="plc-pls-plf-content" />

        <Section title="First scan, STOP/RUN and online edits">
          <p>
            Mitsubishi documents two restart cases. After STOP and RUN with the
            input still ON, the PLS does not fire again. After a write during
            RUN, &ldquo;the instruction is not executed regardless of the ON/OFF
            status of the target device&rdquo; until it goes from OFF to ON
            again. Neither manual says what happens on the first scan after
            power-up, so the tool makes the edge memory&apos;s starting value a
            setting (assumption E2) instead of guessing.
          </p>
        </Section>

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Scan time", value: "ms, 1 or more", note: "rungs run once per scan" },
              { name: "X, J toggles", value: "times in ms", note: "inputs start FALSE" },
              { name: "Edge memory, first scan", value: "OFF or ON", note: "assumption E2" },
            ]}
          />
        </Section>

        <Section title="Sources">
          <p>
            Mitsubishi Electric MELSEC iQ-F FX5 Programming Manual (Instructions,
            Standard Functions/Function Blocks), JY997D55801 (LDP/LDF, PLS, PLF,
            CJ) and FX5 Programming Manual (Program Design), JY997D55701; LS
            ELECTRIC XGK/XGB Instructions and Programming, V2.2 (LOADP/LOADN,
            OUTP/OUTN, JMP-LABEL).
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["plc-edge-one-shot", "plc-jmp-mcr", "plc-scan-order"]} />
      </ToolShell>
    </>
  );
}
