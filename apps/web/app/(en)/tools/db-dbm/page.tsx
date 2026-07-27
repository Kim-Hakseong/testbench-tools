import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { DbDbmTool } from "@/components/tool/DbDbmTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/db-dbm/" },
  title: "dB · dBm Calculator — ratios, absolute power, Vrms",
  description:
    "Free online dB and dBm calculator: power/voltage ratios ↔ dB, dBm ↔ watts, and the RMS voltage at 50/75/600 Ω. 100% in your browser.",
  openGraph: { title: "dB · dBm Calculator — ratios, absolute power, Vrms", description: "Power/voltage ratios ↔ dB, dBm ↔ watts, and RMS voltage at 50/75/600 Ω.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What is the difference between dB and dBm?",
    a: "dB is a ratio — dimensionless, always relative to something. dBm is an absolute power level: decibels relative to exactly 1 mW. '−10 dB' says a signal lost 90 % of its power; '−10 dBm' says it is 0.1 mW, full stop.",
  },
  {
    q: "Why 10·log for power but 20·log for voltage?",
    a: "Power is proportional to voltage squared (P = V²/R), and the square becomes a factor of two outside the logarithm. Both formulas describe the same power ratio when the impedance is equal on both sides — doubling voltage is +6 dB precisely because it quadruples power (+6 dB).",
  },
  {
    q: "How does 0 dBm become 0.224 Vrms at 50 Ω?",
    a: "0 dBm is 1 mW by definition. Across an impedance R the RMS voltage is √(P·R) = √(0.001 × 50) ≈ 0.2236 V. The same 1 mW is 0.775 Vrms at 600 Ω — which is exactly where the audio industry's dBu reference comes from.",
  },
  {
    q: "What are the handy mental-math values?",
    a: "+3 dB ≈ ×2 power, +10 dB = ×10 power, +6 dB ≈ ×2 voltage, +20 dB = ×10 voltage. Chain them: +13 dB is 3+10, so ×20 in power. The calculator confirms the exact figures (3.01 dB, not 3).",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All math runs locally in your browser.",
  },
];

const PY_SNIPPET = `import math

db_power   = lambda ratio: 10 * math.log10(ratio)
db_voltage = lambda ratio: 20 * math.log10(ratio)
dbm_to_w   = lambda dbm: 1e-3 * 10 ** (dbm / 10)
vrms       = lambda watts, ohms: math.sqrt(watts * ohms)

assert round(db_power(2), 4) == 3.0103
assert dbm_to_w(0) == 1e-3
assert round(vrms(dbm_to_w(0), 50), 4) == 0.2236`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "dB · dBm Calculator", description: metadata.description!, slug: "db-dbm", faqs: FAQS })} />
      <ToolShell slug="db-dbm">
        <DbDbmTool />
        <AdSlot id="db-dbm-results" />

        <AnswerBox>
          This tool handles the three decibel jobs that come up at the bench:
          converting power or voltage ratios to dB and back, converting
          absolute dBm to watts, and telling you the RMS voltage a given dBm
          level produces across 50, 75 or 600 Ω. Reference points: ×2 power =
          3.01 dB, and 0 dBm = 1 mW = 0.2236 Vrms at 50 Ω.
        </AnswerBox>

        <Section title="How it works">
          <p>
            The decibel compresses multiplicative chains into additions:{" "}
            <code>dB = 10·log₁₀(P₂/P₁)</code> for power, and since power goes
            as voltage squared, <code>dB = 20·log₁₀(V₂/V₁)</code> for voltage
            at equal impedance. dBm anchors the scale to an absolute reference
            of 1 mW — <code>P = 1 mW·10^(dBm/10)</code> — and the voltage
            across an impedance follows from <code>V = √(P·R)</code>. Cascade
            gains and losses by simply summing their dB values.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            power ratio 2 → 10·log₁₀(2) = <span className="text-ok">3.0103 dB</span>
            <br />
            0 dBm = 1 mW → √(0.001 × 50) = <span className="text-ok">0.2236 Vrms</span> @ 50 Ω
            <br />
            30 dBm = 1 W · −30 dBm = 1 µW
          </DataWell>
        </Section>

        <AdSlot id="db-dbm-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Power ratio", value: "dB = 10·log₁₀(P₂/P₁)" },
              { name: "Voltage ratio", value: "dB = 20·log₁₀(V₂/V₁)", note: "equal impedances" },
              { name: "dBm", value: "ref 1 mW", note: "absolute level" },
              { name: "Vrms", value: "√(P·R)", note: "50 / 75 / 600 Ω presets" },
              { name: "Rules of thumb", value: "+3 dB ≈ ×2 P · +20 dB = ×10 V" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["rms-peak", "voltage-divider", "adc-calculator"]} />
      </ToolShell>
    </>
  );
}
