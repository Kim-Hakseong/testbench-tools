import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { ThermistorTool } from "@/components/tool/ThermistorTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/ntc-thermistor-calculator/" },
  title: "NTC Thermistor Calculator — Beta and Steinhart-Hart, R ↔ °C",
  description:
    "Free NTC thermistor calculator: resistance ↔ temperature with the Beta (B-parameter) equation and the Steinhart-Hart equation, plus a three-point fit for A, B and C and the error between the two models. 100% in your browser.",
  openGraph: {
    title: "NTC Thermistor Calculator — Beta vs Steinhart-Hart",
    description:
      "R ↔ °C both ways, fit A, B and C from three datasheet points, and see how many degrees the Beta equation costs you.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "What is the difference between the Beta equation and Steinhart-Hart?",
    a: "The Beta equation, 1/T = 1/T0 + (1/B)·ln(R/R0), has two constants and one anchor point. It is exact at T0 and at whichever second temperature B was measured at, and it drifts everywhere else. Steinhart-Hart, 1/T = A + B·ln(R) + C·ln(R)³, has three constants and no anchor, so it can follow the curvature of a real NTC across a much wider span. On the published 10 kΩ curve used as this page's worked example, a Beta conversion anchored at 25 °C with B25/85 = 3977 K reads 2.99 °C high at −40 °C and 2.72 °C high at 150 °C, while a three-point Steinhart-Hart fit stays within 0.11 °C over the same span.",
  },
  {
    q: "Where do I get A, B and C for my thermistor?",
    a: "Usually you fit them, because datasheets publish an R/T table and rarely publish A, B and C. Substituting x = ln R makes the equation linear in the three coefficients, so three (R, T) points give a 3×3 system with an exact solution — no iteration and no curve-fitting software. Enter three rows from your datasheet table in the fit panel and the coefficients appear.",
  },
  {
    q: "Why is B25/85 different from B25/50 for the same thermistor?",
    a: "Because B is defined between two temperatures: B = ln(R1/R2) / (1/T1 − 1/T2), with T in kelvin. An NTC is not a straight line on a ln R versus 1/T plot, so the slope you measure depends on where you measure it. On the published curve used here, the same part gives B25/50 = 3932 K, B25/85 = 3977.5 K, B25/100 = 3994 K and B25/125 = 4019 K. A B value quoted without its temperature pair is not enough information to reproduce a reading, which is why the pair is an input on this page rather than a hidden constant.",
  },
  {
    q: "How accurate is a three-point Steinhart-Hart fit?",
    a: "It depends entirely on where the three points are. Fitting the published 10 kΩ table at −40, 25 and 125 °C reproduces all 39 rows of that table — including the 36 the fit never saw — with a worst error of 0.110 °C at 150 °C and an RMS of 0.038 °C. Fitting the same table at 20, 25 and 30 °C reproduces those three points just as perfectly and is four times worse everywhere else: 0.439 °C worst, 0.144 °C RMS. The fit residual at your own three points tells you nothing; only checking against points the fit never saw does.",
  },
  {
    q: "Which three points should I pick?",
    a: "Spread them across the range you actually measure in: one near each end and one near the middle. Three points 10 K apart will fit each other perfectly and say almost nothing about the rest of the curve. If your datasheet table is wider than your application, fit the application's range rather than the datasheet's.",
  },
  {
    q: "Do I have to convert to kelvin?",
    a: "The equations do, and this tool does it for you. Both models are written in kelvin — T(K) = T(°C) + 273.15 — and every input and output on this page is in °C. Leaving a temperature in °C inside either equation does not produce an error, it produces a plausible wrong number, which is why the conversion is done in one place internally.",
  },
  {
    q: "Does it model self-heating?",
    a: "No. The optional divider readout gives the output voltage and ADC code for a given resistance, but the current flowing through the thermistor warms it, and how much depends on the part's dissipation constant and its mounting. That is a real error at low series resistance and it is not modelled here.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Every calculation runs in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "NTC Thermistor Calculator",
          description: metadata.description!,
          slug: "ntc-thermistor-calculator",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="ntc-thermistor-calculator">
        <ThermistorTool />
        <AdSlot id="ntc-thermistor-calculator-results" />

        <AnswerBox>
          This calculator converts NTC thermistor resistance to temperature and
          back, with both of the equations people actually use: the Beta
          (B-parameter) equation and the three-constant Steinhart-Hart equation.
          It fits A, B and C from three (R, T) points off your datasheet table,
          and it shows how far apart the two models are in degrees — which is
          the number most NTC surprises come down to.
        </AnswerBox>

        <Section title="The two equations">
          <p>
            The Beta equation is the one printed on the front page of every NTC
            datasheet:
          </p>
          <DataWell>1/T = 1/T0 + (1/B)·ln(R/R0)</DataWell>
          <p>
            Three numbers describe the sensor: a reference resistance R0, the
            temperature T0 it was measured at (almost always 10 kΩ at 25 °C),
            and B in kelvin. It is easy to implement, cheap to evaluate on a
            microcontroller, and exact at exactly two temperatures — T0, and
            whichever second temperature B was derived from. Between and beyond
            those two it drifts, because a real NTC is not a straight line on a
            plot of ln R against 1/T.
          </p>
          <p>The Steinhart-Hart equation adds a cubic term in ln R:</p>
          <DataWell>1/T = A + B·ln(R) + C·ln(R)³</DataWell>
          <p>
            There is no anchor point and no reference resistance; the three
            coefficients carry the whole curve. That extra term is what lets one
            coefficient set track a thermistor over a 190 K span instead of a
            50 K one. Both equations are written in kelvin. This page takes and
            shows °C everywhere and converts internally with T(K) = T(°C) +
            273.15, because mixing the two scales inside either equation does
            not raise an error — it quietly returns a plausible wrong answer.
          </p>
        </Section>

        <Section title="B is a pair of temperatures, not a property of the part">
          <p>
            B is defined by measuring two points and taking the slope between
            them:
          </p>
          <DataWell>B = ln(R1/R2) / (1/T1 − 1/T2)&nbsp;&nbsp;·&nbsp;&nbsp;T in kelvin</DataWell>
          <p>
            Because the curve bends, the answer depends on which two
            temperatures you pick. Taking the published resistance/temperature
            table of one 10 kΩ part (Vishay NTCLE100E3103, document 29049,
            revision 07-May-2025) and computing B from different pairs of its own
            rows gives B−40/25 = 3746 K, B25/50 = 3932 K, B25/85 = 3977.5 K,
            B25/100 = 3994 K and B25/125 = 4019 K. That is a spread of 272 K
            across one component, and the value the datasheet prints on its
            front page — 3977 K — is simply the 25/85 pair, rounded.
          </p>
          <p>
            So &quot;B = 3977 K&quot; on its own is not reproducible
            information. Two parts specified as B = 3977 K and B = 3977 K may
            have been characterised over different pairs and behave differently
            at the ends of your range. This calculator therefore asks for the
            pair alongside the value, labels every result with it, and can also
            derive B for any pair you name directly from a fitted Steinhart-Hart
            curve — which is a good way to see how much the number moves.
          </p>
        </Section>

        <AdSlot id="ntc-thermistor-calculator-content" />

        <Section title="Fitting A, B and C from three points">
          <p>
            Datasheets publish an R/T table. They almost never publish A, B and
            C. Fitting them is easier than it looks: substitute x = ln R and the
            equation becomes linear in the coefficients, so three points give a
            3×3 system
          </p>
          <DataWell>
            [ 1 x₁ x₁³ ] [A] [1/T₁]
            <br />
            [ 1 x₂ x₂³ ] [B] = [1/T₂]
            <br />
            [ 1 x₃ x₃³ ] [C] [1/T₃]
          </DataWell>
          <p>
            with an exact solution. This is a solve, not an optimisation: the
            resulting curve passes through all three points to the last digit,
            and the residual at those points is always zero. That is worth
            saying plainly, because it means the fit cannot tell you whether it
            is any good. Only points the fit never saw can do that.
          </p>
          <p>
            Which is exactly what the check below the fit panel does when the
            loaded points come from the published table. Fitting the 10 kΩ curve
            above at −40, 25 and 125 °C and then evaluating all 39 published
            rows — including the 36 the fit never saw — gives a worst error of
            0.110 °C at 150 °C and an RMS of 0.038 °C over the full −40 to
            150 °C span. Fitting the same table at 20, 25 and 30 °C instead
            produces a fit that is equally perfect at its own three points and
            four times worse everywhere else: 0.439 °C worst, 0.144 °C RMS.
            Spread the points across the range you care about.
          </p>
        </Section>

        <Section title="What the Beta equation actually costs">
          <p>
            The comparison table in the tool answers the question directly. At
            each temperature it takes the resistance the fitted Steinhart-Hart
            curve gives, then asks what a Beta conversion would have called that
            same resistance. Using B25/85 = 3977 K anchored at 10 kΩ / 25 °C
            against a three-point fit of the same published curve:
          </p>
          <DataWell>
            −40 °C → Beta reads −37.01 °C&nbsp;&nbsp;(+2.99)
            <br />
            &nbsp;&nbsp;0 °C → Beta reads &nbsp;&nbsp;0.74 °C&nbsp;&nbsp;(+0.74)
            <br />
            &nbsp;25 °C → Beta reads &nbsp;25.00 °C&nbsp;&nbsp;(anchor, exact)
            <br />
            &nbsp;85 °C → Beta reads &nbsp;85.06 °C&nbsp;&nbsp;(+0.06 — the second B temperature)
            <br />
            150 °C → Beta reads 152.72 °C&nbsp;&nbsp;(+2.72)
          </DataWell>
          <p>
            The shape of that error is the part worth remembering. It is zero at
            25 °C and near zero at 85 °C, the two temperatures B was defined
            between, and it grows in both directions away from them. A firmware
            NTC conversion validated on a bench at room temperature therefore
            passes cleanly and ships an error that only appears in the field, at
            the extremes, where it is hardest to attribute. If your range is
            genuinely narrow — a battery pack held between 0 and 60 °C, say —
            the Beta equation is fine and the difference will show as tenths of
            a degree. If it is not, three coefficients cost you nothing at
            runtime beyond one extra multiply.
          </p>
        </Section>

        <Section title="Both directions, and the inverse that is often iterated">
          <p>
            Resistance to temperature is the direction you normally need, and
            both equations give it directly. Temperature to resistance is the
            one you need when sizing a divider or building a lookup table, and
            for Steinhart-Hart it means solving a cubic in ln R:
          </p>
          <DataWell>C·x³ + B·x + (A − 1/T) = 0,&nbsp;&nbsp;x = ln R</DataWell>
          <p>
            It is common to see this solved by iteration. It does not need to
            be. The depressed cubic has a closed-form Cardano solution, usually
            written for thermistors as
          </p>
          <DataWell>
            y = (A − 1/T) / 2C
            <br />
            z = √( (B/3C)³ + y² )
            <br />
            R = exp( ∛(z − y) − ∛(z + y) )
          </DataWell>
          <p>
            which is what this tool evaluates: exact to floating point, and with
            no initial guess to fail on. The term under the square root only
            goes negative when B and C have opposite signs, and that case is a
            genuine ambiguity rather than a numerical accident — the cubic then
            has three real roots and several resistances give the same
            temperature. The tool refuses those coefficient sets instead of
            silently picking a branch, in the same spirit as its refusal of a
            resistance of zero, a temperature at absolute zero, or a three-point
            fit with two identical temperatures.
          </p>
        </Section>

        <Section title="Reading a thermistor with a divider">
          <p>
            An NTC is usually read as one half of a resistive divider into an
            ADC. The optional panel computes that: output voltage and ADC code
            for the resistance in play, in either topology, with the convention
            used elsewhere on this site that full scale is the all-ones code, so
            ratio = count / (2<sup>N</sup> − 1). Assuming the ADC reference is
            the same rail that feeds the divider makes the reading ratiometric,
            and supply error cancels.
          </p>
          <p>
            Two things it deliberately does not do. It does not model
            self-heating: the divider current warms the thermistor, and how much
            depends on the part&apos;s dissipation constant and its mounting, so
            no honest number can be produced from the divider alone. And it does
            not carry tolerance. The datasheet behind the worked example above
            lists R25 tolerances of 2, 3 or 5 % depending on the part suffix and
            a B tolerance of 0.75 % for this curve, and both propagate into
            temperature — an uncertainty budget the equations here say nothing
            about.
          </p>
        </Section>

        <Section title="Parameters and conventions">
          <ParamsTable
            rows={[
              { name: "Beta equation", value: "1/T = 1/T0 + (1/B)·ln(R/R0)", note: "two constants, one anchor point" },
              { name: "Steinhart-Hart", value: "1/T = A + B·ln(R) + C·ln(R)³", note: "three constants, no anchor" },
              { name: "Temperature scale", value: "T(K) = T(°C) + 273.15", note: "equations in kelvin, inputs and outputs in °C" },
              { name: "B definition", value: "ln(R1/R2) / (1/T1 − 1/T2)", note: "always quoted with its temperature pair" },
              { name: "Fit", value: "exact 3×3 solve in ln R", note: "passes through all three points; spread them out" },
              { name: "T → R inverse", value: "Cardano closed form", note: "not iterated; refused when non-monotonic" },
              { name: "ADC convention", value: "ratio = count / (2^N − 1)", note: "ratiometric, reference = divider supply" },
              { name: "Not modelled", value: "self-heating, tolerance", note: "dissipation constant and R25/B tolerance are yours" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Both equations are public mathematics and are implemented fresh in
            this repository. The one manufacturer curve used for the worked
            example and for the fit-quality check is the Vishay BCcomponents
            NTCLE100E3103 table, document 29049, revision 07-May-2025,
            transcribed exactly as printed; its provenance is recorded in the
            repository and every figure quoted on this page is reproduced by the
            engine&apos;s test vectors.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools
          slugs={["pt100-calculator", "thermocouple-calculator", "two-point-calibration"]}
        />
      </ToolShell>
    </>
  );
}
