import type { Metadata } from "next";
import { Callout, H2, NoteShell, P, Quoted } from "@/components/notes/NoteShell";
import { Figure, LinePlot } from "@/components/notes/Figure";
import { tcVoltage } from "@testbench/engine";
import { JsonLd, noteJsonLd } from "@/lib/jsonld";
import { noteBySlug } from "@/content/notes";

const NOTE = noteBySlug("type-b-thermocouple-no-inverse")!;

// Plotted straight from the shipped reference function, so the curve and the
// calculator can never disagree.
const DIP = Array.from({ length: 121 }, (_, i) => {
  const c = i * 0.5;
  const r = tcVoltage("B", c);
  return { x: c, y: r.ok ? r.millivolts * 1000 : 0 };
});

export const metadata: Metadata = {
  alternates: { canonical: "/notes/type-b-thermocouple-no-inverse/" },
  title: "A type B thermocouple barely cares what your cold junction is doing",
  description:
    "Type B's emf doubles back below 42 °C, so no inverse exists under 250 °C. The same property means a 40 °C swing in the cold junction moves a 1018 °C reading by 0.05 °C — where type K would move 25.",
  openGraph: {
    images: ["/og/note-type-b-thermocouple-no-inverse.png"],
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
          Put 0.15 mV from a type B thermocouple into a converter and a good one will refuse.
          Not warn — refuse. It is easy to read that as a gap in the tool, so it is worth
          saying plainly: below 250 °C there is no answer to give, and the reason turns out to
          be the same reason type B is used at all.
        </P>

        <H2>The curve doubles back</H2>

        <P>
          A thermocouple's emf is supposed to rise with temperature. Type B's does not, near
          room temperature. Evaluating the ITS-90 reference function for type B from 0 °C
          upward, in microvolts:
        </P>

        <Quoted>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-mute">
                <th className="pb-2 pr-8 font-normal">T</th>
                <th className="pb-2 font-normal">emf</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="pr-8">0 °C</td><td>0.00 µV</td></tr>
              <tr><td className="pr-8">10 °C</td><td>−1.88 µV</td></tr>
              <tr><td className="pr-8">21 °C</td><td>−2.58 µV</td></tr>
              <tr><td className="pr-8">30 °C</td><td>−2.12 µV</td></tr>
              <tr><td className="pr-8">40 °C</td><td>−0.49 µV</td></tr>
              <tr><td className="pr-8">42 °C</td><td>−0.03 µV</td></tr>
              <tr><td className="pr-8">50 °C</td><td>+2.28 µV</td></tr>
            </tbody>
          </table>
        </Quoted>

        <P>
          It goes negative, bottoms out at −2.585 µV around 21.0 °C, and crosses back through
          zero near 42 °C. So −2 µV is produced at about 10.9 °C <em>and</em> at about 31.0 °C.
          One voltage, two temperatures.
        </P>

        <Figure caption="Type B emf from 0 to 60 °C, evaluated from the ITS-90 reference function. Any horizontal line across the dip crosses the curve twice — which is exactly why no inverse exists here.">
          <LinePlot
            points={DIP}
            xTicks={[0, 10, 21, 30, 42, 50, 60]}
            yTicks={[-3, -2, -1, 0, 1, 2, 3]}
            xLabel="°C"
            yLabel="µV"
            zeroLine
            markers={[
              { x: 21.0, y: -2.585, label: "min −2.585 µV @ 21.0 °C", anchor: "end" },
              { x: 42, y: 0, label: "back to 0 @ 42 °C", anchor: "end" },
            ]}
            fmtY={(v) => String(v)}
            ariaLabel="Type B thermocouple emf against temperature from 0 to 60 degrees Celsius. The curve falls below zero, reaches a minimum of minus 2.585 microvolts at 21 degrees, and returns to zero at 42 degrees, so a single negative voltage corresponds to two different temperatures."
          />
        </Figure>

        <Callout>
          That is not a measurement problem or a fit problem. An inverse function cannot exist
          where the forward function is not one-to-one. NIST publishes type B's inverse from
          250 °C up, and a converter that answered below that would be inventing a branch.
        </Callout>

        <P>
          The other seven letter types rise monotonically across their whole span, which is why
          only type B behaves this way.
        </P>

        <H2>The same shape is why type B exists</H2>

        <P>
          A thermocouple measures the difference between its two junctions, so every reading
          needs the cold junction's own emf added back before it can be inverted. Getting that
          wrong, or letting the terminal block drift, is the classic source of error.
        </P>

        <P>
          Now watch what a cold junction does to type B. The same measured 5.000 mV, with the
          cold junction sitting anywhere from freezing to a hot cabinet:
        </P>

        <Quoted>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-mute">
                <th className="pb-2 pr-8 font-normal">Cold junction</th>
                <th className="pb-2 pr-8 font-normal">Its contribution</th>
                <th className="pb-2 font-normal">Hot junction reads</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="pr-8">0 °C</td><td className="pr-8">0.00 µV</td><td>1018.034 °C</td></tr>
              <tr><td className="pr-8">20 °C</td><td className="pr-8">−2.58 µV</td><td>1017.755 °C</td></tr>
              <tr><td className="pr-8">25 °C</td><td className="pr-8">−2.49 µV</td><td>1017.764 °C</td></tr>
              <tr><td className="pr-8">30 °C</td><td className="pr-8">−2.12 µV</td><td>1017.805 °C</td></tr>
              <tr><td className="pr-8">40 °C</td><td className="pr-8">−0.49 µV</td><td>1017.981 °C</td></tr>
            </tbody>
          </table>
        </Quoted>

        <P>
          A 40 °C swing in the cold junction moves the reading by <strong>0.05 °C</strong>. The
          contribution never exceeds three microvolts because that is the entire height of the
          dip — the curve simply has nothing to contribute down there.
        </P>

        <P>Type K, for contrast, on the same 5.000 mV:</P>

        <Quoted>
          cold junction 0 °C → 121.95 °C
          <br />
          cold junction 25 °C → 146.60 °C
        </Quoted>

        <P>
          Twenty-five degrees of cold junction moves a type K reading by 24.65 °C — very nearly
          one for one, which is what a well-behaved thermocouple does. Type B's flat spot near
          room temperature is a liability below 250 °C and an asset above it.
        </P>

        <H2>What this means in practice</H2>

        <P>
          <strong>Cold-junction compensation still belongs in your code.</strong> The error is
          small, not zero, and at 0.05 °C per 40 °C it is free to get right. What you can stop
          worrying about is cold-junction sensor accuracy and terminal-block gradients — the
          things that dominate a type K budget barely register here.
        </P>

        <P>
          <strong>Do not use type B below 250 °C.</strong> Not because the tooling refuses, but
          because the sensor produces microvolts there. At 100 °C type B makes about 33 µV,
          where type K makes 4.096 mV — two orders of magnitude more signal. Any noise on the
          leads swamps it.
        </P>

        <P>
          <strong>A reading near zero is ambiguous, not wrong.</strong> If a type B loop reads
          a couple of microvolts, that is consistent with a cold process, a disconnected
          sensor, or a junction at 31 °C. You cannot tell from the voltage. Type B is a
          high-temperature instrument and its behaviour at the bottom carries no information.
        </P>

        <H2>Why converters should refuse rather than extrapolate</H2>

        <P>
          It would be easy to return the lower branch, or the upper one, or to extend the
          250 °C polynomial downward and let the reader decide. All three produce a number that
          looks like a measurement.
        </P>

        <P>
          The honest output is the range the inverse is actually published for, and the reason.
          A refusal costs somebody thirty seconds of confusion. A plausible number from a
          region where the physics does not support one costs whatever it was controlling.
        </P>

        <P>
          The same principle covers the wire colours, which this calculator also does not show:
          ANSI/ASTM E230 and IEC 60584-3 assign different colours to the same type, so
          publishing one set would mislead whoever is holding the other cable.
        </P>
      </NoteShell>
    </>
  );
}
