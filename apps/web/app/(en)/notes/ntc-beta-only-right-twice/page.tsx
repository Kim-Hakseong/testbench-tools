import type { Metadata } from "next";
import { Callout, H2, NoteShell, P, Quoted } from "@/components/notes/NoteShell";
import { Figure, LinePlot } from "@/components/notes/Figure";
import { ntcBetaTemperature, NTC_REFERENCE_CURVES } from "@testbench/engine";
import { JsonLd, noteJsonLd } from "@/lib/jsonld";
import { noteBySlug } from "@/content/notes";

const NOTE = noteBySlug("ntc-beta-only-right-twice")!;

// Every published row of the datasheet table, run back through the Beta
// equation. Computed here rather than transcribed, so the plot cannot drift.
const BETA = { r0Ohms: 10000, t0C: 25, beta: 3977 };
const ERROR = NTC_REFERENCE_CURVES[0]!.table.map(([celsius, ohms]) => {
  const r = ntcBetaTemperature(BETA, ohms);
  return { x: celsius, y: r.ok ? r.celsius - celsius : 0 };
});

export const metadata: Metadata = {
  alternates: { canonical: "/notes/ntc-beta-only-right-twice/" },
  title: "Your NTC's B value is exact at two temperatures and nowhere else",
  description:
    "The Beta equation is a straight line through two points of a curved characteristic. Measured against Vishay's published R/T table it reads 3 °C high at −40 °C, exactly right at 25 and 85, and 2.8 °C high at 150.",
  openGraph: {
    images: ["/og/note-ntc-beta-only-right-twice.png"],
    siteName: "TestBench.tools",
    type: "article",
    publishedTime: NOTE.published,
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={noteJsonLd(NOTE)} />
      <NoteShell slug={NOTE.slug}>
        <P>
          Almost every NTC conversion in the field is the Beta equation, because it needs one
          constant off the datasheet and fits in four lines of C. It is also exact at exactly
          two temperatures, and those two are printed in the constant's own name.
        </P>

        <P>
          B25/85 means “the B that makes the equation pass through the resistance at 25 °C and
          the resistance at 85 °C”. Between and beyond those points, the equation is a straight
          line in 1/T against ln R and the thermistor is not.
        </P>

        <H2>How far off, exactly</H2>

        <P>
          Vishay's NTCLE100E3103 — the common 10 kΩ, B25/85 = 3977 K part — publishes a
          resistance table every 5 °C from −40 to 150. Feeding each published resistance into
          the Beta equation and asking what temperature it thinks that is:
        </P>

        <Quoted>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-mute">
                <th className="pb-2 pr-6 font-normal">Actual</th>
                <th className="pb-2 pr-6 font-normal">Datasheet R</th>
                <th className="pb-2 pr-6 font-normal">Beta reads</th>
                <th className="pb-2 font-normal">Error</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="pr-6">−40 °C</td><td className="pr-6">332 094 Ω</td><td className="pr-6">−37.01 °C</td><td>+2.99</td></tr>
              <tr><td className="pr-6">−20 °C</td><td className="pr-6">96 358 Ω</td><td className="pr-6">−18.29 °C</td><td>+1.71</td></tr>
              <tr><td className="pr-6">0 °C</td><td className="pr-6">32 554 Ω</td><td className="pr-6">0.76 °C</td><td>+0.76</td></tr>
              <tr><td className="pr-6">25 °C</td><td className="pr-6">10 000 Ω</td><td className="pr-6">25.00 °C</td><td>0.00</td></tr>
              <tr><td className="pr-6">50 °C</td><td className="pr-6">3 605 Ω</td><td className="pr-6">49.69 °C</td><td>−0.31</td></tr>
              <tr><td className="pr-6">85 °C</td><td className="pr-6">1 070 Ω</td><td className="pr-6">85.01 °C</td><td>+0.01</td></tr>
              <tr><td className="pr-6">100 °C</td><td className="pr-6">677.3 Ω</td><td className="pr-6">100.39 °C</td><td>+0.39</td></tr>
              <tr><td className="pr-6">125 °C</td><td className="pr-6">338.7 Ω</td><td className="pr-6">126.40 °C</td><td>+1.40</td></tr>
              <tr><td className="pr-6">150 °C</td><td className="pr-6">182.6 Ω</td><td className="pr-6">152.84 °C</td><td>+2.84</td></tr>
            </tbody>
          </table>
        </Quoted>

        <P>
          The zeros at 25 and 85 are not luck and not a good fit. They are the definition of
          B25/85. Everywhere else the error grows in both directions, and it dips slightly
          negative in between — the straight line cuts the corner.
        </P>

        <Figure caption="Beta-equation error across all 39 rows of the datasheet table. It touches zero at 25 and 85 °C — the two temperatures B25/85 is defined between — and grows in both directions from there.">
          <LinePlot
            points={ERROR}
            xTicks={[-40, 0, 25, 50, 85, 110, 150]}
            yTicks={[-1, 0, 1, 2, 3]}
            xLabel="actual °C"
            yLabel="error °C"
            zeroLine
            markers={[
              { x: 25, y: 0, label: "25 °C", anchor: "end" },
              { x: 85, y: 0.01, label: "85 °C" },
            ]}
            ariaLabel="Error of the Beta equation against temperature for a Vishay NTCLE100E3103 thermistor. The error is plus 2.99 degrees at minus 40, falls to zero at 25 degrees, dips slightly negative near 50, returns to zero at 85, and rises to plus 2.84 degrees at 150."
          />
        </Figure>

        <Callout>
          Three degrees is not a rounding difference. On a battery pack cut-off, a fridge
          controller or a compensation network, it is the difference between working and being
          quietly out of specification at the edges of the range.
        </Callout>

        <H2>Which B did the datasheet even give you</H2>

        <P>
          The other half of the problem is that B is not one number. The same part, fitted
          between different temperature pairs from its own table:
        </P>

        <Quoted>
          B−40/25 = 3746.1 K
          <br />
          B25/50 = 3932.0 K
          <br />
          B25/85 = 3977.5 K
          <br />
          B25/100 = 3993.6 K
          <br />
          B25/125 = 4018.5 K
        </Quoted>

        <P>
          That is a 7 % spread on one thermistor. A datasheet that says “B = 3977” without the
          subscript is telling you a third of what you need, and code that stores B as a bare
          constant has thrown away the rest. If you took B from one document and the R/T pairs
          from another, they may not describe the same fit at all.
        </P>

        <H2>What to do instead</H2>

        <P>
          <strong>If you need one number and 0.5 °C is fine:</strong> keep Beta, but choose the
          pair that brackets the range you actually operate in. A part running 0–60 °C should
          use a B fitted near that span, not B25/125 because that is what was on the front page.
          The error is near zero at the two anchors, so put the anchors where accuracy matters.
        </P>

        <P>
          <strong>If you need better than that:</strong> use Steinhart-Hart. It has three
          constants instead of one and follows the curve rather than chording it. Fitted to the
          same table at −40, 25 and 125 °C, it reproduces all 39 published rows with a worst
          error of 0.11 °C and an RMS of 0.038 °C, against Beta's worst of 2.99 °C over
          the same rows — from the same datasheet, with no extra measurement.
        </P>

        <P>
          Datasheets rarely print A, B and C, which is why people fall back on Beta. They do
          print the R/T table, and three points from it are enough to solve for the three
          constants exactly. That is a 3×3 linear system in ln R, not a curve fit — there is
          nothing to converge and nothing to tune.
        </P>

        <H2>Where you put the three points matters</H2>

        <P>
          Steinhart-Hart is exact at the three temperatures you anchor it to, in the same way
          Beta is exact at two. Anchoring the same table at 20, 25 and 30 °C instead of −40, 25
          and 125 reproduces those three points to under a millidegree and is four times worse
          everywhere else — worst 0.44 °C, RMS 0.14 °C.
        </P>

        <P>
          So spread the anchors across the range you care about. Three points clustered in the
          middle buy you precision where you already had it.
        </P>

        <H2>The general shape of this</H2>

        <P>
          A sensor constant that carries temperatures in its name is telling you where it is
          true. B25/85 says so out loud; people read it as a part number. The same applies to
          any two-point characterisation — a slope and offset from a two-point calibration is
          exact at the two points and drifts between them by however much the sensor curves.
        </P>

        <P>
          It is not that Beta is wrong. It is that Beta is a chord, the datasheet tells you
          which chord, and nobody reads the subscript.
        </P>
      </NoteShell>
    </>
  );
}
