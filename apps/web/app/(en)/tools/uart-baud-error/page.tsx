import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { UartBaudTool } from "@/components/tool/UartBaudTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/uart-baud-error/" },
  title: "UART Baud Rate Error Calculator — divisor & error %",
  description:
    "Free online UART baud rate error calculator: integer divisor, actual baud and error percentage for your clock, with a table of common baud rates. 100% in your browser.",
  openGraph: { url: "/tools/uart-baud-error/",
    images: ["/og/uart-baud-error.png"], siteName: "TestBench.tools", title: "UART Baud Rate Error Calculator — divisor & error %", description: "Integer divisor, actual baud and error percentage for your UART clock.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "How much baud error can a UART link tolerate?",
    a: "A common engineering rule of thumb is to keep each side within about ±2 %, so the combined mismatch stays under ~4–5 % — the point where the last bits of a 10-bit frame sample outside their slots. The verdict banner here uses that ±2 % threshold.",
  },
  {
    q: "Why does 16 MHz give −3.5 % at 115200 baud?",
    a: "The divisor must be an integer: 16e6/(16×115200) = 8.68, which rounds to 9, producing 111 111 baud — 3.55 % slow. That is exactly why 'weird' crystals like 7.3728 or 11.0592 MHz exist: they divide evenly into all standard baud rates.",
  },
  {
    q: "What does ×8 oversampling change?",
    a: "Halving the oversampling doubles the available divisor for the same clock, which can land closer to the target at high baud rates — at the cost of noise immunity, since the receiver has fewer samples per bit to vote on.",
  },
  {
    q: "Both my devices show ~3 % error — will the link work?",
    a: "If both derive from similar clocks and err in the same direction, the relative error is what matters and the link often works. Errors in opposite directions add. Compute both ends here and compare the actual baud values, not the nominal ones.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. All math runs locally in your browser.",
  },
];

const C_SNIPPET = `/* UART divisor & real baud (16x oversampling) */
uint32_t div_   = (16000000u + 8u * 115200u) / (16u * 115200u); /* round: 9 */
float    actual = 16000000.0f / (16u * div_);   /* 111111.1 baud  */
float    err    = (actual - 115200) / 115200;   /* -3.55 %        */

/* 48 MHz instead: divisor 26 -> 115384.6 baud, +0.16 % — clean.  */`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "UART Baud Rate Error Calculator", description: metadata.description!, slug: "uart-baud-error", faqs: FAQS })} />
      <ToolShell slug="uart-baud-error">
        <UartBaudTool />
        <AdSlot id="uart-baud-error-results" />

        <AnswerBox>
          This tool computes the integer divisor a UART will actually use for
          your clock and target baud, the real baud rate that results, and the
          error percentage — with a PASS/RISKY verdict against the ~±2 % rule
          of thumb and a table across all common baud rates. The classic trap:
          16 MHz at 115200 baud lands 3.55 % slow.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A UART divides its clock by <code>oversampling × divisor</code> to
            get the bit clock, and the divisor must be an integer:{" "}
            <code>divisor = round(f_clk / (16 × baud))</code>. Whenever the
            ideal ratio is not an integer, the rounded divisor shifts the real
            baud rate. The receiver samples each bit near its center; as clock
            mismatch accumulates over the ~10 bits of a frame, sampling drifts
            off the bit cells and bytes corrupt — hence the small tolerance.
          </p>
          <p>
            The per-baud table makes clock selection obvious at a glance: some
            clocks are uniformly clean (48 MHz), others degrade precisely at
            the high rates you care about.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            16 MHz · 115200 baud · ×16
            <br />
            divisor = round(8.68) = 9 → actual 111 111 baud
            <br />
            error = <span className="text-err">−3.55 %</span> (risky) · at 48 MHz: divisor 26 → <span className="text-ok">+0.16 %</span>
          </DataWell>
        </Section>

        <AdSlot id="uart-baud-error-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Divisor", value: "round(f_clk/(OS·baud))", note: "integer" },
              { name: "Actual baud", value: "f_clk/(OS·divisor)" },
              { name: "Oversampling", value: "×16 (default) or ×8" },
              { name: "Tolerance", value: "~±2 % per side", note: "rule of thumb" },
            ]}
          />
        </Section>

        <Section title="C reference">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["stm32-timer", "can-bit-timing", "hex-to-ascii"]} />
      </ToolShell>
    </>
  );
}
