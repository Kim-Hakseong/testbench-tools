import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { LoopBurdenTool } from "@/components/tool/LoopBurdenTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Loop Burden Calculator — 4-20mA voltage budget check",
  description:
    "Free online 4-20mA loop burden calculator: check that your supply voltage covers sense resistor, wiring and the transmitter's minimum voltage at 20mA. 100% in your browser.",
  openGraph: { title: "Loop Burden Calculator — 4-20mA voltage budget check", description: "Check that your loop supply covers sense resistor, wiring and transmitter lift-off voltage at 20 mA.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why does my loop read fine at 4 mA but saturate before 20 mA?",
    a: "That is the classic burden failure signature. Voltage drop across the loop resistance grows with current (V = I·R), so a loop can have enough voltage at low current yet starve the transmitter below its minimum operating voltage as current rises. Check the margin at 20 mA — if it is negative, the reading will clip.",
  },
  {
    q: "What is a transmitter's minimum (lift-off) voltage?",
    a: "The smallest terminal voltage at which a 2-wire transmitter still regulates the loop current correctly — it powers itself from that voltage. It is on the datasheet, and it is the number the whole budget is measured against.",
  },
  {
    q: "What counts toward loop resistance?",
    a: "Everything in series: the receiver's sense resistor (250 Ω is the classic value), wire resistance both ways, intrinsic-safety barriers, and any loop-powered indicators. Devices specified as a voltage drop can be entered as equivalent resistance: R = V/0.02.",
  },
  {
    q: "Why evaluate at 20 mA and not 4 mA?",
    a: "Because burden drop is worst at maximum current. A loop that has margin at 20 mA has more at every lower current. (Transmitters can over-range to ~20.5 mA, which costs a few percent more — keep a little headroom beyond zero margin.)",
  },
  {
    q: "Is my data uploaded?",
    a: "No. The budget math runs locally in your browser.",
  },
];

const C_SNIPPET = `/* 4-20 mA loop voltage budget at full scale (20 mA) */
typedef struct { float v_tx, margin, max_r; int ok; } burden_t;

burden_t loop_burden(float supply, float v_min_tx, float loop_r)
{
    const float i = 0.020f;               /* worst case: full scale */
    burden_t b;
    b.v_tx    = supply - i * loop_r;      /* voltage left for transmitter */
    b.margin  = b.v_tx - v_min_tx;
    b.max_r   = (supply - v_min_tx) / i;  /* budget as max resistance */
    b.ok      = b.margin >= 0.0f;
    return b;   /* 24 V, 12 V min, 300 R -> v_tx 18 V, margin 6 V */
}`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Loop Burden Calculator", description: metadata.description!, slug: "loop-burden", faqs: FAQS })} />
      <ToolShell slug="loop-burden">
        <LoopBurdenTool />
        <AdSlot id="loop-burden-results" />

        <AnswerBox>
          This tool checks whether a 4-20 mA loop&apos;s voltage budget closes:
          supply voltage minus the drop across sense resistor, wiring and other
          series devices must still exceed the transmitter&apos;s minimum
          operating voltage at 20 mA. It reports the voltage left at the
          transmitter, the margin, and the maximum loop resistance the budget
          allows.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A 2-wire transmitter powers itself from the loop, so every ohm in
            series eats into its supply. At full-scale current the drop is{" "}
            <code>V = 0.02 A × R_loop</code>; what remains,{" "}
            <code>V_tx = V_supply − V_drop</code>, must stay above the
            datasheet minimum. Rearranged, the budget reads as a resistance
            limit: <code>R_max = (V_supply − V_min) / 0.02</code> — the number
            instrument datasheets plot as the “load resistance vs supply
            voltage” line.
          </p>
          <p>
            The tool sums your sense resistor, wire resistance and other series
            drops, evaluates the worst case at 20 mA, and flags a negative
            margin — the condition that makes a loop read correctly at low
            current but clip before full scale.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            supply 24 V · transmitter min 12 V · 250 Ω sense + 50 Ω wire = 300 Ω
            <br />
            drop @20 mA = 0.02 × 300 = 6 V → V_tx = <span className="text-ok">18 V</span>
            <br />
            margin = 18 − 12 = <span className="text-ok">6 V</span> · R_max = (24−12)/0.02 = 600 Ω
          </DataWell>
        </Section>

        <AdSlot id="loop-burden-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Worst-case current", value: "20 mA", note: "full scale" },
              { name: "Budget", value: "V_tx = V_supply − 0.02·R" },
              { name: "Pass criterion", value: "V_tx ≥ transmitter min V", note: "datasheet value" },
              { name: "Max resistance", value: "(V_supply − V_min) / 0.02" },
              { name: "Series items", value: "sense R · wire · barriers · indicators" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["4-20ma-scaling", "signal-converter", "two-point-calibration"]} />
      </ToolShell>
    </>
  );
}
