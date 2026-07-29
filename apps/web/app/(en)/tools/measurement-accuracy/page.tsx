import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { AccuracyTool } from "@/components/tool/AccuracyTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/measurement-accuracy/" },
  title: "Measurement Accuracy Calculator — % of reading + % of range, counts",
  description:
    "Turn an instrument accuracy spec such as ±(0.0035 % of reading + 0.0005 % of range) or ±(0.05 % + 3 counts) into an absolute uncertainty for one reading, with the term-by-term breakdown. Presets for the Keysight 34461A/34401A, Keithley DMM6500, Siglent SDM3055 and Fluke 87V/289. 100% in your browser.",
  openGraph: {
    images: ["/og/measurement-accuracy.png"], siteName: "TestBench.tools",
    title: "Measurement Accuracy Calculator — DMM, scope and calibrator specs",
    description:
      "Absolute ± uncertainty, the resulting interval and which spec term dominates, from % of reading, % of range, counts and offset.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "What does ±(0.0035 % of reading + 0.0005 % of range) actually mean?",
    a: "It means two errors are added. The first scales with what you measured: 0.0035 % of 4.7 V is 164.5 µV. The second scales with the range you are on and not with the reading at all: 0.0005 % of a 10 V range is 50 µV whether the meter shows 4.7 V or 0.1 V. The instrument is guaranteed to be inside ±214.5 µV of the true value at 4.7 V on that range, so the reading brackets 4.6997855 V to 4.7002145 V.",
  },
  {
    q: "Why is my error so much worse when I measure a small voltage?",
    a: "Because the second term does not shrink. On the 10 V range the range term is a fixed 50 µV, so at 4.7 V it is a quarter of the budget and at 0.1 V it is 93 % of it — the error rises from 0.0046 % of reading to 0.0535 %, an eleven-fold loss, with no change to the instrument. Moving the same 0.1 V measurement to the 1 V range cuts the range term by ten and the total uncertainty by about six. This is the single most common way engineers lose accuracy they already paid for.",
  },
  {
    q: "What is a count, and how do I convert counts to volts?",
    a: "A count is one step of the least significant digit on the display, so its size depends on the range. A 6000-count meter on its 6 V range shows up to 6.000 V, which is 6000 steps of 0.001 V, so one count is 1 mV and a '+3 counts' term is 3 mV. Give the calculator either the meter's rated count, its digit count, or the resolution read straight off the display, and it does that conversion for you. 'Digits', 'LSD' and 'd' in a specification all mean the same thing as counts.",
  },
  {
    q: "How do 5½ digits relate to counts?",
    a: "n½ digits means n digits that run 0 to 9 plus one leading digit limited to 0 or 1. So a 5½-digit meter resolves its nominal range into 10⁵ steps — 100 µV on the 10 V range — and can keep counting to 199 999 before it has to change range. Enter the nominal range, 10 V, not the 19.9999 V over-range ceiling; the calculator reports the ceiling separately because it is display capability, not resolution.",
  },
  {
    q: "Should the terms be added or root-sum-squared?",
    a: "Added. A published accuracy specification is a limit of error: the manufacturer asserts the instrument stays inside that band over the stated calibration interval and temperature window, and the band is the arithmetic sum of its terms. Root-sum-square is the right combination one level up, when you build an uncertainty budget out of several independent sources — meter, reference, fixturing, operator. Applying RSS inside one vendor expression quietly shrinks the manufacturer's own guarantee, so this calculator never does it.",
  },
  {
    q: "Is this the same as measurement uncertainty in the GUM sense?",
    a: "No, it is one input to it. The result here is a limit of error taken straight from the specification. To use it in a formal budget you normally treat a limit with no stated distribution as rectangular and divide by √3 to get a standard uncertainty, then combine it in quadrature with your other sources and multiply by a coverage factor. This tool deliberately stops before that step, because the division depends on assumptions only you can make.",
  },
  {
    q: "Does the spec still apply if I am outside the calibration interval?",
    a: "No. Accuracy specifications are always qualified — 24 hour, 90 day or 1 year since calibration, within a temperature window around the calibration temperature, after a stated warm-up, and often only above a minimum percentage of range. Outside any of those, the published numbers are not a guarantee and a temperature coefficient or a different table applies. Read the qualifier line under the table in your manual before trusting the number this calculator gives you.",
  },
  {
    q: "Where do the instrument presets come from?",
    a: "Six instruments are built in — Keysight 34461A and 34401A, Keithley DMM6500, Siglent SDM3055, Fluke 87V and Fluke 289 — and every figure was read out of the manufacturer's own PDF, not from memory or a secondary site. Each preset names the document number and revision it came from, and the tool shows the calibration interval and temperature window the numbers are valid under. Only DC voltage and only the 1-year column are included, because each extra column multiplies the chance of a transcription error. Everything else is typed in from your manual.",
  },
  {
    q: "My instrument is not in the list. Is that a problem?",
    a: "No — manual entry is the primary mode and the presets are a convenience. Type the terms exactly as your manual prints them: the percentage that goes with 'of reading', the one that goes with 'of range', the number of counts or digits, and any fixed offset. Leave a box empty if your spec does not have that term. A preset would only save you reading the same table you already have open.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. Every calculation runs in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "Measurement Accuracy Calculator", description: metadata.description!, slug: "measurement-accuracy", faqs: FAQS })} />
      <ToolShell slug="measurement-accuracy">
        <AccuracyTool />
        <AdSlot id="measurement-accuracy-results" />

        <AnswerBox>
          This calculator turns a published instrument accuracy specification
          into the absolute uncertainty of one specific reading. Enter the
          reading, the range you were on, and the spec in whichever form your
          manual states it — % of reading, % of range, ppm, counts or digits,
          or a fixed offset — and it returns the ± value, the interval that
          implies, the error as a percentage of the reading, and a breakdown of
          how much each published term contributed. Reference: ±(0.0035 % of
          reading + 0.0005 % of range) at 4.7 V on a 10 V range is ±214.5 µV,
          or 0.00456 % of reading.
        </AnswerBox>

        <Section title="An accuracy spec is not one number">
          <p>
            Almost every specification worth quoting has at least two terms,
            and they behave completely differently. The first is proportional
            to what you measured — <em>% of reading</em>, <em>% rdg</em>,
            <em> ppm of reading</em>, sometimes <em>% of measured value</em>.
            It tracks the signal: halve the reading and that error halves with
            it. The second is proportional to the range, or to the size of a
            display step, and it does not move at all when the reading changes.
            Manufacturers write it as <em>% of range</em>, <em>% FS</em>,
            <em> ppm of range</em>, <em>counts</em>, <em>digits</em>, or
            <em> LSD</em>.
          </p>
          <p>
            The headline number in a marketing table is nearly always the first
            term alone. Quoting it as &ldquo;the accuracy&rdquo; is correct only
            near full scale, where the second term is a small share of the
            budget. Everywhere else it understates the error, and it understates
            it worst exactly where people trust it most: on a small signal read
            on a comfortable, generous range. Adding the terms up by hand is not
            difficult, which is precisely why it usually does not get done.
          </p>
          <p>
            Because the units differ between the two halves of the expression,
            neither term can be compared to the other until both are converted
            into the unit you are actually measuring in. That conversion is what
            this tool does, and the breakdown it prints is the point of it: it
            shows in absolute volts, amps or ohms which half of the specification
            is in charge of your result.
          </p>
        </Section>

        <Section title="Worked example — the same instrument, two readings">
          <DataWell>
            spec ±(0.0035 % of reading + 0.0005 % of range) · range 10 V
            <br />
            <br />
            reading 4.7 V
            <br />
            &nbsp;&nbsp;reading term 0.0035 % × 4.7 = 164.5 µV (77 %)
            <br />
            &nbsp;&nbsp;range term&nbsp;&nbsp; 0.0005 % × 10&nbsp; = 50.0 µV (23 %)
            <br />
            &nbsp;&nbsp;total → <span className="text-ok">±214.5 µV</span> · 4.6997855 … 4.7002145 V ·
            0.00456 % of reading
            <br />
            <br />
            reading 0.1 V, same range
            <br />
            &nbsp;&nbsp;reading term 0.0035 % × 0.1 = 3.5 µV (6.5 %)
            <br />
            &nbsp;&nbsp;range term&nbsp;&nbsp; 0.0005 % × 10&nbsp; = 50.0 µV (93.5 %)
            <br />
            &nbsp;&nbsp;total → <span className="text-warn">±53.5 µV</span> · 0.0535 % of reading
            <br />
            <br />
            same 0.1 V moved to the 1 V range → ±8.5 µV · 0.0085 % of reading
            <br />
            &nbsp;&nbsp;<span className="text-ok">6.3× better, same meter, one button</span>
          </DataWell>
          <p>
            Nothing about the instrument changed between those three lines. The
            0.0035 % headline is honest at 4.7 V and off by a factor of fifteen
            at 0.1 V, and the fix is a range change, not a better meter.
          </p>
        </Section>

        <AdSlot id="measurement-accuracy-content" />

        <Section title="The crossover reading">
          <p>
            There is a single reading at which the two halves of a specification
            are exactly equal, and it is worth knowing because it divides the
            range into two regimes. Below it the fixed terms dominate and your
            error as a percentage of reading climbs steeply as the signal falls;
            above it the proportional term takes over and the percentage error
            settles down to roughly the headline figure. The calculator reports
            it for every spec you enter.
          </p>
          <p>
            It is found by setting the two sides equal. With a % of reading term
            of <em>a</em> and a fixed part <em>F</em> (the range, counts and
            offset terms added together, already converted into measurement
            units), the terms cross at reading = <em>F</em> ÷ (<em>a</em>/100).
            For the example above that is 50 µV ÷ 0.000035 = 1.43 V on a 10 V
            range, so anything below about 14 % of full scale is in the regime
            where the range term is calling the shots.
          </p>
          <p>
            Handheld meters land in a more uncomfortable place. A spec of
            ±(0.05 % + 3 counts) on a 6000-count meter puts three counts at
            3 mV on the 6 V range, and 3 mV ÷ 0.0005 = 6 V — the crossover sits
            exactly at full scale. On that range the counts term is never the
            smaller of the two, no matter where in the range you read. That is
            not a defect; it is what a three-and-a-half to four-digit display
            costs, and knowing it stops you from chasing a specification the
            display cannot deliver.
          </p>
        </Section>

        <Section title="Counts, digits and resolution">
          <p>
            Counts terms are the ones most often left uncomputed, because the
            specification never tells you what a count is worth. It cannot: a
            count is one step of the least significant digit, and that step
            changes with every range. Three pieces of information will pin it
            down, and any one of them is enough.
          </p>
          <p>
            The meter&apos;s rated count is the usual one — 2000, 4000, 6000,
            20 000 — and one count is then the range divided by that number.
            A 6000-count meter on the 60 V range steps by 60 ÷ 6000 = 10 mV.
            The digit count works the same way with a different convention:
            n½ digits means n digits running 0 to 9 plus a leading digit that
            can only be 0 or 1, so the display resolves the nominal range into
            10ⁿ steps and can over-range to 2·10ⁿ − 1 counts. A 5½-digit meter
            on the 10 V range steps by 100 µV and reads up to 19.9999 V. The
            third option is simply to read the resolution off the display: if
            the last digit is worth 0.001 V, enter 0.001 and skip the arithmetic.
          </p>
          <p>
            Enter the <em>nominal</em> range, not the over-range ceiling. The
            10 V range is 10 V even though the display will happily show
            19.9999 V, and using 19.9999 as the range would inflate both the
            % of range term and the count size. The calculator prints the
            over-range ceiling separately so the two never get confused.
          </p>
        </Section>

        <Section title="What the number is, and what it is not">
          <p>
            The result is a <em>limit of error</em>. It is the band the
            manufacturer guarantees, and it comes with conditions attached that
            the specification page states and the specification line does not:
            a calibration interval (24 hour, 90 day and 1 year figures differ,
            sometimes by more than a factor of two), a temperature window around
            the calibration temperature with a separate coefficient outside it,
            a warm-up time, and frequently a minimum percentage of range below
            which a different row of the table applies. A number computed here
            inherits every one of those conditions. If the instrument is out of
            calibration, cold, or being used below its stated floor, the
            arithmetic is still right and the guarantee is gone.
          </p>
          <p>
            It is also not, on its own, a measurement uncertainty in the sense
            of the GUM. To feed it into a formal budget you would treat a limit
            with no stated distribution as rectangular and divide by √3 to get a
            standard uncertainty, combine that in quadrature with your other
            independent contributions — reference standard, thermal emf,
            loading, repeatability — and then multiply by a coverage factor for
            the confidence level you need. This tool stops one step short of
            that on purpose, because the assumptions in that step belong to
            whoever is signing the certificate, not to a web page.
          </p>
          <p>
            The one place the two views meet is the test uncertainty ratio.
            Calibration procedures commonly require the accuracy of the
            reference to be several times better than that of the unit under
            test — a 4:1 ratio is the usual threshold — and that comparison has
            to be made in absolute units at the actual test point, not between
            two headline percentages. Computing both instruments&apos; specs at
            the same reading, on the ranges each one will actually be on, is the
            only honest way to check it.
          </p>
        </Section>

        <Section title="Specification forms this calculator reads">
          <ParamsTable
            rows={[
              { name: "% of reading", value: "a % × |reading|", note: "also % rdg, % of measured value" },
              { name: "% of range", value: "b % × range", note: "also % FS, % of full scale" },
              { name: "ppm of reading", value: "1 ppm = 1e-4 %", note: "calibrators, 8½-digit DMMs" },
              { name: "ppm of range", value: "1 ppm = 1e-4 %", note: "same conversion" },
              { name: "counts", value: "n × (range ÷ counts)", note: "also digits, LSD, d" },
              { name: "digits", value: "n½ → 10ⁿ steps", note: "over-ranges to 2·10ⁿ − 1 counts" },
              { name: "fixed offset", value: "absolute units", note: "a floor stated in V, A, Ω…" },
              { name: "Combination", value: "arithmetic sum", note: "not RSS — see above" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Manual entry is the primary mode: type the terms exactly as your
            manual prints them and leave empty any your spec does not have.
          </p>
        </Section>

        <Section title="The instruments that are built in">
          <p>
            Six DC voltage specifications are included as presets. Each one was
            read out of the manufacturer&apos;s own PDF, and each carries the
            document number, the revision date, and the conditions the figures
            are valid under, so a number on screen can always be traced back to
            a page in a manual. Only the 1-year column is included; the 24-hour,
            90-day and 2-year columns, the temperature coefficients and the AC,
            resistance and current functions are all left to manual entry,
            because every additional column multiplies the transcription surface
            by the number of models and a preset holding the wrong row is worse
            than no preset at all.
          </p>
          <ParamsTable
            rows={[
              { name: "Keysight 34461A", value: "±(0.0035 + 0.0005) at 10 V", note: "1 year, TCAL ± 5 °C · 5991-1983EN" },
              { name: "Keysight 34401A", value: "±(0.0035 + 0.0005) at 10 V", note: "1 year, 23 ± 5 °C · 5968-0162EN" },
              { name: "Keithley DMM6500", value: "±(0.0025 + 0.0005) at 10 V", note: "1 year, TCAL ± 5 °C · SPEC-DMM6500 Rev. A" },
              { name: "Siglent SDM3055", value: "±(0.015 + 0.004) at 20 V", note: "1 year, 23 ± 5 °C · DataSheet-2021.05" },
              { name: "Fluke 289", value: "±(0.025 % + 2 counts) at 5 V", note: "1 year, 18–28 °C · Users Manual Rev. 2" },
              { name: "Fluke 87V", value: "±(0.05 % + 1 count) at 6 V", note: "1 year, 18–28 °C · 80 Series V Rev.2" },
            ]}
          />
          <p>
            Reading 4.7 V on each of those instruments, on the range each one
            would actually select, gives ±0.2145 mV, ±0.2145 mV, ±0.1675 mV,
            ±1.505 mV, ±1.375 mV and ±3.35 mV respectively — a twentyfold spread
            for the same measurement. Notice that the Siglent lands in the
            middle despite a % of reading term six times looser than the
            Keithley&apos;s: on the 20 V range its 0.004 % of range term
            contributes more than its reading term does, which is the
            small-value-on-a-large-range effect appearing purely because 4.7 V
            sits low in a 20 V range.
          </p>
          <p className="text-sm text-mute">
            Handheld presets quote the resolution printed in the manual&apos;s
            own resolution column rather than dividing the range by a display
            count. The Fluke 289 manual, for instance, never prints a count
            figure at all; 50 000 counts can be derived from its ranges and
            resolutions, but a derived number is not a published one and does
            not belong in a preset table.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["adc-calculator", "two-point-calibration", "db-dbm"]} />
      </ToolShell>
    </>
  );
}
