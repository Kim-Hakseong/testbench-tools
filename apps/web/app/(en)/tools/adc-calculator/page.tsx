import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { AdcTool } from "@/components/tool/AdcTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "ADC Calculator — counts ↔ voltage, LSB size",
  description:
    "Free online ADC calculator: convert ADC counts to voltage and back for 8–24 bit converters, with LSB size. Uses the count/(2^N−1) convention. 100% in your browser.",
  alternates: toolAlternates("adc-calculator", "en"),
  openGraph: { title: "ADC Calculator — counts ↔ voltage, LSB size", description: "Free online ADC calculator: convert ADC counts to voltage and back for 8–24 bit converters, with LSB size. Uses the count/(2^N−1) convention. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which conversion convention does this calculator use?",
    a: "ratio = count / (2^N − 1), i.e. the all-ones code corresponds exactly to Vref. Some datasheets instead use count / 2^N, where full scale is Vref × (1 − 1/2^N). The difference is one LSB at full scale — check your converter's datasheet, and mind the convention when comparing numbers.",
  },
  {
    q: "What is an LSB in volts?",
    a: "One least-significant-bit step equals Vref / (2^N − 1) under this convention. For a 12-bit ADC at 3.3 V that is 3.3 / 4095 ≈ 0.805861 mV — the smallest voltage change the converter can represent.",
  },
  {
    q: "Why does count 2048 not give exactly half of 3.3 V?",
    a: "Half of 4095 is 2047.5, which is not an integer code. Code 2048 is therefore just above mid-scale: 2048/4095 × 3.3 = 1.650403 V rather than 1.65 V exactly.",
  },
  {
    q: "Does this account for ADC error sources?",
    a: "No — it computes the ideal transfer function only. Offset, gain error, INL/DNL and reference drift add on top; consult the datasheet for those terms.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Everything runs locally in your browser.",
  },
];

const C_SNIPPET = `/* Ideal ADC transfer, convention: ratio = count / (2^N - 1) */
float adc_to_voltage(unsigned count, unsigned bits, float vref)
{
    unsigned max_code = (1u << bits) - 1u;
    return (float)count * vref / (float)max_code;
}
/* 12-bit, 3.3 V: 4095 -> 3.3000 V, 2048 -> 1.650403 V
 * LSB = 3.3 / 4095 = 0.805861 mV */`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "ADC Calculator",
          description: metadata.description!,
          slug: "adc-calculator",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="adc-calculator">
        <AdcTool />
        <AdSlot id="adc-calculator-results" />

        <AnswerBox>
          This tool converts ADC counts to input voltage and back for 8- to
          24-bit converters, and reports the LSB size. It uses the{" "}
          <code>count / (2ᴺ − 1)</code> convention — stated on the panel, since
          mixing conventions is the classic source of one-LSB disagreements
          between calculated and datasheet values.
        </AnswerBox>

        <Section title="How it works">
          <p>
            An ideal N-bit ADC divides its reference voltage into equal steps.
            Under the convention used here the top code (all ones,{" "}
            <code>2ᴺ − 1</code>) reads exactly Vref, so{" "}
            <code>V = count × Vref / (2ᴺ − 1)</code> and one LSB is{" "}
            <code>Vref / (2ᴺ − 1)</code>. The reverse direction rounds to the
            nearest code and clamps into the valid range, which is what a real
            converter does at the rails.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            12-bit ADC · Vref 3.3 V
            <br />
            count 4095 → <span className="text-ok">3.3000 V</span> (full scale)
            <br />
            count 2048 → 1.650403 V
            <br />
            LSB = 3.3 / 4095 = 0.805861 mV
          </DataWell>
        </Section>

        <AdSlot id="adc-calculator-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Resolution", value: "8 / 10 / 12 / 14 / 16 / 24 bit" },
              { name: "Convention", value: "ratio = count / (2ᴺ − 1)", note: "full scale = all-ones code" },
              { name: "LSB", value: "Vref / (2ᴺ − 1)" },
              { name: "Reverse", value: "round + clamp", note: "0 … 2ᴺ − 1" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["plc-analog-scaling", "voltage-divider", "pt100-calculator"]} />
      </ToolShell>
    </>
  );
}
