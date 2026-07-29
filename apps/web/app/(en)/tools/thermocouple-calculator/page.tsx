import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { ThermocoupleTool } from "@/components/tool/ThermocoupleTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/thermocouple-calculator/" },
  title: "Thermocouple Calculator — mV ↔ °C with cold junction, ITS-90",
  description:
    "Free thermocouple calculator for types K, J, T, E, N, R, S and B: millivolts to temperature with cold-junction compensation, using the NIST ITS-90 reference functions. 100% in your browser.",
  openGraph: {
    title: "Thermocouple Calculator — types K, J, T, E, N, R, S, B",
    description: "mV ↔ °C on the NIST ITS-90 reference functions, with cold-junction compensation.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "Why is my reading wrong without cold-junction compensation?",
    a: "Because a thermocouple measures the difference between its two junctions, not an absolute temperature. The reference functions assume the cold junction sits at 0 °C, but yours is at whatever your terminal block is — so the measured voltage is short by the emf that corresponds to that temperature. Add the cold junction's voltage to what you measured, then invert. This calculator does that in one step and shows both parts.",
  },
  {
    q: "Which types are covered?",
    a: "All eight letter-designated types: K, J, T, E, N, R, S and B, each over the full range NIST publishes for it. The coefficients come from a single source chain, so no type is better sourced than another.",
  },
  {
    q: "How accurate is the mV to °C direction?",
    a: "It is an approximation, not an exact inverse. NIST publishes the polynomials together with a residual band per sub-range — for type K that is about −0.05 to +0.06 °C — and the calculator shows the band for whichever sub-range applied. That figure is the polynomial's own error only; your sensor tolerance, extension wire and cold-junction sensor all add uncertainty on top of it.",
  },
  {
    q: "Why does type B refuse anything below 250 °C?",
    a: "Because its curve doubles back. Type B's emf falls, reaches a minimum near 21 °C, then rises again, so a single low voltage corresponds to two temperatures and no inverse exists there. That is a property of the couple, not a gap in the tool — which is why type B is used at high temperatures and its cold junction barely matters.",
  },
  {
    q: "Why are the wire colours not shown?",
    a: "Because they are not in the same document. The reference functions come from NIST Monograph 175; colour codes are specified by ANSI/ASTM E230 and IEC 60584-3, and they differ between them — the same type is a different colour depending on which standard your cable follows. Publishing one set here would mislead half the readers.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Every calculation runs in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Thermocouple Calculator", description: metadata.description!, slug: "thermocouple-calculator", faqs: FAQS })} />
      <ToolShell slug="thermocouple-calculator">
        <ThermocoupleTool />
        <AdSlot id="thermocouple-calculator-results" />

        <AnswerBox>
          This calculator converts between thermocouple voltage and temperature
          on the NIST ITS-90 reference functions, for types K, J, T, E, N, R, S
          and B. Its main mode takes the voltage you measured plus your cold
          junction temperature and returns the hot-junction temperature, which is
          the number you actually want. Reference: type K at 100 °C produces
          4.0962 mV with the cold junction at 0 °C.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A thermocouple produces an emf from the difference between its
            measuring junction and its reference junction. The published
            reference functions assume that reference junction is held at
            0 °C — an ice bath, historically. Real instruments terminate at a
            block sitting at room temperature instead, so the voltage arriving at
            the input is smaller than the tables expect by exactly the emf of the
            block&apos;s own temperature. Adding that back before inverting is
            cold-junction compensation, and getting it wrong shifts every reading
            by roughly the room temperature.
          </p>
          <p>
            Neither direction is a single formula. NIST splits each type into
            sub-ranges with their own polynomials, and type K carries an extra
            exponential term above 0 °C — omit it and readings run about
            2.7 °C low at 100 °C while still looking entirely plausible. The
            inverse direction is a fitted approximation rather than an exact
            reversal, so this tool reports which sub-range applied and the
            residual band NIST publishes for it, instead of presenting a number
            as if it were exact.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            type K · measured 4.096 mV · cold junction 25 °C
            <br />
            cold junction contributes 1.0003 mV
            <br />
            total inverted: 5.0963 mV
            <br />
            hot junction → <span className="text-ok">124.31 °C</span>
            <br />
            without compensation you would read ≈100 °C — 24 degrees low
          </DataWell>
        </Section>

        <AdSlot id="thermocouple-calculator-content" />

        <Section title="Types and ranges">
          <ParamsTable
            rows={[
              { name: "K", value: "−270 … 1372 °C", note: "Ni-Cr / Ni-Al, general purpose" },
              { name: "J", value: "−210 … 1200 °C", note: "Fe / Cu-Ni" },
              { name: "T", value: "−270 … 400 °C", note: "Cu / Cu-Ni, cryogenic" },
              { name: "E", value: "−270 … 1000 °C", note: "highest output per °C" },
              { name: "N", value: "−270 … 1300 °C", note: "Ni-Cr-Si / Ni-Si" },
              { name: "R / S", value: "−50 … 1768 °C", note: "Pt-Rh, high temperature" },
              { name: "B", value: "0 … 1820 °C", note: "no inverse below 250 °C" },
              { name: "Reference", value: "cold junction at 0 °C" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Coefficients from the NIST ITS-90 Thermocouple Database, cross-checked
            against NIST Monograph 175 (Burns et al., 1993). Wire colour codes and
            tolerance classes belong to ANSI/ASTM E230 and IEC 60584 and are
            deliberately not published here.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["pt100-calculator", "4-20ma-scaling", "two-point-calibration"]} />
      </ToolShell>
    </>
  );
}
