import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { VoltageDividerTool } from "@/components/tool/VoltageDividerTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/voltage-divider/" },
  title: "Voltage Divider Calculator — with E24/E96 standard values",
  description:
    "Free online voltage divider calculator: compute Vout from R1/R2, or find the best standard E24/E96 resistor pairs for a target ratio with error percentages. 100% in your browser.",
  openGraph: { title: "Voltage Divider Calculator — with E24/E96 standard values", description: "Compute Vout or find the best standard E24/E96 resistor pairs for a target ratio.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why can't I buy a resistor for the exact ratio I need?",
    a: "Resistors come in standardized IEC 60063 series: E24 has 24 values per decade (±5 % families), E96 has 96 (±1 % families). Your exact ratio usually falls between values, so the practical question is which standard pair lands closest — exactly what the finder tab answers, with the residual error shown.",
  },
  {
    q: "How do I choose the impedance level (the R2 magnitude)?",
    a: "It is a power-vs-noise trade. Low resistance wastes current through the divider (5 V across 2 kΩ total burns 2.5 mA continuously); high resistance makes the output sensitive to load and ADC input current. Around 10 kΩ total is the common middle ground for sensing dividers.",
  },
  {
    q: "Why does my measured Vout differ from the calculation?",
    a: "The formula assumes an unloaded output. Any load — an ADC input, a following stage — appears in parallel with R2 and pulls Vout down. Keep the load impedance at least 100× R2, or buffer the divider with an op-amp follower.",
  },
  {
    q: "Does resistor tolerance add to the table's error figure?",
    a: "Yes, independently. The table shows the nominal-value error; actual parts add their tolerance on top. With ±1 % parts the worst-case ratio error adds roughly ±2 % around the nominal figure, so pick pairs whose nominal error is comfortably inside your budget.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. The search runs locally in your browser.",
  },
];

const PY_SNIPPET = `# Voltage divider: Vout = Vin * R2 / (R1 + R2)
def vout(vin, r1, r2):
    return vin * r2 / (r1 + r2)

assert vout(12, 10_000, 10_000) == 6.0
# 5 V -> 3.3 V with E96 parts: R1 = 5.11k, R2 = 9.76k (error < 1 %)
print(vout(5, 5110, 9760))   # ≈ 3.283 V`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Voltage Divider Calculator", description: metadata.description!, slug: "voltage-divider", faqs: FAQS })} />
      <ToolShell slug="voltage-divider">
        <VoltageDividerTool />
        <AdSlot id="voltage-divider-results" />

        <AnswerBox>
          This tool works a resistive divider in both directions: compute the
          unloaded output of a given R1/R2 pair, or — the harder everyday
          problem — search the standard E24/E96 value series for the pairs
          that best hit a target ratio, ranked by error. 12 V through equal
          10 kΩ resistors gives 6 V; 5 V → 3.3 V lands within 1 % with
          ordinary E96 parts.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Two resistors in series split a voltage in proportion to
            resistance: <code>Vout = Vin · R2 / (R1 + R2)</code>, with R2 the
            grounded (bottom) resistor. The finder normalizes your target
            ratio, walks R2 through the chosen IEC 60063 series at your
            preferred impedance level, snaps the ideal companion R1 to its
            nearest standard value, and re-computes the exact output each pair
            produces. Sorting by relative error surfaces combinations that are
            often better than the “obvious” pair.
          </p>
          <p>
            The result is the unloaded output; anything connected to the tap
            sits in parallel with R2 and lowers it — the classic reason a
            divider measures fine on the bench and sags in circuit.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            Vin 12 V · R1 10 kΩ · R2 10 kΩ
            <br />
            Vout = 12 × 10k / 20k = <span className="text-ok">6.000 V</span>
            <br />
            <br />
            target 5 V → 3.3 V (E96, ~10 k): e.g. R1 5.11k / R2 9.76k → 3.283 V (−0.5 %)
          </DataWell>
        </Section>

        <AdSlot id="voltage-divider-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Formula", value: "Vout = Vin·R2/(R1+R2)", note: "unloaded" },
              { name: "E24", value: "24 values/decade", note: "±5 % family (IEC 60063)" },
              { name: "E96", value: "96 values/decade", note: "±1 % family" },
              { name: "Search", value: "best pairs by |error|", note: "top 5 shown" },
              { name: "Loading rule", value: "load ≫ R2", note: "≥100× or buffer" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["adc-calculator", "rms-peak", "db-dbm"]} />
      </ToolShell>
    </>
  );
}
