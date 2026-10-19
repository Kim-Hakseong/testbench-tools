import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { ThermocoupleTool } from "@/components/tool/ThermocoupleTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/thermocouple-calculator/" },
  title: "Thermocouple Calculator — mV to Temperature Chart & Formula (K, J, T, R, S, ITS-90)",
  description:
    "Free thermocouple calculator for types K, J, T, E, N, R, S and B: millivolts to temperature with cold-junction compensation on the NIST ITS-90 reference functions, plus mV-to-°C charts for types K, J, T and the Pt-Rh types R and S, and the mV output range of all eight types. 100% in your browser.",
  openGraph: { url: "/tools/thermocouple-calculator/",
    images: ["/og/thermocouple-calculator.png"], siteName: "TestBench.tools",
    title: "Thermocouple Calculator — mV to °C chart, types K, J, T, E, N, R, S, B",
    description: "mV ↔ °C on the NIST ITS-90 reference functions, with cold-junction compensation, type K/J/T and R/S reference charts, and the mV range of each type.",
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
    q: "What is the mV output of a type K thermocouple?",
    a: "With the reference junction at 0 °C: 0 mV at 0 °C, 1.0002 mV at 25 °C, 4.0962 mV at 100 °C, 12.2086 mV at 300 °C, 20.6443 mV at 500 °C and 54.8864 mV at 1372 °C, which is the top of the published range. The chart on this page lists the same points for types K, J and T. Note that those figures assume a 0 °C reference — a meter terminating at 25 °C reads each of them about 1.0002 mV low.",
  },
  {
    q: "Where do the numbers in this mV to temperature chart come from?",
    a: "They are read from the reference tables of NIST Monograph 175 (Burns, Scroger, Strouse, Croarkin and Guthrie, 1993): table 7.3.3 for type K, 6.3.3 for type J and 9.3.3 for type T, all with reference junctions at 0 °C. They are not re-derived for this page — the same values are the golden vectors this site's automated test suite pins the engine against, so the chart and the calculator above cannot drift apart.",
  },
  {
    q: "What is the mV output of a type S thermocouple?",
    a: "With the reference junction at 0 °C: 0 mV at 0 °C, 0.64591 mV at 100 °C, 4.23329 mV at 500 °C, 9.5871 mV at 1000 °C, 14.3726 mV at 1400 °C and 18.69251 mV at 1768 °C, the top of the published range. Type R runs higher at each of those temperatures: 0.6474 mV at 100 °C, 4.47126 mV at 500 °C, 10.50596 mV at 1000 °C, 16.0401 mV at 1400 °C and 21.10148 mV at 1768 °C. Both are small outputs for the temperatures involved: a type S couple at 1000 °C gives 9.5871 mV where a type K couple at the same temperature gives 41.2756 mV. The chart on this page lists these rows for both types.",
  },
  {
    q: "What is the mV range of each thermocouple type?",
    a: "Over the range NIST publishes an inverse for: type K −5.891 to 54.886 mV, J −8.095 to 69.553 mV, T −5.603 to 20.872 mV, E −8.825 to 76.373 mV, N −3.990 to 47.513 mV, R −0.226 to 21.103 mV, S −0.235 to 18.693 mV and B 0.291 to 13.820 mV, all with the reference junction at 0 °C. The mV output range table on this page pairs each with its temperature span. Note that the forward functions for K, E, N and T extend further at the cold end, down to −270 °C, than the inverse does — NIST stops at −200 °C there, so those voltages can be produced but not converted back.",
  },
  {
    q: "Where do the type R and S chart numbers come from?",
    a: "The same place as the K, J and T rows: the reference tables of NIST Monograph 175 (Burns, Scroger, Strouse, Croarkin and Guthrie, 1993) — table 3.3.3 for type R and 4.3.3 for type S, reference junctions at 0 °C. The voltage bounds in the mV output range table are read from the approximate-inverse blocks of the NIST ITS-90 Thermocouple Database (SRD 60). Nothing on this page is interpolated between table rows; the rows are the temperatures the source tables print.",
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
          4.0962 mV with the cold junction at 0 °C. Further down the page are
          mV-to-°C charts taken from the NIST reference tables — types K, J and
          T, then the Pt-Rh types R and S — and a table of the mV output range
          each of the eight types covers.
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
            Neither direction is a single formula. Going from temperature to
            voltage, each sub-range is a polynomial{" "}
            <code>E = Σ cᵢ·tⁱ</code> in °C, and type K carries an extra
            exponential term above 0 °C:{" "}
            <code>a₀·exp(a₁·(t − a₂)²)</code> with{" "}
            <code>a₀ = 0.1185976 mV</code>, <code>a₁ = −1.183432×10⁻⁴</code> and{" "}
            <code>a₂ = 126.9686</code>. That term is not a rounding detail — at
            100 °C it contributes 108.82 µV, so dropping it returns 3987.41 µV
            instead of the tabulated 4096.2 µV, about 2.7 °C low while still
            looking entirely plausible. The
            inverse direction is a separate fit, <code>t = Σ dᵢ·Eⁱ</code>,
            rather than an exact reversal of the forward polynomial — for type K
            NIST publishes it in three pieces, −5.891…0 mV, 0…20.644 mV and
            20.644…54.886 mV, each with its own residual band. So this tool
            reports which sub-range applied and the band NIST publishes for it,
            instead of presenting a number as if it were exact.
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

        <Section title="Thermocouple mV to temperature chart (K, J, T)">
          <p>
            Thermoelectric voltage against temperature, reference junction at
            0 °C, in millivolts rounded to 0.1 µV. Type K spans the widest
            range, so it sets the rows; types J and T appear at the
            temperatures their own tables publish. These are the values the
            calculator above returns — if your meter terminates at room
            temperature rather than in an ice bath, subtract the cold
            junction&apos;s own voltage from the table figure to get what the
            meter will actually show.
          </p>
          <ParamsTable
            rows={[
              { name: "−270 °C", value: "K · −6.4577 mV" },
              { name: "−200 °C", value: "K · −5.8914 mV", note: "T · −5.6030 mV" },
              { name: "−100 °C", value: "K · −3.5536 mV", note: "J · −4.6325 mV · T · −3.3786 mV" },
              { name: "0 °C", value: "K · 0.0000 mV", note: "J · 0.0000 mV · T · 0.0000 mV" },
              { name: "25 °C", value: "K · 1.0002 mV", note: "typical cold junction" },
              { name: "100 °C", value: "K · 4.0962 mV", note: "J · 5.2689 mV · T · 4.2785 mV" },
              { name: "200 °C", value: "K · 8.1385 mV", note: "J · 10.7787 mV · T · 9.2881 mV" },
              { name: "300 °C", value: "K · 12.2086 mV", note: "T · 14.8619 mV" },
              { name: "400 °C", value: "K · 16.3971 mV", note: "J · 21.8481 mV · T · 20.8720 mV — top of type T" },
              { name: "500 °C", value: "K · 20.6443 mV" },
              { name: "600 °C", value: "K · 24.9055 mV", note: "J · 33.1024 mV" },
              { name: "800 °C", value: "K · 33.2754 mV", note: "J · 45.494 mV" },
              { name: "1000 °C", value: "K · 41.2756 mV", note: "J · 57.953 mV" },
              { name: "1200 °C", value: "—", note: "J · 69.553 mV — top of type J" },
              { name: "1300 °C", value: "K · 52.4103 mV" },
              { name: "1372 °C", value: "K · 54.8864 mV", note: "top of type K" },
            ]}
          />
          <p>
            Two things the rows make visible. Type J produces more voltage
            than type K at every temperature the two tables share — 5.2689
            against 4.0962 mV at 100 °C — which is why a J couple on a
            K-configured input reads high rather than merely noisy. And the
            spacing is not constant: type K averages 41.0 µV per °C over its
            first 100 °C but only 34.4 µV per °C between 1300 and 1372 °C, so
            the sensitivity a two-point calibration assumes near room
            temperature is not the sensitivity you get at the top of the
            range. Type J is printed to
            1 µV rather than 0.01 µV above 760 °C in the source tables, so the
            800, 1000 and 1200 °C rows carry one fewer digit. Types R and S are
            charted in the next section; E, N and B are in the calculator above
            but not charted here.
          </p>
        </Section>

        <Section title="Type R and S mV to temperature chart (Pt-Rh)">
          <p>
            The platinum-rhodium types read differently enough from the base-metal
            ones that charting them on the same rows would be misleading: at
            1000 °C a type R couple produces 10.50596 mV where type K produces
            41.2756 mV, about a quarter of the output. Values below are
            thermoelectric voltage against temperature with the reference
            junction at 0 °C, printed to the digit the source tables publish, at
            the temperatures those tables list.
          </p>
          <ParamsTable
            rows={[
              { name: "0 °C", value: "R · 0 mV", note: "S · 0 mV" },
              { name: "100 °C", value: "R · 0.6474 mV", note: "S · 0.64591 mV" },
              { name: "500 °C", value: "R · 4.47126 mV", note: "S · 4.23329 mV" },
              { name: "1000 °C", value: "R · 10.50596 mV", note: "S · 9.5871 mV" },
              { name: "1064 °C", value: "R · 11.36132 mV", note: "S · 10.33209 mV — inverse sub-range boundary" },
              { name: "1400 °C", value: "R · 16.0401 mV", note: "S · 14.3726 mV" },
              { name: "1664 °C", value: "R · 19.73198 mV", note: "S · 17.5301 mV" },
              { name: "1768 °C", value: "R · 21.10148 mV", note: "S · 18.69251 mV — top of both types" },
            ]}
          />
          <p>
            Type R sits above type S at every temperature the two tables share,
            and the gap widens with temperature — 0.6474 against 0.64591 mV at
            100 °C is a 1.5 µV difference, while 21.10148 against 18.69251 mV at
            1768 °C is 2.4 mV. The two are not interchangeable at the top of the
            range even though their ranges and alloys are usually quoted
            together. The 1064 °C row is where NIST switches inverse sub-range:
            above 11.361 mV for type R, and above 10.332 mV for type S, the
            mV-to-°C fit changes and its published residual band tightens to
            −0.0005…+0.001 °C for R and ±0.0002 °C for S, the narrowest bands
            NIST publishes for any type — then widens again to about ±0.002 °C
            in the final sub-range above 1664.5 °C. All of those are far below
            any sensor tolerance, so it is the thermocouple and not the
            arithmetic that limits you there.
          </p>
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

        <Section title="mV output range by type">
          <p>
            If you are sizing an input stage or sanity-checking a reading, the
            useful question is not the temperature span but the voltage span.
            Below is the millivolt range over which NIST publishes an inverse —
            that is, the range this calculator will convert back to temperature,
            with the temperature span it corresponds to. Reference junction at
            0 °C throughout.
          </p>
          <ParamsTable
            rows={[
              { name: "K", value: "−5.891 … 54.886 mV", note: "−200 … 1372 °C" },
              { name: "J", value: "−8.095 … 69.553 mV", note: "−210 … 1200 °C" },
              { name: "T", value: "−5.603 … 20.872 mV", note: "−200 … 400 °C" },
              { name: "E", value: "−8.825 … 76.373 mV", note: "−200 … 1000 °C, widest span" },
              { name: "N", value: "−3.990 … 47.513 mV", note: "−200 … 1300 °C" },
              { name: "R", value: "−0.226 … 21.103 mV", note: "−50 … 1768.1 °C" },
              { name: "S", value: "−0.235 … 18.693 mV", note: "−50 … 1768.1 °C" },
              { name: "B", value: "0.291 … 13.820 mV", note: "250 … 1820 °C, no inverse below 250 °C" },
            ]}
          />
          <p>
            Two consequences worth reading off the table. First, the span is not
            proportional to the temperature range: type E covers 1200 degrees in
            85.198 mV while type S covers 1818 degrees in 18.928 mV, so an input
            range chosen for a type E couple leaves a type S couple using about a
            fifth of it — and with it, a fifth of the resolution. Second, these
            voltage bounds are narrower at the cold end than the reference
            functions themselves. The forward functions for types K, E, N and T
            reach −270 °C — type K produces −6.4577 mV there, type N
            −4.3451 mV — but NIST publishes no inverse below −200 °C for them,
            and none below 250 °C for type B, so this calculator refuses those
            voltages rather than extrapolating a plausible-looking number.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["pt100-calculator", "4-20ma-scaling", "two-point-calibration"]} />
      </ToolShell>
    </>
  );
}
