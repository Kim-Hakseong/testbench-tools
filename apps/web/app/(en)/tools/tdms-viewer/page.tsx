import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { TdmsViewerTool } from "@/components/tool/TdmsViewerTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/tdms-viewer/" },
  title: "TDMS Viewer — inspect groups, channels and properties",
  description:
    "Free online NI TDMS viewer: drop a .tdms file and browse its group/channel tree, properties and first samples — parsed by streaming in your browser, no upload.",
  openGraph: {
    images: ["/og/tdms-viewer.png"], siteName: "TestBench.tools", title: "TDMS Viewer — inspect groups, channels and properties", description: "Browse a TDMS file's group/channel tree, properties and first samples in your browser.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "What does this viewer show that the converter doesn't?",
    a: "The structure. Before committing to a CSV export you often just need to know what is inside: which groups and channels exist, their data types, sample counts, and the properties (units, scaling hints, timestamps) attached at file, group and channel level. This page answers that in one drop.",
  },
  {
    q: "Where do TDMS properties come from?",
    a: "LabVIEW and other NI writers attach key-value properties at every level of the hierarchy — file title, group description, channel unit strings, waveform timing attributes like wf_increment. The viewer lists them verbatim next to the object they belong to.",
  },
  {
    q: "Why does my channel show fewer samples than the acquisition ran?",
    a: "TDMS appends data in segments as the writer flushes; an application killed mid-write leaves a truncated final segment. The parser keeps every complete value and drops only the partial tail, so the count reflects what is actually recoverable from the file.",
  },
  {
    q: "Which files are supported?",
    a: "Standard TDMS 2.0: little-endian segments, non-interleaved raw data, numeric channel types (i8–i64, u8–u64, f32, f64). Big-endian, interleaved and DAQmx-scaler files are rejected with a clear message rather than shown incorrectly.",
  },
  {
    q: "Is my file uploaded?",
    a: "No. It is read in 4 MB slices with the browser's File API and parsed locally.",
  },
];

const PY_SNIPPET = `# The same inspection with NI's Python package (pip install nptdms)
from nptdms import TdmsFile

tdms = TdmsFile.read("run.tdms")
print(dict(tdms.properties))
for group in tdms.groups():
    for ch in group.channels():
        print(group.name, ch.name, len(ch), dict(ch.properties))`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "TDMS Viewer", description: metadata.description!, slug: "tdms-viewer", faqs: FAQS })} />
      <ToolShell slug="tdms-viewer">
        <TdmsViewerTool />
        <AdSlot id="tdms-viewer-results" />

        <AnswerBox>
          This tool opens an NI TDMS measurement file and shows what is inside
          without converting anything: the group and channel tree, each
          channel&apos;s data type and sample count, file/group/channel
          properties, and a preview of the first samples. Parsing streams in
          4 MB slices, so the file never uploads and never loads whole.
        </AnswerBox>

        <Section title="The three levels, and why it matters">
          <p>
            TDMS is a three-level model and nothing deeper: the file itself, the
            groups inside it, and the channels inside those. Every level carries
            its own key-value properties, which is the part people are usually
            looking for. A sample rate written once at group level applies to
            every channel under it; a unit string written at channel level
            applies to that channel alone. Reading a value without knowing which
            level its scaling came from is how a plot ends up off by a factor.
          </p>
          <p>
            Internally each object is addressed by a path, and the path is where
            the quoting rule lives:
          </p>
          <DataWell>
            /{"                    "}← the file
            <br />
            /&apos;group1&apos;{"           "}← a group
            <br />
            /&apos;group1&apos;/&apos;ch1&apos;{"     "}← a channel
            <br />
            /&apos;Bob&apos;&apos;s rig&apos;{"      "}← an apostrophe in a name is doubled
          </DataWell>
          <p>
            That last line catches people out when they parse TDMS by hand: a
            name containing an apostrophe is not escaped with a backslash, it is
            written twice. The viewer resolves the paths for you and shows the
            names as they were typed.
          </p>
        </Section>

        <Section title="What the properties tell you">
          <p>
            Properties are free-form — a writer can attach anything — but the
            ones worth hunting for fall into three groups.
          </p>
          <p>
            <strong>Timing.</strong> Waveform attributes describe when the
            samples happened rather than storing a timestamp per sample. A start
            time, an increment and sometimes an offset are enough to reconstruct
            the whole time axis, which is why a channel with a million samples
            can carry three timing properties and no time column.
          </p>
          <p>
            <strong>Scaling and units.</strong> A unit string, gain, offset or
            an explicit scaling entry tells you whether the numbers are already
            in engineering units or still raw counts. This is the information a
            plain CSV export throws away, and the most common reason a converted
            file is quietly wrong.
          </p>
          <p>
            <strong>Provenance.</strong> Operator, test name, hardware serial,
            acquisition settings — whatever the writer recorded. Useless to a
            parser and often the only way to work out which run a file is.
          </p>
          <p>
            Property values come back typed: strings, numbers, booleans and
            timestamps are all read, and the viewer shows the type beside the
            value so a numeric-looking string is not mistaken for a number.
          </p>
        </Section>

        <Section title="Reading a file that was cut short">
          <p>
            TDMS is appended segment by segment as the writer flushes, which is
            what makes it survivable: a process killed mid-acquisition leaves a
            file whose last segment is incomplete but whose earlier segments are
            perfectly good. The viewer keeps every complete value and drops only
            the partial tail, so the sample count you see is what is actually
            recoverable.
          </p>
          <p>
            If that count is lower than the acquisition should have produced,
            the file was truncated rather than misread. Compare it against the
            timing properties — start time plus increment times sample count
            gives the span that actually survived.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            drop run.tdms →
            <br />
            file · title=&quot;bench run 14&quot; · operator=&quot;hk&quot;
            <br />
            group1 · 2 channels · wf_increment=0.001
            <br />
            ├ ch1 · f64 · 100 samples · unit_string=&quot;V&quot; · gain=1.5
            <br />
            │{"  "}first samples: 0, 0.5, 1, 1.5, …
            <br />
            └ ch2 · f64 · 100 samples · (no unit)
            <br />
            <br />
            ch1 is in volts and pre-scaled; ch2 declares nothing, so its
            <br />
            numbers are whatever the acquisition wrote — check before plotting.
          </DataWell>
        </Section>

        <AdSlot id="tdms-viewer-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Input", value: ".tdms (TDMS 2.0)", note: "little-endian, non-interleaved" },
              { name: "Shown", value: "tree · dtypes · counts · properties · first 10 samples" },
              { name: "Streaming", value: "4 MB File.slice chunks", note: "no upload, no full load" },
              { name: "Refused", value: "big-endian · interleaved · DAQmx", note: "named, not guessed at" },
              { name: "Export", value: "→ TDMS to CSV tool", note: "linked below the tree" },
            ]}
          />
        </Section>

        <Section title="Python equivalent">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["tdms-to-csv", "csv-waveform-plotter", "hex-file-viewer"]} />
      </ToolShell>
    </>
  );
}
