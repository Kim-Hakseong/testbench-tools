import type { Metadata } from "next";
import { Callout, H2, NoteShell, P, Quoted } from "@/components/notes/NoteShell";
import { JsonLd, noteJsonLd } from "@/lib/jsonld";
import { noteBySlug } from "@/content/notes";

const NOTE = noteBySlug("1756-if8-integer-counts")!;

export const metadata: Metadata = {
  alternates: { canonical: "/notes/1756-if8-integer-counts/" },
  title: "In integer mode, 32767 on a 1756-IF8 is not 20 mA",
  description:
    "ControlLogix analog inputs in integer mode put -32768 at 0 mA and 32767 at 20.58 mA, not 0 and 20. Where the numbers come from, why the obvious scaling is wrong at both ends, and how to check yours.",
  openGraph: {
    images: ["/og/note-1756-if8-integer-counts.png"],
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
          You put a 1756-IF8 in integer mode, wire a 4–20 mA transmitter to it, and write the
          scaling the way it has always worked: 0 mA is 0 counts, 20 mA is 32767, interpolate
          in between. The reading is close. It is close enough that it passes a bench check
          and close enough that nobody catches it during commissioning. It is also wrong at
          both ends, and the error is not a rounding difference — the zero point is off by a
          full half of the count range.
        </P>

        <P>
          The manual says so plainly, in a table that is easy to read past. This is what it
          actually prints.
        </P>

        <H2>What the manual says</H2>

        <P>
          Publication 1756-UM009G-EN-P, in the section <em>Data Format as Related to
          Resolution and Scaling</em>, introduces integer mode like this:
        </P>

        <Quoted>
          In integer mode, input modules generate digital signal values that correspond to a
          range from −32,768…+32,767 counts.
        </Quoted>

        <P>
          So far this matches the expectation: a signed 16-bit span. The table underneath is
          where it diverges. For the 1756-IF16, 1756-IF16K, 1756-IF8 and 1756-IF8K it gives,
          per range, the signal that corresponds to the low count and the signal that
          corresponds to the high count:
        </P>

        <Quoted>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-mute">
                <th className="pb-2 pr-6 font-normal">Range</th>
                <th className="pb-2 pr-6 font-normal">−32768 counts</th>
                <th className="pb-2 font-normal">32767 counts</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-6">±10V</td>
                <td className="pr-6">−10.25 V</td>
                <td>10.25 V</td>
              </tr>
              <tr>
                <td className="pr-6">0…10V</td>
                <td className="pr-6">0 V</td>
                <td>10.25 V</td>
              </tr>
              <tr>
                <td className="pr-6">0…5V</td>
                <td className="pr-6">0 V</td>
                <td>5.125 V</td>
              </tr>
              <tr>
                <td className="pr-6">0…20 mA</td>
                <td className="pr-6">0 mA</td>
                <td>20.58 mA</td>
              </tr>
            </tbody>
          </table>
        </Quoted>

        <P>
          Two things in that table break the assumption people bring to it.
        </P>

        <H2>The zero point is at the bottom of the count range</H2>

        <P>
          On the unipolar ranges — 0…10V, 0…5V, 0…20 mA — the bottom of the signal range maps
          to <strong>−32768</strong> counts, not to 0. The module does not shift the span for
          you because the range happens to start at zero. It always spends the whole signed
          16-bit range on whatever the configured span is.
        </P>

        <Callout>
          A 4 mA transmitter on the 0…20 mA range does not read somewhere near 6553 counts. It
          reads about −20030, because 4 mA is a fifth of the way up a span that begins at
          −32768 and does not reach 32767 until 20.58 mA.
        </Callout>

        <P>
          If your scaling assumed 0 counts at 0 mA, every reading is offset by half the range,
          and the sign of low readings is wrong too. This is the failure that gets noticed
          immediately, which is the lucky case.
        </P>

        <H2>Full scale is past the nominal end of the range</H2>

        <P>
          The second difference is the one that survives commissioning. The high count does
          not sit at the nominal end of the range. It sits at the module's{" "}
          <strong>extended</strong> endpoint:
        </P>

        <P>
          32767 counts is 20.58 mA on the 0…20 mA range, 10.25 V on 0…10V, 5.125 V on 0…5V,
          and 10.25 V on ±10V. The extra headroom is deliberate — it is what lets the module
          report an over-range signal instead of clipping silently at the nominal limit — but
          it means the count-per-unit slope is not the one you get by dividing the nominal
          span by 32767.
        </P>

        <P>
          A conversion that uses the nominal end instead reads about 2.8 % low on the current
          range and about 2.4 % low on the voltage ranges. That is small enough to look like sensor tolerance or a
          calibration offset, and large enough to matter on anything with a specification.
          A tank level that reads 97.2 % when it is full does not stop a plant; it just quietly
          makes everyone distrust the instrument.
        </P>

        <H2>Why the mistake is so easy to make</H2>

        <P>
          Because for most of the other things on the rack, the obvious scaling is right.
          Siemens S7 analog modules use 0…27648 for the nominal span. Mitsubishi's R60AD4
          gives 0…32000. LS ELECTRIC's XGF-AD8A in unsigned format gives 0…16000. In each of
          those, the published number <em>is</em> the value at the nominal end of the range,
          and the low end of a unipolar range <em>is</em> zero.
        </P>

        <P>
          The 1756 family does neither, and it does not do it in a way that announces itself:
          the numbers in the table are exact and unremarkable-looking. You have to read the
          column header — <em>Low Signal and User Counts</em> — to notice that the left column
          is the signal at −32768 rather than at zero counts.
        </P>

        <H2>There is a mode where none of this applies</H2>

        <P>
          Integer mode is not how most ControlLogix analog input modules are used. In floating
          point mode the module scales on itself and hands the controller a real number in
          engineering units. There is no raw count to convert, so there is no scaling to get
          wrong — and there is no meaningful "raw range" for the module at all.
        </P>

        <Callout>
          If you are looking for a raw range preset for a 1756-IF8 and cannot find one, check
          which mode the module is in first. In floating point mode the question has no
          answer, and that is not a gap in the documentation.
        </Callout>

        <P>
          Integer mode still exists for good reasons — it halves the connection size and it is
          what you get when migrating logic that expects counts — which is exactly why the
          conversion keeps being written by hand, and keeps being written from the assumption
          rather than from the table.
        </P>

        <H2>How to check yours in about a minute</H2>

        <P>
          Feed the module a known signal near the bottom of the range and read the raw count.
          If 0 mA gives you something close to −32768 rather than close to 0, you are in
          integer mode and the endpoints above apply. Then feed it a known signal near the top
          and confirm that the count you get at the nominal end of the range is short of 32767 by
          the headroom: 20 mA lands near 30920, not at 32767.
        </P>

        <P>
          The sibling modules do not share these endpoints, which is worth knowing before you
          copy a working conversion from one slot to another. On the same page, the 1756-IF6I
          reaches 32767 at 10.54688 V on ±10V and at 21.09376 mA on 0…20 mA, and the
          1756-IF6CIS reaches it at 21.09376 mA. Same family, same table, different numbers.
        </P>

        <H2>The general lesson</H2>

        <P>
          A raw-count conversion is three facts: what the low count means, what the high count
          means, and whether the module is doing the scaling itself. Two of those are usually
          assumed rather than looked up, and both assumptions are wrong here.
        </P>

        <P>
          Every analog preset we ship is recorded against the manual it came from — publication
          number, revision, and the table it was read out of — precisely because a value that
          is wrong by a factor like this does not announce itself. It just produces plausible
          numbers until somebody measures.
        </P>
      </NoteShell>
    </>
  );
}
