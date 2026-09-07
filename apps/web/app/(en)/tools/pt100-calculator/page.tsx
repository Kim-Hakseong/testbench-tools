import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { Pt100Tool } from "@/components/tool/Pt100Tool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "PT100 / PT1000 Calculator & Resistance Table (IEC 60751)",
  description:
    "Free online PT100/PT1000 RTD calculator: convert resistance to temperature and back with the IEC 60751 Callendar-Van Dusen formula, plus a PT100/PT1000 resistance table for 0–850 °C. 100% in your browser.",
  alternates: toolAlternates("pt100-calculator", "en"),
  openGraph: { url: "/tools/pt100-calculator/", images: ["/og/pt100-calculator.png"], siteName: "TestBench.tools", title: "PT100 / PT1000 Calculator & Resistance Table (IEC 60751)", description: "Free online PT100/PT1000 RTD calculator: convert resistance to temperature and back with the IEC 60751 Callendar-Van Dusen formula, plus a PT100/PT1000 resistance table for 0–850 °C. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which equation and coefficients are used?",
    a: "The IEC 60751 Callendar-Van Dusen equation for T ≥ 0 °C: R(T) = R0·(1 + A·T + B·T²), with A = 3.9083×10⁻³ and B = −5.775×10⁻⁷. Temperature from resistance is the exact quadratic inverse, not a lookup-table approximation.",
  },
  {
    q: "Why is the range limited to 0…850 °C?",
    a: "Below 0 °C the standard adds a C-term quartic, a different equation branch that this calculator does not yet implement. Above 850 °C is outside the IEC 60751 platinum range. Inputs outside the supported range are rejected explicitly rather than silently extrapolated.",
  },
  {
    q: "What is the difference between PT100 and PT1000?",
    a: "Only R0, the resistance at 0 °C: 100 Ω versus 1000 Ω. The temperature coefficients are identical, so a PT1000 reads exactly ten times the resistance of a PT100 at every temperature — 1385.055 Ω instead of 138.5055 Ω at 100 °C.",
  },
  {
    q: "What resistance does a PT1000 read at 25 °C?",
    a: "1097.347 Ω — and a PT100 reads 109.735 Ω at the same temperature. Both come from the same equation: 1000·(1 + 3.9083×10⁻³·25 − 5.775×10⁻⁷·25²). The table on this page lists the common points from 0 to 850 °C.",
  },
  {
    q: "Where do the numbers in a PT1000 resistance table come from?",
    a: "They are not measured values — every published table is the Callendar-Van Dusen equation evaluated at fixed temperature steps. That is why a PT1000 table is the PT100 table times ten, and why this page computes the points instead of shipping a lookup file: the calculator above gives any temperature between the rows.",
  },
  {
    q: "My meter shows 108.5 Ω on a PT100 — what temperature is that?",
    a: "21.8189 °C. A handy field rule: near room temperature a PT100 changes by roughly 0.39 Ω per °C, so 108.5 Ω sits about 22 °C above the 100 Ω ice point — the exact quadratic confirms it.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. The equation is evaluated locally in your browser.",
  },
];

