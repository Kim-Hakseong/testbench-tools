import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { TdmsViewerTool } from "@/components/tool/TdmsViewerTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "TDMS Viewer — inspect groups, channels and properties",
  description:
    "Free online NI TDMS viewer: drop a .tdms file and browse its group/channel tree, properties and first samples — parsed by streaming in your browser, no upload.",
  openGraph: { title: "TDMS Viewer — inspect groups, channels and properties", description: "Browse a TDMS file's group/channel tree, properties and first samples in your browser.", type: "website" },
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

        <Section title="How it works">
          <p>
            A TDMS file is a chain of segments, each carrying metadata (object
            paths, raw-data indexes, properties) and raw sample bytes. The
            viewer runs the same streaming parser as this site&apos;s TDMS to CSV
            converter — tracking object state across segments, including
            raw-index reuse — but stops at presentation: tree, properties,
            counts and a first-samples peek per channel. It is the “what did
            we actually record?” step that precedes any conversion decision.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            drop run.tdms →
            <br />
            group1 · 2 channels
            <br />
            ├ ch1 · f64 · 100 samples · unit=V · gain=1.5
            <br />
            └ ch2 · f64 · 100 samples
            <br />
            first samples: 0, 0.5, 1, 1.5, …
          </DataWell>
        </Section>

        <AdSlot id="tdms-viewer-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Input", value: ".tdms (TDMS 2.0)", note: "little-endian, non-interleaved" },
              { name: "Shown", value: "tree · dtypes · counts · properties · first 10 samples" },
              { name: "Streaming", value: "4 MB File.slice chunks", note: "no upload, no full load" },
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
