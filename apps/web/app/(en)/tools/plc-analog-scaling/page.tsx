import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { PlcScalingTool } from "@/components/tool/PlcScalingTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "PLC Analog Scaling Calculator — raw counts ↔ engineering units",
  description:
    "Free online PLC analog scaling calculator: convert raw ADC counts to engineering units and back, with the verified Siemens S7 0–27648 preset or a custom raw range. 100% in your browser.",
  alternates: toolAlternates("plc-analog-scaling", "en"),
  openGraph: { title: "PLC Analog Scaling Calculator — raw counts ↔ engineering units", description: "Free online PLC analog scaling calculator: convert raw ADC counts to engineering units and back, with the verified Siemens S7 0–27648 preset or a custom raw range. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What is the Siemens S7 raw range?",
    a: "S7 analog input modules deliver 0 to 27648 counts for a nominal 0–100 % input signal. Raw 13824 — exactly half of 27648 — therefore scales to 50.0 on a 0–100 range. That preset is the only vendor range shipped here, because it is the only one recorded with a source in this project's verification file.",
  },
  {
    q: "Why are Allen-Bradley and Mitsubishi presets missing?",
    a: "This site implements vendor constants only after they are recorded with a manual reference in its spec file (a correctness gate). Until then, use the Custom raw range option — the math is identical once you know your module's counts.",
  },
  {
    q: "What formula does the scaling use?",
    a: "Plain linear interpolation: eng = engMin + (raw − rawMin) × (engMax − engMin) / (rawMax − rawMin). The reverse direction inverts it and rounds to the nearest integer count.",
  },
  {
    q: "What happens if my raw value is outside the configured range?",
    a: "The calculator extrapolates linearly and shows a warning. Real modules clip or signal overflow instead, so an out-of-range result usually means the wrong raw range is configured.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All scaling runs locally in your browser.",
  },
];

const C_SNIPPET = `/* Raw PLC counts -> engineering units (linear) */
float plc_scale(long raw, long raw_min, long raw_max,
                float eng_min, float eng_max)
{
    return eng_min + (float)(raw - raw_min)
         * (eng_max - eng_min) / (float)(raw_max - raw_min);
}
/* S7: plc_scale(13824, 0, 27648, 0.0f, 100.0f) -> 50.0f */`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "PLC Analog Scaling Calculator",
          description: metadata.description!,
          slug: "plc-analog-scaling",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="plc-analog-scaling">
        <PlcScalingTool />
        <AdSlot id="plc-analog-scaling-results" />

        <AnswerBox>
          This tool converts raw PLC analog counts into engineering units and
          back. Pick the verified Siemens S7 preset (0…27648) or enter any
          custom raw range, set your engineering range, and the conversion —
          with percent of span — updates live in both directions.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Analog input modules digitize their electrical input into an integer
            raw range; your program then maps counts onto physical units with a
            straight line:{" "}
            <code>eng = engMin + (raw − rawMin) × span ÷ rawSpan</code>. The
            calculation is symmetric, so the same tool converts a target
            engineering value back into the raw count to expect — useful when
            forcing test values or checking a transmitter against a live PLC
            tag.
          </p>
          <p>
            Vendor presets in this tool are deliberately conservative: a raw
            range ships only once its manual reference is recorded in the
            project's spec gate. Today that is Siemens S7 (0…27648); other
            vendors are available through the custom range fields.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            preset: Siemens S7 (0…27648) · engineering range 0…100
            <br />
            raw 13824 → <span className="text-ok">50.0</span> (exactly half of 27648)
            <br />
            raw 27648 → 100 · raw 0 → 0
          </DataWell>
        </Section>

        <AdSlot id="plc-analog-scaling-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Siemens S7", value: "0 … 27648", note: "verified preset (spec-gated)" },
              { name: "Allen-Bradley", value: "—", note: "pending manual verification" },
              { name: "Mitsubishi", value: "—", note: "pending manual verification" },
              { name: "LS ELECTRIC", value: "—", note: "pending manual verification" },
              { name: "Custom", value: "any raw range", note: "same linear formula" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["4-20ma-scaling", "adc-calculator", "two-point-calibration"]} />
      </ToolShell>
    </>
  );
}
