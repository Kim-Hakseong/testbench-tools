import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { I2cPullupTool } from "@/components/tool/I2cPullupTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/i2c-pullup/" },
  title: "I2C Pull-up Calculator — resistor bounds from bus capacitance",
  description:
    "Free online I2C pull-up resistor calculator: minimum and maximum values from VDD, bus capacitance and speed mode, using the I2C specification formulas. 100% in your browser.",
  openGraph: { title: "I2C Pull-up Calculator — resistor bounds from bus capacitance", description: "Min/max pull-up values from VDD, bus capacitance and I2C speed mode.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why is there both a minimum and a maximum resistor value?",
    a: "Two opposing constraints. Too small, and the open-drain driver cannot sink enough current to pull the line down to a valid low (0.4 V at the spec's 3 mA). Too large, and the RC rise through the pull-up misses the spec's rise-time limit for your speed mode. Any value between the bounds works; the geometric middle is a balanced default.",
  },
  {
    q: "How do I estimate my bus capacitance?",
    a: "Sum roughly 10 pF per device pin plus PCB trace capacitance (a common rule of thumb is on the order of 1 pF/cm for typical traces). A small board with three devices lands near 50 pF; long wires and many devices push toward the 400 pF spec limit fast.",
  },
  {
    q: "What changes between Standard, Fast and Fast-mode Plus?",
    a: "The allowed rise time shrinks — 1000 ns, 300 ns, 120 ns respectively — which pushes the maximum resistor down. Fast-mode Plus also raises the spec sink current to 20 mA, which lowers the minimum, keeping a usable window at higher speed.",
  },
  {
    q: "What if the calculator says no valid resistor exists?",
    a: "Your capacitance is too high for the speed mode: the rise-time limit demands a resistor smaller than the sink-current limit allows. Options: reduce capacitance (shorter bus, fewer devices), drop to a slower mode, split the bus, or add a bus buffer/accelerator.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All math runs locally in your browser.",
  },
];

const PY_SNIPPET = `# I2C pull-up bounds (I2C-bus specification formulas)
def i2c_pullup(vdd, cb_farads, t_r_max):
    r_min = (vdd - 0.4) / 3e-3          # VOL 0.4 V at IOL 3 mA
    r_max = t_r_max / (0.8473 * cb_farads)
    return r_min, r_max

# 5 V, 200 pF, Standard-mode (t_r <= 1000 ns):
r_min, r_max = i2c_pullup(5, 200e-12, 1000e-9)
assert round(r_min) == 1533 and round(r_max) == 5901`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "I2C Pull-up Calculator", description: metadata.description!, slug: "i2c-pullup", faqs: FAQS })} />
      <ToolShell slug="i2c-pullup">
        <I2cPullupTool />
        <AdSlot id="i2c-pullup-results" />

        <AnswerBox>
          This tool computes the valid pull-up resistor window for an I2C bus
          from supply voltage, bus capacitance and speed mode, using the
          formulas in the I2C-bus specification — plus a suggested standard
          E24 value at the geometric middle. Example: 5 V and 200 pF in
          Standard mode allow roughly 1.5 kΩ to 5.9 kΩ.
        </AnswerBox>

        <Section title="How it works">
          <p>
            I2C lines are open-drain: devices only pull low, and the resistor
            pulls high. The rising edge is therefore an RC curve through the
            pull-up, and the specification caps its 30→70 % rise time per
            mode, giving <code>R_max = t_r / (0.8473 · C_b)</code>. The falling
            edge is limited by the driver&apos;s sink capability — it must
            reach V_OL = 0.4 V while sinking the spec current — giving{" "}
            <code>R_min = (V_DD − 0.4) / I_OL</code>. Between the two bounds,
            smaller resistors give crisper edges at more supply current;
            larger ones save power.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            VDD 5 V · C_b 200 pF · Standard mode (t_r ≤ 1000 ns)
            <br />
            R_min = (5−0.4)/3 mA = <span className="text-ok">1.53 kΩ</span>
            <br />
            R_max = 1000 ns/(0.8473 × 200 pF) = <span className="text-ok">5.90 kΩ</span>
          </DataWell>
        </Section>

        <AdSlot id="i2c-pullup-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Standard (100 kHz)", value: "t_r ≤ 1000 ns · I_OL 3 mA" },
              { name: "Fast (400 kHz)", value: "t_r ≤ 300 ns · I_OL 3 mA" },
              { name: "Fast-mode Plus (1 MHz)", value: "t_r ≤ 120 ns · I_OL 20 mA" },
              { name: "R_max", value: "t_r / (0.8473 · C_b)", note: "rise-time limit" },
              { name: "R_min", value: "(V_DD − 0.4 V) / I_OL", note: "sink-current limit" },
            ]}
          />
        </Section>

        <Section title="Python implementation">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["voltage-divider", "uart-baud-error", "stm32-timer"]} />
      </ToolShell>
    </>
  );
}
