import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { FourTwentyTool } from "@/components/tool/FourTwentyTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "4-20mA Scaling Calculator — with open-loop detection",
  description:
    "Free online 4-20mA current loop calculator: convert loop current to process value and back, with open-loop, under-range and over-range warnings. 100% in your browser.",
  alternates: toolAlternates("4-20ma-scaling", "en"),
  openGraph: { title: "4-20mA Scaling Calculator — with open-loop detection", description: "Free online 4-20mA current loop calculator: convert loop current to process value and back, with open-loop, under-range and over-range warnings. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why does 3.7 mA show OPEN LOOP instead of a negative value?",
    a: "A healthy 4-20 mA transmitter never drives below about 3.8 mA — a reading under that almost always means a broken wire, a dead transmitter or an unpowered loop. The calculator still shows the linear extrapolation math, but the judgement banner flags the fault first, because that is the real diagnosis.",
  },
  {
    q: "What are the exact judgement thresholds?",
    a: "Below 3.8 mA: open loop. From 3.8 up to 4 mA: under-range (live zero undershoot). Above 20.5 mA: over-range. Between 4 and 20 mA (and up to 20.5): in range. These bands reflect common transmitter saturation behavior.",
  },
  {
    q: "Why does 4-20 mA use 4 mA as zero instead of 0 mA?",
    a: "The 4 mA 'live zero' separates a legitimate zero measurement from a dead circuit: 0 mA can only mean a fault. It also leaves current available to power two-wire transmitters over the same pair.",
  },
  {
    q: "How is the process value computed?",
    a: "Linear interpolation: value = low + (mA − 4) × (high − low) / 16. With a 0–200 °C range, 12 mA lands exactly at 100 °C — the midpoint of the span.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Everything is computed locally in your browser.",
  },
];

const C_SNIPPET = `/* 4-20 mA -> engineering units with loop judgement */
typedef enum { OPEN_LOOP, UNDER_RANGE, OK, OVER_RANGE } loop_status_t;

float scale_4_20(float ma, float lo, float hi, loop_status_t *st)
{
    *st = (ma < 3.8f) ? OPEN_LOOP
        : (ma < 4.0f) ? UNDER_RANGE
        : (ma > 20.5f) ? OVER_RANGE : OK;
    return lo + (ma - 4.0f) * (hi - lo) / 16.0f;
}
/* 12 mA @ 0..200 -> 100.0, status OK; 3.7 mA -> OPEN_LOOP */`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "4-20mA Scaling Calculator",
          description: metadata.description!,
          slug: "4-20ma-scaling",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="4-20ma-scaling">
        <FourTwentyTool />
        <AdSlot id="4-20ma-scaling-results" />

        <AnswerBox>
          This tool converts a 4-20 mA loop current into the process value it
          represents (and back), for any configured range. It also judges loop
          health: readings below 3.8 mA are flagged as an open loop — a broken
          wire, not a measurement — while 3.8–4 mA reads as under-range and
          anything above 20.5 mA as over-range.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A 4-20 mA transmitter maps its calibrated range linearly onto the
            16 mA span: 4 mA is the range low (“live zero”), 20 mA the range
            high. The process value is{" "}
            <code>low + (mA − 4) × (high − low) / 16</code>. Because a healthy
            loop never sits below roughly 3.8 mA, currents under that threshold
            are diagnosed as an open loop rather than converted blindly — the
            single most useful sanity check when commissioning instrumentation.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            range: 0…200 °C
            <br />
            12 mA → <span className="text-ok">100.0 °C</span> (50 % of span)
            <br />
            &nbsp;4 mA → 0 °C&nbsp;&nbsp;·&nbsp;&nbsp;20 mA → 200 °C
            <br />
            3.7 mA → <span className="text-err">OPEN LOOP</span> (below 3.8 mA)
          </DataWell>
        </Section>

        <AdSlot id="4-20ma-scaling-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Live zero", value: "4 mA", note: "range low" },
              { name: "Full scale", value: "20 mA", note: "range high" },
              { name: "Open loop", value: "< 3.8 mA", note: "wiring / transmitter fault" },
              { name: "Under-range", value: "3.8 – 4 mA", note: "transmitter saturated low" },
              { name: "Over-range", value: "> 20.5 mA", note: "transmitter saturated high" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["plc-analog-scaling", "loop-burden", "signal-converter"]} />
      </ToolShell>
    </>
  );
}
