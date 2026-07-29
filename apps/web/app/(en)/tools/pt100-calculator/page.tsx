import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { Pt100Tool } from "@/components/tool/Pt100Tool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "PT100 / PT1000 Calculator — resistance ↔ temperature (IEC 60751)",
  description:
    "Free online PT100/PT1000 RTD calculator: convert resistance to temperature and back using the IEC 60751 Callendar-Van Dusen equation (0–850 °C). 100% in your browser.",
  alternates: toolAlternates("pt100-calculator", "en"),
  openGraph: { images: ["/og/pt100-calculator.png"], siteName: "TestBench.tools", title: "PT100 / PT1000 Calculator — resistance ↔ temperature (IEC 60751)", description: "Free online PT100/PT1000 RTD calculator: convert resistance to temperature and back using the IEC 60751 Callendar-Van Dusen equation (0–850 °C). 100% in your browser.", type: "website" },
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
          equation over 0…850 °C. Reference points: 100 °C ↔ 138.5055 Ω, and a
          measured 108.5 Ω ↔ 21.8189 °C on a PT100.
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
