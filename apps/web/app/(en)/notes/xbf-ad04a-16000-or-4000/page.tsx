import type { Metadata } from "next";
import { Callout, H2, NoteShell, P, Quoted } from "@/components/notes/NoteShell";
import { JsonLd, noteJsonLd } from "@/lib/jsonld";
import { noteBySlug } from "@/content/notes";

const NOTE = noteBySlug("xbf-ad04a-16000-or-4000")!;

export const metadata: Metadata = {
  alternates: { canonical: "/notes/xbf-ad04a-16000-or-4000/" },
  title: "The XBF-AD04A manual prints two different full-scale values",
  description:
    "A footnote in the LS XBF-AD04A manual says the unsigned digital output reaches 16000; the table above it says 4000. Which is right, how the manual itself settles it, and how to handle a self-contradicting datasheet.",
  openGraph: {
    images: ["/og/note-xbf-ad04a-16000-or-4000.png"],
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
          Section 2.2.2 of the XGB analog module manual gives the XBF-AD04A's performance
          specification. Read the table and you get one answer. Read the notes printed
          directly underneath it and you get a different one, four times larger. Both are on
          the same page.
        </P>

        <P>
          This is not a trick question — one of them is simply wrong, and the manual contains
          enough information to say which. It is worth working through, because a
          self-contradicting datasheet is a normal event and “which line do I believe” comes
          up far more often than anyone admits.
        </P>

        <H2>The two claims</H2>

        <P>The specification table, under <em>Digital output → Range</em>:</P>

        <Quoted>
          <table className="w-full border-collapse text-left">
            <tbody>
              <tr>
                <td className="pr-8">Type</td>
                <td>12 bit binary data</td>
              </tr>
              <tr>
                <td className="pr-8">Unsigned value</td>
                <td>0 ~ 4000</td>
              </tr>
              <tr>
                <td className="pr-8">Signed value</td>
                <td>−2000 ~ 2000</td>
              </tr>
              <tr>
                <td className="pr-8">Percentile value</td>
                <td>0 ~ 1000</td>
              </tr>
              <tr>
                <td className="pr-8">Max. resolution</td>
                <td>2.5 mV (1/4000) · 5 µA (1/4000)</td>
              </tr>
            </tbody>
          </table>
        </Quoted>

        <P>And note 3, immediately below that table:</P>

        <Quoted>
          3) Gain Value: Analog input value where digital output value is 16000 when digital
          output format is set to Unsigned Value.
        </Quoted>

        <P>
          So the table says the unsigned output tops out at 4000 and the note says it tops out
          at 16000.
        </P>

        <H2>Three things settle it</H2>

        <P>
          <strong>The bit width.</strong> The same table says the digital output is 12-bit
          binary data. Twelve bits cannot represent 16000 — the largest unsigned value is
          4095. The note asks for a number the module has no room to produce.
        </P>

        <P>
          <strong>The resolution figure.</strong> Max. resolution is printed as 2.5 mV
          (1/4000) for voltage and 5 µA (1/4000) for current. Both spell out the denominator.
          A 0–10 V span in 4000 steps is 2.5 mV per step, which is exactly what is printed; in
          16000 steps it would be 0.625 mV.
        </P>

        <P>
          <strong>The other formats scale with it.</strong> Signed is −2000…2000 and
          percentile is 0…1000 — one half and one quarter of 4000. They are consistent with
          each other and with a 4000-count unsigned span. Nothing in the table is consistent
          with 16000.
        </P>

        <Callout>
          The table wins, three independent ways. The unsigned full scale of an XBF-AD04A is
          4000. A conversion built on the footnote reads every value at a quarter of its true
          size.
        </Callout>

        <H2>Where the 16000 probably came from</H2>

        <P>
          16000 is not a random number. It is the unsigned full scale of the XGF-AD8A, the
          8-channel analog input in the same vendor's XGT family, which is a 14-bit module.
          The two manuals are structured almost identically, note-for-note. The most likely
          explanation is that the note was carried across from the sibling document and the
          number was not updated with it.
        </P>

        <P>
          That is a guess about how it happened, and it should be read as one. What is not a
          guess is that the number is unusable on a 12-bit module.
        </P>

        <H2>It is not the only slip in that chapter</H2>

        <P>
          Two more, in the same document, both harmless but both worth knowing about when you
          are trying to decide how much weight a given line carries:
        </P>

        <P>
          Section 2.5.3 is headed <em>If range is DC4 ~ 20mA</em> and the axis of the
          characteristic graph inside it is labelled “Analog input value (voltage)”. And the
          specification table for this input module lists “No. of output channel: 4 channels”
          and “Absolute max. output: DC ±15V / ±25 mA”.
        </P>

        <P>
          None of those change a number you would implement. They do tell you something about
          the document: the tables are maintained and the prose around them is inherited. That
          is the pattern, and it is a useful prior for the next manual you read.
        </P>

        <H2>The rule this produces</H2>

        <P>
          When a document disagrees with itself, prefer the claim that is corroborated by
          something structural — bit width, resolution, the relationship between formats —
          over a claim that stands alone in prose. A number in a sentence has no neighbours to
          check it against. A number in a specification table usually has several.
        </P>

        <P>
          And when you cannot corroborate either side, the right answer is to implement
          neither and say so. Every vendor constant on this site is recorded against the
          document it came from; where a value could not be settled, the preset does not ship
          and the reason is written down. A missing preset costs somebody five minutes with a
          manual. A preset that is wrong by four times costs a calibration.
        </P>
      </NoteShell>
    </>
  );
}
