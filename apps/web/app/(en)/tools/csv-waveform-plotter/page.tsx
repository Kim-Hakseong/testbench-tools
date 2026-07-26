import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { CsvPlotterTool } from "@/components/tool/CsvPlotterTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "CSV Waveform Plotter — quick-look charts in the browser",
  description:
    "Free online CSV waveform plotter: drop a CSV, pick channels, and see the traces on a scope-style canvas — auto delimiter and header detection, no upload.",
  openGraph: { title: "CSV Waveform Plotter — quick-look charts in the browser", description: "Drop a CSV and see channel traces on a scope-style canvas, all client-side.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Which CSV layouts are understood?",
    a: "Comma, semicolon or tab delimited files, with or without a header row — both are auto-detected. If the first row contains anything non-numeric it becomes the channel names; otherwise columns get generic names. Non-numeric rows inside the data are skipped and counted.",
  },
  {
    q: "What does 'first column = X axis' do?",
    a: "When enabled, column 1 (typically time) provides the horizontal coordinates and the remaining columns plot against it. Disabled, every column plots against its row index — useful when the file has no time base.",
  },
  {
    q: "How large a file can it plot?",
    a: "Parsing caps at 200 000 rows to keep the canvas responsive; larger files plot their first 200 000 rows. For multi-million-sample datasets, decimate the CSV first or use a desktop plotting tool.",
  },
  {
    q: "Why do gaps appear in a trace?",
    a: "Empty or non-numeric cells become NaN and break the polyline instead of drawing a misleading interpolated segment — the same convention scope software uses for invalid samples.",
  },
  {
    q: "Is my file uploaded?",
    a: "No. Parsing and drawing run entirely in your browser on a canvas element.",
  },
];

const PY_SNIPPET = `# The same quick look with pandas + matplotlib
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("capture.csv", sep=None, engine="python")
df.plot(x=df.columns[0])     # first column as X axis
plt.show()`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "CSV Waveform Plotter", description: metadata.description!, slug: "csv-waveform-plotter", faqs: FAQS })} />
      <ToolShell slug="csv-waveform-plotter">
        <CsvPlotterTool />
        <AdSlot id="csv-waveform-plotter-results" />

        <AnswerBox>
          This tool turns a CSV of logged samples into a quick-look waveform
          chart: drop the file, tick the channels, and the traces render on a
          scope-style canvas with auto-scaled axes. Delimiter and header row
          are detected automatically, the first column can serve as the time
          axis, and everything happens locally — handy for eyeballing a data
          logger export without opening a spreadsheet.
        </AnswerBox>

        <Section title="How it works">
          <p>
            The parser sniffs the delimiter from the first line (comma,
            semicolon or tab), decides whether that line is a header, and
            reads every following row into per-column numeric arrays. The
            renderer then computes the min/max envelope of the visible
            channels, maps samples onto the canvas with a light grid, and
            draws each channel as a colored polyline — breaking the line at
            invalid cells rather than interpolating through them. Channel
            visibility toggles re-render instantly.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            time,ch1,ch2
            <br />
            0,0.0,5.0
            <br />
            0.001,0.31,4.9 … (1000 rows)
            <br />
            → 2 traces over t = 0…1 s, auto-scaled, ch2 toggleable
          </DataWell>
        </Section>

        <AdSlot id="csv-waveform-plotter-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Delimiters", value: ", · ; · TAB", note: "auto-detected" },
              { name: "Header", value: "auto-detected", note: "generic names otherwise" },
              { name: "Row cap", value: "200 000", note: "keeps rendering responsive" },
              { name: "Invalid cells", value: "break the trace", note: "no fake interpolation" },
              { name: "X axis", value: "first column or row index" },
            ]}
          />
        </Section>

        <Section title="Python equivalent">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["tdms-to-csv", "tdms-viewer", "hex-file-viewer"]} />
      </ToolShell>
    </>
  );
}
