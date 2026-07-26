import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { QFormatTool } from "@/components/tool/QFormatTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Fixed-Point Q-Format Converter — Qm.n ↔ real value",
  description:
    "Free online fixed-point converter: real values ↔ signed Qm.n (Q15, Q31, Q7.8 …) with range, resolution and quantization error. 100% in your browser.",
  openGraph: { title: "Fixed-Point Q-Format Converter — Qm.n ↔ real value", description: "Real values ↔ signed Qm.n (Q15, Q31, Q7.8 …) with range, resolution and quantization error.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What does Qm.n mean exactly?",
    a: "A signed fixed-point format with 1 sign bit, m integer bits and n fraction bits (1+m+n bits total). The stored integer counts steps of 2⁻ⁿ: value = raw / 2ⁿ. Q15 is shorthand for Q0.15 — a 16-bit format spanning −1 to 1−2⁻¹⁵, the workhorse of fixed-point DSP.",
  },
  {
    q: "Why does encoding 1.0 in Q15 give 0x7FFF instead of an exact 1?",
    a: "Q0.15 cannot represent +1.0: its maximum is 1 − 2⁻¹⁵ ≈ 0.99997. The converter clamps to the nearest representable value and tells you it did — the same saturation a DSP's saturating arithmetic performs.",
  },
  {
    q: "How large is the quantization error?",
    a: "At most half a step when rounding: 2⁻ⁿ/2. For Q15 that is about 1.5×10⁻⁵. The converter reports the exact error for your value — stored minus requested.",
  },
  {
    q: "How do I multiply two Q15 numbers in C?",
    a: "Multiply as 32-bit integers, then shift right by 15 (with rounding if desired): (int16_t)(((int32_t)a * b) >> 15). The intermediate product is Q30, and the shift renormalizes to Q15 — see the snippet below.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All conversion happens locally in your browser.",
  },
];

const C_SNIPPET = `#include <stdint.h>

#define Q15(x)  ((int16_t)((x) * 32768.0f))   /* encode at compile time */

/* value = raw / 2^15;  0.5 -> 0x4000, -1.0 -> 0x8000 */
float q15_to_float(int16_t raw) { return raw / 32768.0f; }

int16_t q15_mul(int16_t a, int16_t b)
{
    return (int16_t)(((int32_t)a * b) >> 15);   /* Q15 x Q15 -> Q15 */
}`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Fixed-Point Q-Format Converter", description: metadata.description!, slug: "q-format", faqs: FAQS })} />
      <ToolShell slug="q-format">
        <QFormatTool />
        <AdSlot id="q-format-results" />

        <AnswerBox>
          This tool converts real numbers to signed fixed-point Qm.n
          representation and back — Q15, Q31, Q7.8 or any custom split up to 32
          bits. It shows the raw two&apos;s-complement word, the value actually
          stored after rounding, the quantization error, and the format&apos;s
          range and resolution. Reference: <code>0.5</code> in Q15 is{" "}
          <code>0x4000</code>, <code>−1</code> is <code>0x8000</code>.
        </AnswerBox>

        <Section title="How it works">
          <p>
            Fixed-point stores a real number as an integer count of fixed-size
            steps: <code>raw = round(value × 2ⁿ)</code>, decoded as{" "}
            <code>value = raw ÷ 2ⁿ</code>. With m integer bits and one sign bit
            the representable range is <code>−2ᵐ … 2ᵐ − 2⁻ⁿ</code> at a uniform
            resolution of <code>2⁻ⁿ</code>. Unlike floating point, precision is
            constant across the range and arithmetic maps to plain integer
            instructions — which is why MCUs without an FPU and deterministic
            DSP pipelines still run on Q formats.
          </p>
          <p>
            Values outside the range saturate (clamp) rather than wrap here,
            matching the saturating arithmetic DSP hardware applies, and the
            panel flags when that happened.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            format Q0.15 (16-bit) · value 0.5
            <br />
            raw = round(0.5 × 2¹⁵) = 16384 = <span className="text-ok">0x4000</span>
            <br />
            −1.0 → −32768 = 0x8000 · 1.0 → <span className="text-warn">clamped</span> to 0x7FFF (max 1 − 2⁻¹⁵)
          </DataWell>
        </Section>

        <AdSlot id="q-format-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Layout", value: "1 sign + m int + n frac", note: "total ≤ 32 bits" },
              { name: "Encode", value: "raw = round(v · 2ⁿ)", note: "saturating at range ends" },
              { name: "Decode", value: "v = raw ÷ 2ⁿ" },
              { name: "Range", value: "−2ᵐ … 2ᵐ − 2⁻ⁿ" },
              { name: "Resolution", value: "2⁻ⁿ", note: "uniform across the range" },
            ]}
          />
        </Section>

        <Section title="C implementation">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["ieee-754-float", "twos-complement", "adc-calculator"]} />
      </ToolShell>
    </>
  );
}
