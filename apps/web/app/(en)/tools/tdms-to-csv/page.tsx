import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { TdmsToCsvTool } from "@/components/tool/TdmsToCsvTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/tdms-to-csv/" },
  title: "TDMS to CSV Converter — in your browser, no upload",
  description:
    "Free online NI TDMS to CSV converter. Drag in a .tdms file, pick channels and download CSV — parsed by streaming in your browser, nothing is uploaded.",
  openGraph: { url: "/tools/tdms-to-csv/",
    images: ["/og/tdms-to-csv.png"], siteName: "TestBench.tools", title: "TDMS to CSV Converter — in your browser, no upload", description: "Free online NI TDMS to CSV converter. Drag in a .tdms file, pick channels and download CSV — parsed by streaming in your browser, nothing is uploaded.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Is my TDMS file uploaded to a server?",
    a: "No. The file is read locally with the browser's File API in 4 MB slices and parsed in JavaScript. It never leaves your machine — which also means confidential measurement data stays confidential.",
  },
  {
    q: "How large a file can it handle?",
    a: "The parser streams the file in slices rather than loading it whole, but decoded channel data does live in browser memory. Files beyond a few hundred MB may hit tab memory limits — a warning appears above 200 MB. For batch or multi-GB conversion, a desktop TDMS Converter app is planned.",
  },
  {
    q: "Which TDMS features are supported?",
    a: "Standard little-endian segments with non-interleaved raw data and all numeric channel types (i8–i64, u8–u64, f32, f64), plus file/group/channel properties including strings, numerics, booleans and timestamps. Not yet supported: big-endian segments, interleaved data, DAQmx raw scalers and string-typed channel data — those fail with a clear message rather than producing wrong numbers.",
  },
  {
    q: "What does the CSV look like?",
    a: "One column per selected channel, headed group/channel. Channels of different lengths are padded with empty cells. Values are written in full double precision.",
  },
  {
    q: "Why do my channels show fewer samples than expected?",
    a: "A TDMS file appends data in segments; an application that crashed mid-write can leave a truncated final segment. The parser keeps every complete value and drops only the incomplete tail, so the sample count reflects what is actually recoverable.",
  },
];

const PY_SNIPPET = `# The same conversion with the official NI Python package:
#   pip install nptdms
from nptdms import TdmsFile

tdms = TdmsFile.read("measurement.tdms")
for group in tdms.groups():
    for channel in group.channels():
        print(group.name, channel.name, len(channel))
tdms["group1"].as_dataframe().to_csv("measurement.csv")`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "TDMS to CSV Converter",
          description: metadata.description!,
          slug: "tdms-to-csv",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="tdms-to-csv">
        <TdmsToCsvTool />
        <AdSlot id="tdms-to-csv-results" />

        <AnswerBox>
          This tool converts NI TDMS measurement files to CSV entirely in your
          browser: drop a <code>.tdms</code> file, watch the channel tree appear
          with sample counts and properties, tick the channels you want and
          download the CSV. Parsing is streamed in 4 MB slices, so the file is
          never uploaded and never loaded whole.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A TDMS file is a chain of segments. Each segment starts with a
            28-byte lead-in — the <code>TDSm</code> tag, a table-of-contents
            bitmask, version and two 64-bit lengths — followed by metadata
            (object paths like <code>/&apos;group&apos;/&apos;channel&apos;</code>, raw-data
            indexes and properties) and then the raw sample bytes,
            channel-after-channel. Because later segments may reuse the previous
            segment&apos;s raw index, a correct reader tracks object state across the
            whole chain — this parser does, and it processes bytes incrementally
            so chunk boundaries can fall anywhere, even mid-value.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            file: group1 · 2 channels (f64) · 100 samples each · 2 segments
            <br />
            → tree: group1 / ch1 (unit=V · gain=1.5), ch2
            <br />
            → CSV: header “group1/ch1,group1/ch2” + 100 data rows
            <br />
            <span className="text-ok">
              parser output is byte-for-byte identical whether the file is fed
              whole or 1 byte at a time
            </span>{" "}
            (verified in this site&apos;s test suite)
          </DataWell>
        </Section>

        <AdSlot id="tdms-to-csv-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Input", value: ".tdms (TDMS 2.0)", note: "little-endian, non-interleaved" },
              { name: "Channel dtypes", value: "i8–i64, u8–u64, f32, f64" },
              { name: "Properties", value: "string · numeric · bool · timestamp" },
              { name: "Streaming", value: "4 MB File.slice chunks", note: "no full-file load, no upload" },
              { name: "Not supported", value: "big-endian · interleaved · DAQmx", note: "explicit error, never silent" },
            ]}
          />
        </Section>

        <Section title="Python equivalent">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["tdms-viewer", "csv-waveform-plotter", "hex-file-viewer"]} />
      </ToolShell>
    </>
  );
}
