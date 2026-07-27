import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { SignalConverterTool } from "@/components/tool/SignalConverterTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/signal-converter/" },
  title: "Signal Converter — 4-20mA ↔ 1-5V ↔ 0-10V ↔ 3-15psi",
  description:
    "Free online process signal converter between standard instrumentation spans: 4-20mA, 0-20mA, 1-5V, 0-5V, 0-10V and 3-15psi. 100% in your browser.",
  openGraph: { title: "Signal Converter — 4-20mA ↔ 1-5V ↔ 0-10V ↔ 3-15psi", description: "Convert between standard instrumentation spans: 4-20mA, 1-5V, 0-10V, 3-15psi and more.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why do 4-20 mA and 1-5 V convert with just a 250 Ω resistor?",
    a: "Ohm's law: 4 mA × 250 Ω = 1 V and 20 mA × 250 Ω = 5 V. A single precision resistor across the input turns the standard current span into the standard voltage span, which is why 250 Ω sense resistors are everywhere in analog input hardware.",
  },
  {
    q: "What is 3-15 psi and why does it map onto 4-20 mA?",
    a: "It is the classic pneumatic signal standard that predates electronic loops: 3 psi = 0 %, 15 psi = 100 %. Both conventions use a live zero (3 psi / 4 mA), so they map one-to-one through percent of span — this converter goes through exactly that intermediate step.",
  },
  {
    q: "How does the conversion work mathematically?",
    a: "Both spans are linear, so the value is first normalized to percent of span — (value − low)/(high − low) — and then de-normalized into the target span. 12 mA in 4-20 mA is 50 %, which is 3 V in 1-5 V or 9 psi in 3-15 psi.",
  },
  {
    q: "What does the out-of-span warning mean?",
    a: "Your value lies outside the source span (e.g. 3.6 mA in a 4-20 loop). The tool still converts by linear extrapolation, but on real hardware such readings usually mean a fault condition rather than a measurement.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All conversion happens locally in your browser.",
  },
];

const C_SNIPPET = `/* Convert between two linear instrument spans via percent of span */
float span_convert(float v, float in_lo, float in_hi,
                            float out_lo, float out_hi)
{
    float pct = (v - in_lo) / (in_hi - in_lo);
    return out_lo + pct * (out_hi - out_lo);
}
/* span_convert(12, 4, 20, 1, 5)  -> 3.0f  (12 mA -> 3 V)   */
/* span_convert(12, 4, 20, 3, 15) -> 9.0f  (12 mA -> 9 psi) */`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Signal Converter", description: metadata.description!, slug: "signal-converter", faqs: FAQS })} />
      <ToolShell slug="signal-converter">
        <SignalConverterTool />
        <AdSlot id="signal-converter-results" />

        <AnswerBox>
          This tool converts a process value between the standard
          instrumentation signal spans — 4-20 mA, 0-20 mA, 1-5 V, 0-5 V,
          0-10 V and the pneumatic 3-15 psi. Pick source and target span,
          type the value, and get the equivalent plus the percent of span it
          represents: 12 mA on a 4-20 loop is 50 %, i.e. 3 V on 1-5 V.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Every standard span is a linear encoding of 0–100 % of a process
            variable, so conversion is two steps: normalize the input to
            percent of its span, then project that percent onto the output
            span. Spans with a live zero (4-20 mA, 1-5 V, 3-15 psi) keep their
            fault-detection property through the conversion; spans that start
            at true zero (0-20 mA, 0-10 V) do not distinguish “measuring zero”
            from “dead channel”.
          </p>
          <p>
            The classic hardware bridges mirror this math: a 250 Ω resistor
            converts 4-20 mA to 1-5 V, and an I/P transducer converts 4-20 mA
            to 3-15 psi — all straight lines through the same percent scale.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            12 mA in 4–20 mA → (12−4)/16 = <span className="text-ok">50 %</span>
            <br />
            → 1–5 V: 1 + 0.5·4 = <span className="text-ok">3 V</span>
            <br />
            → 3–15 psi: 3 + 0.5·12 = 9 psi · → 0–10 V: 5 V
          </DataWell>
        </Section>

        <AdSlot id="signal-converter-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Current spans", value: "4–20 mA · 0–20 mA", note: "4-20 has live zero" },
              { name: "Voltage spans", value: "1–5 V · 0–5 V · 0–10 V", note: "1-5 V = 4-20 mA × 250 Ω" },
              { name: "Pneumatic", value: "3–15 psi", note: "live zero at 3 psi" },
              { name: "Method", value: "percent-of-span mapping", note: "linear both ways" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["4-20ma-scaling", "loop-burden", "plc-analog-scaling"]} />
      </ToolShell>
    </>
  );
}
