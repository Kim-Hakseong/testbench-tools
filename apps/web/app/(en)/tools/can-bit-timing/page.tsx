import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { CanBitTimingTool } from "@/components/tool/CanBitTimingTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/can-bit-timing/" },
  title: "CAN Bit Timing Calculator — prescaler, segments, sample point",
  description:
    "Free online CAN bit timing calculator: prescaler, SEG1/SEG2 and sample point candidates for your clock and bitrate, ranked by error. 100% in your browser.",
  openGraph: { url: "/tools/can-bit-timing/",
    images: ["/og/can-bit-timing.png"], siteName: "TestBench.tools", title: "CAN Bit Timing Calculator — prescaler, segments, sample point", description: "Prescaler, SEG1/SEG2 and sample point candidates for your CAN clock and bitrate.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What is a time quantum (tq)?",
    a: "The basic unit the CAN controller divides a bit into: tq = prescaler / f_clk. A bit is built from 1 sync quantum plus SEG1 and SEG2, typically 8–25 tq total. More quanta per bit give finer sample-point placement and better resynchronization.",
  },
  {
    q: "Why does the sample point matter so much?",
    a: "All nodes on a bus must sample each bit at nearly the same relative position, late enough for the slowest signal to settle across the full cable length. Around 87.5 % is the widely used convention (CANopen recommends it), which is why it is the default target here.",
  },
  {
    q: "Why must the bitrate error be essentially zero for CAN?",
    a: "Unlike UART, all CAN nodes share one wire and must agree on timing within the resynchronization jitter budget. Practical designs use clock/prescaler combinations that divide exactly — that is why CAN clocks are 8/16/24/48 MHz rather than arbitrary values, and why the table highlights exact-division rows.",
  },
  {
    q: "How do SEG1 and SEG2 map to my controller's registers?",
    a: "Most controllers (e.g. ST bxCAN, NXP FlexCAN) split SEG1 into PROP_SEG + PHASE_SEG1; this calculator's SEG1 is their sum. Registers usually store 'value − 1', so check whether your header expects the raw quanta count or the register encoding.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. The search runs locally in your browser.",
  },
];

const C_SNIPPET = `/* CAN bit timing: bit = SYNC(1) + SEG1 + SEG2 time quanta */
/* 8 MHz clock, 500 kbit/s: prescaler 1 -> 16 tq per bit    */
/* SEG1 = 13, SEG2 = 2 -> sample point (1+13)/16 = 87.5 %   */

uint32_t bit_time_tq  = 1 + 13 + 2;              /* 16 tq   */
uint32_t bitrate      = 8000000 / (1 * 16);      /* 500000  */
float    sample_point = (1 + 13) / 16.0f;        /* 0.875   */`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "CAN Bit Timing Calculator", description: metadata.description!, slug: "can-bit-timing", faqs: FAQS })} />
      <ToolShell slug="can-bit-timing">
        <CanBitTimingTool />
        <AdSlot id="can-bit-timing-results" />

        <AnswerBox>
          This tool derives CAN bit-timing candidates — prescaler, time quanta
          per bit, SEG1/SEG2 split and resulting sample point — from your
          controller clock and target bitrate, ranked by bitrate error and
          closeness to your sample-point target. The classic case: 8 MHz and
          500 kbit/s solve exactly with 16 tq and an 87.5 % sample point.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A CAN bit is assembled from time quanta: one fixed SYNC quantum,
            then SEG1 (propagation + phase 1) and SEG2 (phase 2). The
            controller samples the bus between SEG1 and SEG2, so the sample
            point is <code>(1 + SEG1) / total</code>. The calculator walks
            every prescaler, keeps totals in the valid 8–25 tq window, splits
            the segments to approach your sample-point target, and computes the
            exact bitrate each combination produces —{" "}
            <code>f_clk / (prescaler × total_tq)</code>.
          </p>
          <p>
            Combinations that divide exactly (0 % error) are the ones to use on
            a shared bus; among them, prefer more quanta per bit for finer
            phase resolution.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            f_clk 8 MHz · target 500 kbit/s · SP 87.5 %
            <br />
            prescaler 1 → 16 tq/bit → SEG1 13, SEG2 2
            <br />
            sample point (1+13)/16 = <span className="text-ok">87.5 %</span> · rate exactly <span className="text-ok">500 000 bit/s</span>
          </DataWell>
        </Section>

        <AdSlot id="can-bit-timing-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Bit composition", value: "SYNC(1) + SEG1 + SEG2", note: "in time quanta" },
              { name: "Valid totals", value: "8 … 25 tq" },
              { name: "SEG1 / SEG2 limits", value: "1–16 / 1–8 tq" },
              { name: "Sample point", value: "(1+SEG1)/total", note: "≈87.5 % conventional" },
              { name: "Bitrate", value: "f_clk / (prescaler · total)" },
            ]}
          />
        </Section>

        <Section title="C reference">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["can-frame-decoder", "uart-baud-error", "stm32-timer"]} />
      </ToolShell>
    </>
  );
}
