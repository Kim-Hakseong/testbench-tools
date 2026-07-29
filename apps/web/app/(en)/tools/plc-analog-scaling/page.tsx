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
    "Free online PLC analog scaling calculator: convert raw ADC counts to engineering units and back, with manual-verified presets for Siemens S7, Mitsubishi R60AD4, AB SLC 1746-NI4 and LS XGF-AD4S. 100% in your browser.",
  alternates: toolAlternates("plc-analog-scaling", "en"),
  openGraph: { images: ["/og/plc-analog-scaling.png"], siteName: "TestBench.tools", title: "PLC Analog Scaling Calculator — raw counts ↔ engineering units", description: "Free online PLC analog scaling calculator: convert raw ADC counts to engineering units and back, with manual-verified presets for Siemens S7, Mitsubishi R60AD4, AB SLC 1746-NI4 and LS XGF-AD4S. 100% in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What is the Siemens S7 raw range?",
    a: "S7 analog input modules deliver 0 to 27648 counts for a nominal 0–100 % input signal. Raw 13824 — exactly half of 27648 — therefore scales to 50.0 on a 0–100 range.",
  },
  {
    q: "Why is a preset named after a module rather than a vendor?",
    a: "Because a raw range belongs to a module and an input range, not to a maker. Mitsubishi's R60AD4 gives 0 to 32000 on a normal 4–20mA range but −8000 to 32000 in extended mode; the SLC 1746-NI4 gives 3277 to 16384 on 4–20mA; and the LS XGF-AD4S lets you pick signed, percentile or precise output per channel, each with its own range. A single number per vendor would be wrong more often than right.",
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
          back. Pick a verified module preset or enter any
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
            Vendor presets here are gated: a raw
            range ships only once its manual reference is recorded in the
            project's spec gate, each citing the module manual it came from. Modules
            that have not been checked are absent rather than guessed — use the
            custom range fields for those.
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
              { name: "Siemens S7", value: "0 … 27648", note: "rated analogue range" },
              { name: "Mitsubishi R60AD4", value: "0 … 32000", note: "0–10V / 4–20mA · SH-081232ENG" },
              { name: "Mitsubishi R60AD4 extended", value: "−8000 … 32000", note: "4–20mA extended mode" },
              { name: "AB SLC 1746-NI4", value: "3277 … 16384", note: "4–20mA input · 1746-UM005B-EN-P" },
              { name: "LS XGF-AD4S precise", value: "4000 … 20000", note: "4–20mA · XGF-AD4S V1.4" },
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
