import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { RmsPeakTool } from "@/components/tool/RmsPeakTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "RMS ↔ Peak Converter — sine wave levels",
  description:
    "Free online RMS, peak and peak-to-peak converter for sine waves, including rectified average. Enter any one level and read the rest. 100% in your browser.",
  openGraph: { title: "RMS ↔ Peak Converter — sine wave levels", description: "Convert RMS, peak, peak-to-peak and rectified average for sine waves.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why is mains '230 V' actually 325 V at its peak?",
    a: "Mains voltage is specified as RMS, the value that delivers the same heating power as an equal DC voltage. For a sine, peak = √2 × RMS, so 230 Vrms swings to ±325 V — the number that matters when choosing capacitor and semiconductor voltage ratings.",
  },
  {
    q: "Do these ratios hold for square or triangle waves?",
    a: "No — they are sine-specific. A square wave has RMS equal to its peak; a triangle wave's RMS is peak/√3. Applying √2 to a non-sinusoidal signal is precisely the mistake cheap 'average-responding' meters make on distorted waveforms.",
  },
  {
    q: "What is the rectified average and why show it?",
    a: "The mean of the absolute value: 2·Vpk/π ≈ 0.637·Vpk for a sine. Average-responding multimeters actually measure this and multiply by 1.111 (the sine form factor) to display 'RMS' — correct only for clean sines, which is why the value is worth knowing.",
  },
  {
    q: "Which level does an oscilloscope show?",
    a: "Scopes measure instantaneous voltage, so cursors naturally give peak and peak-to-peak; most scopes also compute true RMS numerically. Multimeters display RMS. This converter is the bridge when comparing the two instruments' readings.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All conversion runs locally in your browser.",
  },
];

const PY_SNIPPET = `import math

# Sine-wave level relationships
def levels_from_rms(vrms: float):
    vpk = vrms * math.sqrt(2)
    return {"rms": vrms, "peak": vpk,
            "pp": 2 * vpk, "avg_rect": 2 * vpk / math.pi}

lv = levels_from_rms(230)
assert round(lv["peak"], 2) == 325.27
assert round(lv["pp"], 2) == 650.54`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "RMS ↔ Peak Converter", description: metadata.description!, slug: "rms-peak", faqs: FAQS })} />
      <ToolShell slug="rms-peak">
        <RmsPeakTool />
        <AdSlot id="rms-peak-results" />

        <AnswerBox>
          This tool converts between the four ways a sine wave&apos;s amplitude
          gets quoted: RMS, peak, peak-to-peak and rectified average. Enter
          whichever one you have — a multimeter&apos;s RMS, a scope cursor&apos;s
          peak-to-peak — and read the others instantly. Reference: 230 Vrms ↔
          325.27 Vpk ↔ 650.54 Vpp.
        </AnswerBox>

        <Section title="How it works">
          <p>
            For a pure sinusoid <code>v(t) = Vpk·sin(ωt)</code> the levels are
            fixed ratios of each other: RMS (the equivalent-heating value) is{" "}
            <code>Vpk/√2</code>, peak-to-peak is <code>2·Vpk</code>, and the
            rectified average is <code>2·Vpk/π</code>. Instruments disagree
            about which one they report — multimeters speak RMS, oscilloscopes
            speak peak and peak-to-peak — so reconciling readings between them
            is a division or multiplication by √2 away.
          </p>
          <p>
            The ratios above are only valid for clean sines with no DC offset.
            Distorted or non-sinusoidal signals need a true-RMS measurement;
            converting their peak by √2 understates or overstates the power
            depending on the crest factor.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            input: 230 V RMS
            <br />
            peak = 230 × √2 = <span className="text-ok">325.27 V</span>
            <br />
            peak-to-peak = 650.54 V · rectified avg = 207.07 V
          </DataWell>
        </Section>

        <AdSlot id="rms-peak-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "RMS", value: "Vpk / √2", note: "≈ 0.7071 · Vpk" },
              { name: "Peak", value: "√2 · Vrms" },
              { name: "Peak-to-peak", value: "2 · Vpk" },
              { name: "Rectified average", value: "2·Vpk / π", note: "≈ 0.6366 · Vpk" },
              { name: "Validity", value: "pure sine, no DC offset" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["db-dbm", "adc-calculator", "voltage-divider"]} />
      </ToolShell>
    </>
  );
}
