import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { VoltageDividerTool } from "@/components/tool/VoltageDividerTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/voltage-divider/" },
  title: "Voltage Divider Calculator — formula, E24/E96 pairs, ADC loading",
  description:
    "Free online voltage divider calculator: the formula Vout = Vin·R2/(R1+R2) and its inverse R1 = R2·(Vin−Vout)/Vout, the best standard E24/E96 resistor pairs for a target ratio with error percentages, a table of 5, 10, 24 and 48 V dividers scaled to 3.3 V and 5 V ADC inputs, and the loading error the divider's source resistance causes. 100% in your browser.",
  openGraph: { url: "/tools/voltage-divider/",
    images: ["/og/voltage-divider.png"], siteName: "TestBench.tools", title: "Voltage Divider Calculator — formula, E24/E96 pairs, ADC loading", description: "The divider formula both ways, best E24/E96 pairs for a target ratio, and dividers for 24 V / 10 V inputs on a 3.3 V ADC.", type: "website" },
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
    a: "The formula assumes an unloaded output. Any load — an ADC input, a following stage — appears in parallel with R2 and pulls Vout down. The exact loaded output is Vout/(1 + R_th/R_L), where R_th = R1·R2/(R1+R2) is the divider's own source resistance, so the sag is a function of the R_L/R_th ratio alone: 10× costs 9.09 %, 100× costs 0.99 %. Keep the load at least 100× R_th, or buffer the divider with an op-amp follower.",
  },
  {
    q: "What resistor ratio do I need for a 24 V input on a 3.3 V ADC?",
    a: "Only the ratio is fixed by the voltages: R1/R2 = Vin/Vout − 1 = 24/3.3 − 1 = 6.273. With R2 = 10.0 kΩ the ideal R1 is 62 727 Ω, and the nearest E96 value is 63.4 kΩ, which gives 240/73.4 = 3.270 V — 0.92 % low. Leaving R1 at 63.4 kΩ and moving R2 to 10.2 kΩ, also an E96 value, lands at 244.8/73.6 = 3.326 V, +0.79 %. The table on this page lists the same calculation for 5, 10, 24 and 48 V inputs.",
  },
  {
    q: "What does a divider look like to an ADC input?",
    a: "A voltage source of Vin·R2/(R1+R2) behind R_th = R1∥R2 — always less than either resistor. On a sampling ADC the load is the sample-and-hold capacitor rather than a resistance, and it has to charge through R_th inside the sampling window, with time constant R_th·C_sh. That failure mode reads as a value that is low and changes with sample rate, not as a fixed offset, which is why a 24 V → 3.3 V divider at R_th 8.638 kΩ may need to come down a decade even though its nominal error is under 1 %.",
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
print(vout(5, 5110, 9760))   # 48.8/14.87 = 3.2818 V  (-0.55 %)

# The inverse: the R1 that puts a given Vin at Vout, with R2 fixed
def r1_for(vin, vout_target, r2):
    return r2 * (vin - vout_target) / vout_target

print(r1_for(24, 3.3, 10_000))   # 62 727 ohm -> nearest E96 is 63.4k`;

/* Sensing dividers for the input ranges that turn up on instrument and PLC
   inputs, all with R2 = 10.0 kΩ so the rows are comparable. R1 is the E96
   value nearest the ideal R2·(Vin−Vout)/Vout, i.e. what nearestValue() in the
   engine returns, and Vout is that pair's exact unloaded output. R_th = R1∥R2
   is what the following stage sees; I = Vin/(R1+R2) is the standing drain. */
const DIVIDER_ROWS = [
  { name: "5 V → 3.3 V", value: "R1 5.11k / R2 10.0k → 50/15.11 = 3.309 V", note: "needs R1/R2 0.515 · +0.27 % · R_th 3.382 kΩ · 331 µA" },
  { name: "10 V → 5 V", value: "R1 10.0k / R2 10.0k → 100/20 = 5.000 V", note: "needs R1/R2 1.000 · exact · R_th 5.000 kΩ · 500 µA" },
  { name: "10 V → 3.3 V", value: "R1 20.5k / R2 10.0k → 100/30.5 = 3.279 V", note: "needs R1/R2 2.030 · −0.65 % · R_th 6.721 kΩ · 328 µA" },
  { name: "24 V → 5 V", value: "R1 38.3k / R2 10.0k → 240/48.3 = 4.969 V", note: "needs R1/R2 3.800 · −0.62 % · R_th 7.930 kΩ · 497 µA" },
  { name: "24 V → 3.3 V", value: "R1 63.4k / R2 10.0k → 240/73.4 = 3.270 V", note: "needs R1/R2 6.273 · −0.92 % · R_th 8.638 kΩ · 327 µA" },
  { name: "48 V → 3.3 V", value: "R1 137k / R2 10.0k → 480/147 = 3.265 V", note: "needs R1/R2 13.545 · −1.05 % · R_th 9.320 kΩ · 327 µA" },
];

/* Loading error against the Thevenin source resistance, not against R2:
   Vout_loaded = Vout/(1 + R_th/R_L), so the relative sag is
   −(R_th/R_L)/(1 + R_th/R_L) regardless of Vin or the ratio. */
const LOADING_ROWS = [
  { name: "R_L = 10 × R_th", value: "−9.09 %", note: "1/(1 + 1/10) = 0.9091" },
  { name: "R_L = 20 × R_th", value: "−4.76 %", note: "1/(1 + 1/20) = 0.9524" },
  { name: "R_L = 50 × R_th", value: "−1.96 %", note: "1/(1 + 1/50) = 0.9804" },
  { name: "R_L = 100 × R_th", value: "−0.99 %", note: "1/(1 + 1/100) = 0.9901" },
  { name: "R_L = 1000 × R_th", value: "−0.10 %", note: "1/(1 + 1/1000) = 0.9990" },
];

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
          that best hit a target ratio, ranked by error. The formula is{" "}
          <code>Vout = Vin·R2/(R1+R2)</code> and, solved for the resistors,{" "}
          <code>R1 = R2·(Vin − Vout)/Vout</code>. 12 V through equal 10 kΩ
          resistors gives 6 V; 5 V → 3.3 V lands within 1 % with ordinary E96
          parts. The tables below give ready E96 pairs for 5, 10, 24 and 48 V
          inputs scaled to a 3.3 V or 5 V ADC, and the loading error the
          divider&apos;s own source resistance <code>R1∥R2</code> causes.
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
            target 5 V → 3.3 V (E96, ~10 k): R1 5.11k / R2 9.76k → 48.8/14.87 = 3.282 V (−0.55 %)
            <br />
            same R1 with R2 10.0k: 50/15.11 = <span className="text-ok">3.309 V</span> (+0.27 %)
          </DataWell>
        </Section>

        <Section title="The formula in the other direction">
          <p>
            Most of the time you know the two voltages and need the resistors,
            not the other way round. Rearranging{" "}
            <code>Vout = Vin·R2/(R1+R2)</code> for either resistor gives{" "}
            <code>R1 = R2·(Vin − Vout)/Vout</code> and{" "}
            <code>R2 = R1·Vout/(Vin − Vout)</code>. Only the ratio is fixed by
            the voltages: <code>R1/R2 = Vin/Vout − 1</code>, so a 24 V input
            landing on a 3.3 V full scale always needs R1/R2 = 6.273, whether
            that is 63.4 kΩ over 10 kΩ or 634 Ω over 100 Ω. The second decision
            — which decade — is the impedance level, and it is the one that
            decides drain current and loading, not accuracy.
          </p>
          <p>
            That is exactly what the finder tab does internally: it walks R2
            through the chosen IEC 60063 series, computes the ideal{" "}
            <code>R2·(Vin − Vout)/Vout</code> for each, snaps it to the nearest
            standard value and ranks what is left by error. Shifting R2 one
            step off the round number often beats the obvious pair: for
            24 V → 3.3 V, R2 10.0 kΩ gives −0.92 %, while R2 10.2 kΩ with the
            same 63.4 kΩ top resistor gives 244.8/73.6 = 3.326 V, +0.79 %.
          </p>
        </Section>

        <AdSlot id="voltage-divider-content" />

        <Section title="Dividers for 24 V, 10 V and 48 V inputs on a 3.3 V or 5 V ADC">
          <p>
            Scaling a field voltage down to what a microcontroller can sample
            is the everyday use of a divider on instrument and PLC inputs: a
            0–10 V analog signal, a 24 V control rail, a 48 V supply rail. Each
            row below fixes R2 at 10.0 kΩ and takes the E96 value nearest the
            ideal R1, so the rows are directly comparable; the right column
            carries the ratio the voltages demand, the resulting error, the
            source resistance the ADC sees and the current the divider burns
            continuously.
          </p>
          <ParamsTable rows={DIVIDER_ROWS} />
          <p>
            Two things to read off the table. First, the error grows with the
            ratio, and not because the standard values get coarser — E96 steps
            are 10^(1/96) ≈ 2.4 % apart everywhere. It is the sensitivity that
            changes: a relative error in R1 reaches the output scaled by
            (R1/R2)/(1 + R1/R2), which is 0.34 for the 5 V row and 0.93 for the
            48 V row. The 137 kΩ part sits 1.14 % above the ideal 135.45 kΩ and
            1.14 × 0.93 is the −1.05 % in the table, while the 5.11 kΩ part
            sits 0.81 % below its ideal and 0.81 × 0.34 gives +0.27 %. Dividers
            with a large ratio want the tighter series.
          </p>
          <p>
            Second, the standing drain is the same ~330 µA across every 3.3 V
            row despite input voltages from 5 to 48 V. That is exact, not a
            coincidence: when the ratio is right, R1 + R2 = R2·Vin/Vout, so
            Vin/(R1+R2) collapses to <code>Vout/R2</code> — 3.3 V over 10 kΩ.
            The input voltage never enters it. If that current matters on a
            loop-powered or battery device, raise both resistors a decade; the
            ratios stay valid and the current drops tenfold, at the cost of a
            ten times larger R_th in the next section.
          </p>
        </Section>

        <Section title="Source resistance and loading error">
          <p>
            The divider output is not a voltage source. Seen from the tap it is
            a Thevenin source of <code>Vin·R2/(R1+R2)</code> behind{" "}
            <code>R_th = R1·R2/(R1+R2)</code> — the two resistors in parallel,
            which is always smaller than either one. Any load R_L then forms a
            second divider with R_th, so{" "}
            <code>Vout_loaded = Vout/(1 + R_th/R_L)</code>. The sag depends only
            on the R_L/R_th ratio, never on Vin or on which pair produced the
            ratio:
          </p>
          <ParamsTable rows={LOADING_ROWS} />
          <p>
            This is why the reference for the usual &ldquo;keep the load far
            above the divider&rdquo; rule is R_th and not R2: with the 24 V →
            3.3 V row above, R2 is 10 kΩ but R_th is 8.638 kΩ, and a load has
            to beat that figure by 100× to stay inside 1 %. On an ADC input the
            load is not a resistor but the sample-and-hold capacitor, which has
            to charge through R_th within the sampling window — the time
            constant is <code>R_th·C_sh</code>, so a high-impedance divider
            shows up as a reading that is low and drifts with sample rate
            rather than as a clean offset. The fixes are the usual two: drop
            the divider a decade, or buffer the tap with an op-amp follower.
          </p>
        </Section>

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Formula", value: "Vout = Vin·R2/(R1+R2)", note: "unloaded" },
              { name: "Inverse", value: "R1 = R2·(Vin−Vout)/Vout", note: "R1/R2 = Vin/Vout − 1" },
              { name: "E24", value: "24 values/decade", note: "±5 % family (IEC 60063)" },
              { name: "E96", value: "96 values/decade", note: "±1 % family" },
              { name: "Search", value: "best pairs by |error|", note: "top 5 shown" },
              { name: "Source resistance", value: "R_th = R1·R2/(R1+R2)", note: "what the next stage sees" },
              { name: "Loaded output", value: "Vout/(1 + R_th/R_L)", note: "≥100× R_th for <1 %" },
              { name: "Standing current", value: "Vin/(R1+R2)", note: "continuous drain" },
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
