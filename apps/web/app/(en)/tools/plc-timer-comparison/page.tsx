import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { PlcTimerTool } from "@/components/tool/PlcTimerTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

// Every behavioural statement on this page is quoted or derived in
// spec/plc-timer-semantics.md (CLAUDE.md §5.3). Assumptions A1–A4 are named
// there and on the page.

export const metadata: Metadata = {
  alternates: { canonical: "/tools/plc-timer-comparison/" },
  title: "PLC Timer Comparison — IEC TON/TOF/TP vs Allen-Bradley TON/TOF/RTO",
  description:
    "Free PLC timer timing-diagram tool: run IEC 61131-3 TON, TOF, TP and Siemens TONR side by side with Allen-Bradley Logix 5000 TON, TOF and RTO, scan by scan — EN, TT, DN, ACC against Q and ET, from the vendor manuals. 100% in your browser.",
  openGraph: { url: "/tools/plc-timer-comparison/",
    images: ["/og/plc-timer-comparison.png"],
    siteName: "TestBench.tools",
    title: "PLC Timer Comparison — IEC vs Allen-Bradley",
    description: "TON, TOF, TP, TONR against Logix TON, TOF, RTO — scan by scan, from the manuals.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "What is the difference between TON, TOF and TP?",
    a: "TON is an on-delay: Q turns on once IN has been TRUE for PT, and a FALSE IN resets it at once. TOF is an off-delay: Q is TRUE while IN is TRUE and stays TRUE for PT after IN falls. TP is a pulse: a rising edge on IN makes Q TRUE for exactly PT, and IN has no effect until the pulse ends. Beckhoff's Tc2_Standard manual and Siemens' S7-1200 manual describe all three the same way.",
  },
  {
    q: "How do IEC Q and ET map to Allen-Bradley .DN and .ACC?",
    a: "For TON and TOF, the Logix .DN bit plays the part of Q and .ACC the part of ET, in milliseconds. Logix adds two bits IEC does not have: .EN mirrors the rung condition, and .TT is TRUE while the timer is timing. On a TOF, .DN is TRUE while the rung is TRUE and through the off-delay, the same as IEC Q.",
  },
  {
    q: "Why can Logix .ACC end up larger than .PRE?",
    a: "Because a Logix timer adds the time since its last scan — ACC = ACC + (current_time − last_time_scanned) — and the TON flow chart in Rockwell's 1756-RM003 sets .DN when ACC ≥ PRE without ever cutting ACC back to PRE. With a 30 ms scan and a 100 ms preset, ACC goes 90 → 120 and stops there. Siemens documents the IEC timers the other way: the elapsed time is clamped at the preset value.",
  },
  {
    q: "Does a timer turn on exactly at the preset time?",
    a: "No — on the first scan at or after it. Both families measure time between executions of the instruction, so the output can only change on a scan. A 100 ms on-delay started on a scan at 30 ms with a 30 ms scan time turns on at 150 ms, not 130 ms. The tool shows that delay directly: set a scan time that does not divide the preset.",
  },
  {
    q: "What state is a Logix TOF in at power-up?",
    a: "Expired. The 1756-RM003 prescan action for TOF clears .EN, .TT and .DN and sets .ACC equal to .PRE, so a TOF whose rung starts FALSE does not run an off-delay after a restart. RES does something different: it sets .ACC to 0 with the status bits FALSE.",
  },
  {
    q: "What is the Allen-Bradley equivalent of Siemens TONR?",
    a: "RTO, reset with a RES instruction. Both keep the accumulated time while the input is FALSE and carry on from it when the input returns; both keep the done output TRUE until they are reset. Siemens resets through the TONR's own R input; on Logix the RES is a separate instruction on its own rung.",
  },
  {
    q: "Is there a pulse timer (TP) in Allen-Bradley Logix?",
    a: "Not among its timer instructions. The timer and counter chapter of the Logix 5000 General Instructions manual lists TON, TOF and RTO for ladder, and TONR, TOFR and RTOR for function blocks — no pulse timer. This tool therefore shows TP on the IEC side only.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. The simulation runs entirely in your browser, and the share link carries only the settings, after the #, which browsers do not send to the server.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "PLC Timer Comparison", description: metadata.description!, slug: "plc-timer-comparison", faqs: FAQS })} />
      <ToolShell slug="plc-timer-comparison">
        <PlcTimerTool />
        <AdSlot id="plc-timer-comparison-results" />

        <AnswerBox>
          This tool runs a PLC timer one scan at a time and draws its timing
          diagram — the IEC 61131-3 function block (TON, TOF, TP, and Siemens
          TONR) next to the Allen-Bradley Logix 5000 instruction that does the
          same job (TON, TOF, RTO with RES). You set the preset, the scan time
          and the moments the input changes; it shows Q and ET against .EN,
          .TT, .DN and .ACC, and lists where the two differ. The rules come
          from the vendors&apos; own manuals, quoted in this site&apos;s spec.
        </AnswerBox>

        <Section title="Where IEC and Logix timers actually differ">
          <p>
            For a plain on-delay the two families agree on when the output
            turns on — the tests behind this tool check that scan for scan. The
            differences are in what the timer reports and in the edge states:
          </p>
          <ParamsTable
            rows={[
              { name: "Elapsed time past the preset", value: "IEC ET stops at PT · Logix .ACC can exceed .PRE", note: "by up to one scan" },
              { name: "Status bits", value: "IEC: Q · Logix: .EN .TT .DN", note: ".TT = timing in process" },
              { name: "TOF at power-up", value: "Logix: .ACC = .PRE, .DN FALSE", note: "prescan; IEC Q FALSE" },
              { name: "Retentive timer", value: "Siemens TONR (R input) · Logix RTO + RES", note: "done output held until reset" },
              { name: "Pulse timer", value: "IEC TP · none in Logix", note: "TP ignores IN while running" },
            ]}
          />
        </Section>

        <Section title="Worked example: a scan time that does not divide the preset">
          <p>
            Preset 100 ms, scan time 30 ms, input on at 30 ms. Both timers start
            timing on the 30 ms scan and add the 30 ms between scans after
            that:
          </p>
          <ParamsTable
            rows={[
              { name: "scan 30 ms", value: "ET 0 · .ACC 0", note: "first scan: start, nothing added" },
              { name: "scan 60 ms", value: "ET 30 · .ACC 30" },
              { name: "scan 90 ms", value: "ET 60 · .ACC 60" },
              { name: "scan 120 ms", value: "ET 90 · .ACC 90" },
              { name: "scan 150 ms", value: "ET 100 · .ACC 120", note: "Q and .DN turn on" },
            ]}
          />
          <p>
            Both outputs turn on at 150 ms — 120 ms after the input, not 100 —
            because that is the first scan at or past the preset. The IEC block
            reports ET = 100 (Siemens: &ldquo;the elapsed time is clamped at the
            preset value&rdquo;); the Logix flow chart has no clamp, so .ACC
            reads 120. Code that compares .ACC with .PRE, or scales it into a
            percentage, sees that overshoot.
          </p>
        </Section>

        <Section title="How each family measures time">
          <p>
            Rockwell states the rule outright: &ldquo;A timer runs by
            subtracting the time of its last scan from the current time: ACC =
            ACC + (current_time − last_time_scanned).&rdquo; On the first TRUE
            scan the TON flow chart only records the time; it adds nothing.
            Siemens says an IEC timer updates &ldquo;when and only when&rdquo;
            the instruction executes or its outputs are referenced. Either way
            the timer lives on the scan, which is why this tool asks for a scan
            time and lands every input change on the first scan at or after it.
          </p>
        </Section>

        <AdSlot id="plc-timer-comparison-content" />

        <Section title="Off-delay: the power-up difference">
          <p>
            An IEC TOF starts timing on a falling edge of IN. Right after
            start-up, with IN already FALSE, there has been no falling edge, so
            this tool keeps Q FALSE and ET at 0 until IN has been TRUE once
            (assumption A1 in the spec — the manuals describe the running
            timer, not this state). A Logix TOF is defined for it: the prescan
            sets .ACC to .PRE with .DN FALSE, the state of a timer that has
            already timed out. Both reach the same place — output off — but
            only the Logix one shows an .ACC equal to the preset.
          </p>
        </Section>

        <Section title="Retentive timers: TONR and RTO">
          <p>
            Siemens TONR: &ldquo;Changing IN to FALSE, while the timer runs,
            stops the timer but does not reset the timer. Changing IN back to
            TRUE will cause the timer to start timing from the accumulated time
            value.&rdquo; Logix RTO behaves the same way: a FALSE rung clears
            .EN and .TT but keeps .ACC and .DN, and only RES clears them. The
            difference is where the reset lives — an input on the Siemens block,
            a separate instruction on Logix. Rockwell&apos;s 2024 manual leaves
            the RTO &ldquo;true&rdquo; flow chart blank, so this tool applies
            the TON accumulate step to it (assumption A3) and places the RES
            rung after the RTO rung in the scan (A4).
          </p>
        </Section>

        <Section title="Pulse timer: TP">
          <p>
            &ldquo;The Q output remains TRUE until the pulse duration has
            elapsed, irrespective of the state of the IN input&rdquo; (Beckhoff),
            and &ldquo;Changing IN has no effect while the timer runs&rdquo;
            (Siemens). A second rising edge during the pulse does not restart
            it. After the pulse, ET stays at PT while IN is still TRUE and
            returns to 0 once IN and Q are both FALSE. Logix has no pulse timer
            instruction to set beside it.
          </p>
        </Section>

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "PT / .PRE", value: "ms, 0 or more", note: "Logix time base is 1 ms" },
              { name: "Scan time", value: "ms, 1 or more", note: "fixed; one execution per scan" },
              { name: "Input toggles", value: "times in ms", note: "IN starts FALSE" },
              { name: "Max scans", value: "20 000", note: "duration ÷ scan time" },
            ]}
          />
        </Section>

        <Section title="Sources">
          <p>
            Beckhoff TE1000 TwinCAT 3 PLC Library Tc2_Standard, v1.3.4 (TON,
            TOF, TP); CODESYS Standard library help (TON, TOF, TP); Siemens
            S7-1200 System Manual A5E02486680 (TP, TON, TOF, TONR); Rockwell
            Automation Logix 5000 Controllers General Instructions, publication
            1756-RM003 (TON, TOF, RTO, RES). IEC 61131-3 itself is not quoted;
            the IEC behaviour shown is the behaviour these vendors document for
            their IEC function blocks.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["stm32-timer", "plc-analog-scaling", "s7-address-converter"]} />
      </ToolShell>
    </>
  );
}
