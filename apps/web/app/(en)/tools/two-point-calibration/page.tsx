import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { TwoPointCalTool } from "@/components/tool/TwoPointCalTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "2-Point Calibration Calculator — slope & offset from two readings",
  description:
    "Free online two-point calibration calculator: enter two reference readings and get slope, offset and the correction equation, with live apply/invert. 100% in your browser.",
  openGraph: { title: "2-Point Calibration Calculator — slope & offset from two readings", description: "Enter two reference readings and get slope, offset and the correction equation.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "When is a two-point calibration enough?",
    a: "Whenever the sensor or channel is linear over your working range — which covers most industrial transducers, amplified bridges and analog input chains. Two points pin down a straight line exactly; a third point is only needed to check linearity or when the device is known to curve.",
  },
  {
    q: "Which two points should I use?",
    a: "As far apart as practical, ideally near the ends of the range you care about. Slope error scales with 1/(x₂−x₁), so points close together amplify any reading noise into a large gain error.",
  },
  {
    q: "What do slope and offset mean physically?",
    a: "Slope is the gain — output units per input unit (12.5 °C/mA in the worked example). Offset is the reading the line predicts at input zero; a nonzero offset is what people informally call the 'zero error'.",
  },
  {
    q: "How do I use the result in my PLC or firmware?",
    a: "Store the two constants and compute y = slope·x + offset per sample (one multiply, one add). The reverse direction x = (y − offset)/slope converts a desired output back to the raw input — the tool computes both live.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. The fit runs locally in your browser.",
  },
];

const C_SNIPPET = `/* Two-point calibration: y = slope*x + offset */
typedef struct { float slope, offset; } cal2_t;

cal2_t cal2_fit(float x1, float y1, float x2, float y2)
{
    cal2_t c;
    c.slope  = (y2 - y1) / (x2 - x1);
    c.offset = y1 - c.slope * x1;
    return c;              /* (4,0)-(20,200): slope 12.5, offset -50 */
}

float cal2_apply(cal2_t c, float x) { return c.slope * x + c.offset; }`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "2-Point Calibration Calculator", description: metadata.description!, slug: "two-point-calibration", faqs: FAQS })} />
      <ToolShell slug="two-point-calibration">
        <TwoPointCalTool />
        <AdSlot id="two-point-calibration-results" />

        <AnswerBox>
          This tool fits the straight line through two reference measurements
          and hands you the two constants every linear calibration needs:
          slope (gain) and offset (zero). Enter the raw reading and the true
          value at two points, and the equation — plus a live apply/invert
          field — updates instantly.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A linear channel obeys <code>y = slope·x + offset</code>. Two known
            points (x₁, y₁) and (x₂, y₂) determine it exactly:{" "}
            <code>slope = (y₂ − y₁)/(x₂ − x₁)</code>, then{" "}
            <code>offset = y₁ − slope·x₁</code>. This is the math behind every
            zero-and-span procedure: the “zero” adjustment moves the offset,
            the “span” adjustment moves the slope. The same two constants
            invert cleanly (<code>x = (y − offset)/slope</code>), which is what
            you need when driving an output to hit a target value.
          </p>
          <p>
            Accuracy hinges on the reference points: read them with a better
            instrument than the channel you are calibrating, and spread them
            wide — slope uncertainty grows as the points move closer together.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            point 1: x=4 (mA) → y=0 (°C) · point 2: x=20 → y=200
            <br />
            slope = (200−0)/(20−4) = <span className="text-ok">12.5</span> · offset = 0 − 12.5·4 = <span className="text-ok">−50</span>
            <br />
            y = 12.5·x − 50 → at x=12: y = 100
          </DataWell>
        </Section>

        <AdSlot id="two-point-calibration-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Model", value: "y = slope·x + offset", note: "linear only" },
              { name: "Slope", value: "(y₂−y₁)/(x₂−x₁)", note: "gain / span" },
              { name: "Offset", value: "y₁ − slope·x₁", note: "zero" },
              { name: "Inverse", value: "x = (y−offset)/slope" },
              { name: "Constraint", value: "x₁ ≠ x₂" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["4-20ma-scaling", "plc-analog-scaling", "pt100-calculator"]} />
      </ToolShell>
    </>
  );
}
