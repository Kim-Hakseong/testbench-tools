import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { MelsecAddressTool } from "@/components/tool/MelsecAddressTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/mitsubishi-address-converter/" },
  title: "Mitsubishi MELSEC Address Converter — octal X/Y vs hexadecimal",
  description:
    "Free MELSEC device address converter: X and Y are octal on FX5 but hexadecimal on iQ-R, so X20 is point 16 or 32 depending on the CPU. 100% in your browser.",
  openGraph: {
    images: ["/og/mitsubishi-address-converter.png"], siteName: "TestBench.tools",
    title: "Mitsubishi MELSEC Address Converter",
    description: "Decode MELSEC device numbers with the right radix per series, and convert points between iQ-R and FX5.",
    type: "website",
  },
};

const FAQS: FaqItem[] = [
  {
    q: "Why is there no X8 or X9 on an FX controller?",
    a: "Because X and Y device numbers on the MELSEC iQ-F / FX5 series are written in octal, and octal has no digits 8 or 9. The inputs run X0 to X7 and then continue at X10 — which is the eighth input, not the tenth. The device list in the FX5 User's Manual (Application) states the notation for every device.",
  },
  {
    q: "Does X20 mean the same thing on iQ-R and FX5?",
    a: "No, and this is the trap when porting a program. On FX5 the X devices are octal, so X20 is point 16. On MELSEC iQ-R they are hexadecimal, so the same text X20 is point 32. The physical point that FX5 calls X20 is written X10 on an iQ-R.",
  },
  {
    q: "Which devices are not affected by the series?",
    a: "The decimal ones. M (internal relay), D (data register), L, F, T, ST, C, LC, SM and SD are decimal on both series, so D100 is device 100 either way. The link devices B, SB, W and SW are hexadecimal on both. It is specifically X and Y whose radix differs.",
  },
  {
    q: "Where do these radices come from?",
    a: "From the device list tables in Mitsubishi's own manuals: the MELSEC iQ-R CPU Module User's Manual (Application), document SH-081264ENG, section 22.1; and the MELSEC iQ-F FX5 User's Manual (Application), document JY997D55401AD, section 4.1. Each table has a Notation column giving the radix per device. Series whose manuals have not been checked are deliberately not offered here rather than assumed to match.",
  },
  {
    q: "Does it cover Q and L series?",
    a: "Not yet. Only the two series above have been verified against their manuals. Rather than assume the Q and L series behave like iQ-R, they are left out until their device lists are confirmed — a wrong radix silently addresses the wrong point.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. Every address is parsed locally in your browser.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "Mitsubishi MELSEC Address Converter",
          description: metadata.description!,
          slug: "mitsubishi-address-converter",
          faqs: FAQS,
        })}
      />
      <ToolShell slug="mitsubishi-address-converter">
        <MelsecAddressTool />
        <AdSlot id="mitsubishi-address-converter-results" />

        <AnswerBox>
          This tool reads a MELSEC device address with the radix its CPU series
          actually uses. Pick iQ-R or iQ-F/FX5, enter something like{" "}
          <code>X20</code>, <code>D100</code> or <code>W1F</code>, and it returns
          the device number as a plain integer, the radix it was written in, and
          the same physical point written for the other series. Reference:{" "}
          <code>X20</code> is point 16 on FX5 (octal) but point 32 on iQ-R
          (hexadecimal).
        </AnswerBox>

        <Section title="How it works">
          <p>
            A MELSEC address is a device symbol followed by a device number, and
            the number is not always decimal. Mitsubishi&apos;s device list gives
            a notation per device: inputs and outputs are octal on the iQ-F / FX5
            family and hexadecimal on iQ-R, while the internal relay M and the
            data register D are decimal on both. That is why FX inputs jump from
            X7 straight to X10, and why an iQ-R happily accepts XF. The tool
            applies the table for the series you select and refuses digits that
            radix cannot contain, so a typo like X8 on an FX is reported instead
            of silently becoming something else.
          </p>
          <p>
            The conversion matters most when a program moves between families.
            Because the two series write the same point differently, copying an
            I/O list across without re-basing the numbers shifts every address —
            and it shifts them by an amount that grows as the numbers do, so a
            quick check of the first few points looks fine. Converting through
            the underlying point index, as this tool does, keeps the physical
            terminal the same.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            FX5 · X20 → octal → point <span className="text-ok">16</span>
            <br />
            iQ-R · X20 → hexadecimal → point <span className="text-ok">32</span>
            <br />
            the FX5 point 16 written for iQ-R → <span className="text-ok">X10</span>
            <br />
            FX5 · X8 → <span className="text-err">rejected</span> — octal has no digit 8
            <br />
            D100 → decimal on both series → point 100
          </DataWell>
        </Section>

        <AdSlot id="mitsubishi-address-converter-content" />

        <Section title="Device notation">
          <ParamsTable
            rows={[
              { name: "X, Y — iQ-F / FX5", value: "Octal", note: "digits 0-7" },
              { name: "X, Y — iQ-R", value: "Hexadecimal", note: "digits 0-9 A-F" },
              { name: "M, L, F, S", value: "Decimal", note: "both series" },
              { name: "D, R", value: "Decimal", note: "both series" },
              { name: "T, ST, C, LC", value: "Decimal", note: "both series" },
              { name: "B, SB", value: "Hexadecimal", note: "both series" },
              { name: "W, SW", value: "Hexadecimal", note: "both series" },
              { name: "SM, SD", value: "Decimal", note: "both series" },
            ]}
          />
          <p className="mt-3 text-sm text-mute">
            Source: MELSEC iQ-R CPU Module User&apos;s Manual (Application),
            SH-081264ENG §22.1 Device List; MELSEC iQ-F FX5 User&apos;s Manual
            (Application), JY997D55401AD §4.1 List of Devices.
          </p>
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["s7-address-converter", "modbus-address-converter", "number-base-converter"]} />
      </ToolShell>
    </>
  );
}