const PY_SNIPPET = `# IEC 60751 Callendar-Van Dusen, T >= 0 °C
A, B = 3.9083e-3, -5.775e-7

def rtd_resistance(t, r0=100.0):
    return r0 * (1 + A*t + B*t*t)

def rtd_temperature(r, r0=100.0):
    return (-A + ((A*A - 4*B*(1 - r/r0)) ** 0.5)) / (2*B)

assert abs(rtd_resistance(100) - 138.5055) < 1e-3
assert abs(rtd_temperature(108.5) - 21.8189) < 1e-3`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "PT100 / PT1000 Calculator",
          description: metadata.description!,
          slug: "pt100-calculator",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="pt100-calculator">
        <Pt100Tool />
        <AdSlot id="pt100-calculator-results" />

        <AnswerBox>
          This tool converts platinum RTD resistance to temperature and back
          for PT100 and PT1000 sensors, using the IEC 60751 Callendar-Van Dusen
          equation over 0…850 °C, and lists the resistance table both sensors
          follow. Reference points: 100 °C ↔ 138.5055 Ω on a PT100 and
          1385.055 Ω on a PT1000; a measured 108.5 Ω ↔ 21.8189 °C.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Platinum resistance rises almost — but not exactly — linearly with
            temperature. IEC 60751 captures the curvature with{" "}
            <code>R(T) = R0·(1 + A·T + B·T²)</code> for T ≥ 0 °C, where{" "}
            <code>A = 3.9083×10⁻³</code> and <code>B = −5.775×10⁻⁷</code>.
            Because that is a quadratic in T, the reverse direction has a
            closed-form solution via the quadratic formula — this calculator
            uses it directly, so resistance → temperature → resistance
            round-trips to within 10⁻⁵ Ω.
          </p>
          <p>
            The negative branch of the standard (with its additional C
            coefficient) is intentionally not implemented; out-of-range inputs
            are refused with the supported range stated.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            PT100 · T = 100 °C
            <br />
            R = 100 × (1 + 3.9083×10⁻³·100 − 5.775×10⁻⁷·100²)
            <br />
            &nbsp;&nbsp;= <span className="text-ok">138.5055 Ω</span>
            <br />
            <br />
            measured R = 108.5 Ω → T = <span className="text-ok">21.8189 °C</span>
          </DataWell>
          <p>
            A PT1000 runs through the identical steps with R0 = 1000 Ω — the
            coefficients never change, only the scale:
          </p>
          <DataWell>
            PT1000 · T = 100 °C
            <br />
            R = 1000 × (1 + 3.9083×10⁻³·100 − 5.775×10⁻⁷·100²)
            <br />
            &nbsp;&nbsp;= <span className="text-ok">1385.055 Ω</span>
            <br />
            <br />
            measured R = 1200 Ω → T = <span className="text-ok">51.566 °C</span>
          </DataWell>
        </Section>

        <Section title="PT100 / PT1000 resistance table">
          <p>
            The rows below are the Callendar-Van Dusen equation evaluated at
            common temperatures — the same numbers the calculator above returns,
            rounded to three decimals. Because R0 is the only difference between
            the two sensors, the PT1000 column is exactly ten times the PT100
            column at every temperature; a PT1000 therefore also changes about
            3.9 Ω per °C near room temperature against a PT100&apos;s 0.39 Ω.
            That ratio is why 2-wire wiring hurts a PT1000 far less: one ohm of
            lead resistance is an error of roughly 2.6 °C on a PT100 but only
            0.26 °C on a PT1000.
          </p>
          <ParamsTable
            rows={[
              { name: "0 °C", value: "1000.000 Ω", note: "PT100 · 100.000 Ω" },
              { name: "10 °C", value: "1039.025 Ω", note: "PT100 · 103.903 Ω" },
              { name: "20 °C", value: "1077.935 Ω", note: "PT100 · 107.794 Ω" },
              { name: "25 °C", value: "1097.347 Ω", note: "PT100 · 109.735 Ω" },
              { name: "50 °C", value: "1193.971 Ω", note: "PT100 · 119.397 Ω" },
              { name: "100 °C", value: "1385.055 Ω", note: "PT100 · 138.506 Ω" },
              { name: "150 °C", value: "1573.251 Ω", note: "PT100 · 157.325 Ω" },
              { name: "200 °C", value: "1758.560 Ω", note: "PT100 · 175.856 Ω" },
              { name: "250 °C", value: "1940.981 Ω", note: "PT100 · 194.098 Ω" },
              { name: "300 °C", value: "2120.515 Ω", note: "PT100 · 212.052 Ω" },
              { name: "400 °C", value: "2470.920 Ω", note: "PT100 · 247.092 Ω" },
              { name: "500 °C", value: "2809.775 Ω", note: "PT100 · 280.978 Ω" },
              { name: "600 °C", value: "3137.080 Ω", note: "PT100 · 313.708 Ω" },
              { name: "700 °C", value: "3452.835 Ω", note: "PT100 · 345.284 Ω" },
              { name: "800 °C", value: "3757.040 Ω", note: "PT100 · 375.704 Ω" },
              { name: "850 °C", value: "3904.811 Ω", note: "PT100 · 390.481 Ω" },
            ]}
          />
          <p>
            The spacing between rows narrows as temperature rises: a PT1000
            gains 39.025 Ω over the first 10 °C but only 29.323 Ω between 840
            and 850 °C. That shrinkage is the B·T² term, and it is what a
            straight-line approximation throws away — invert a pure{" "}
            <code>R = R0(1 + A·T)</code> line and a sensor actually sitting at
            400 °C (2470.920 Ω) reads back as about 376 °C, some 24 °C low.
            Values below 0 °C are deliberately absent: that branch of IEC 60751
            adds a C coefficient and is not implemented here.
          </p>
        </Section>

        <AdSlot id="pt100-calculator-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Standard", value: "IEC 60751", note: "Callendar-Van Dusen" },
              { name: "A", value: "3.9083 × 10⁻³ °C⁻¹" },
              { name: "B", value: "−5.775 × 10⁻⁷ °C⁻²" },
              { name: "R0", value: "100 Ω (PT100) / 1000 Ω (PT1000)" },
              { name: "Range", value: "0 … 850 °C", note: "T < 0 branch (C term) not implemented" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["thermocouple-calculator", "adc-calculator", "4-20ma-scaling"]} />
      </ToolShell>
    </>
  );
}
