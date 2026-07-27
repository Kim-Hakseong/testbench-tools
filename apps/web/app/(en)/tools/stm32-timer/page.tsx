import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { TimerCalcTool } from "@/components/tool/TimerCalcTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/stm32-timer/" },
  title: "STM32 Timer Calculator — PSC/ARR pairs for a target frequency",
  description:
    "Free online STM32-style timer calculator: prescaler and auto-reload (PSC/ARR) pairs for your clock and target frequency, ranked by error. 100% in your browser.",
  openGraph: { title: "STM32 Timer Calculator — PSC/ARR pairs for a target frequency", description: "PSC/ARR pairs for your timer clock and target frequency, ranked by error.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why PSC+1 and ARR+1 in the formula?",
    a: "The registers hold 'divide ratio minus one': a prescaler register of 0 divides by 1, and the counter counts 0…ARR inclusive, which is ARR+1 steps. Forgetting either +1 is the classic reason a timer runs one count fast — the formula is f = f_clk / ((PSC+1)·(ARR+1)).",
  },
  {
    q: "Several exact pairs exist — which should I pick?",
    a: "For a plain periodic interrupt any exact pair works. For PWM, prefer a small PSC and large ARR: ARR sets the duty resolution (ARR+1 steps), so 72 MHz → 1 kHz with PSC=0/ARR=71999 gives 72000 duty steps versus 1000 with PSC=71/ARR=999.",
  },
  {
    q: "Is this specific to STM32?",
    a: "The math is generic to any prescaler-plus-autoreload timer (STM32, most ARM MCUs, AVR with its prescaler taps aside). What is STM32-flavored here is the register naming (PSC/ARR) and the 16-bit 0…65535 range; 32-bit timers simply extend the same formula.",
  },
  {
    q: "Why can't some frequencies be hit exactly?",
    a: "f_clk/f_target must factor into two integers each ≤65536. A 72 MHz clock cannot produce exactly 3 Hz (72e6/3 = 24 000 000 > 65536²·? — the factors exceed the register range), so the tool shows the nearest achievable values with their error instead.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. The search runs locally in your browser.",
  },
];

const C_SNIPPET = `/* Timer update frequency: f = f_clk / ((PSC+1) * (ARR+1))    */
/* 72 MHz -> 1 kHz: 72e6 / 1000 = 72000 = 72 * 1000            */
TIM3->PSC = 72   - 1;    /* prescaler: tick = 1 MHz            */
TIM3->ARR = 1000 - 1;    /* auto-reload: overflow every 1000   */
/* -> update event at exactly 1 kHz, duty resolution 1000 steps */`;

export default function Page() {
  return (
    <>
      <JsonLd data={toolJsonLd({ name: "STM32 Timer Calculator", description: metadata.description!, slug: "stm32-timer", faqs: FAQS })} />
      <ToolShell slug="stm32-timer">
        <TimerCalcTool />
        <AdSlot id="stm32-timer-results" />

        <AnswerBox>
          This tool finds prescaler / auto-reload (PSC/ARR) register pairs that
          make a 16-bit timer hit a target frequency:{" "}
          <code>f = f_clk / ((PSC+1)·(ARR+1))</code>. It lists the closest
          pairs ranked by error — exact solutions first — with the resulting
          period. 72 MHz to 1 kHz solves exactly with PSC 71 / ARR 999, among
          others.
        </AnswerBox>

        <Section title="How it works">
          <p>
            A hardware timer divides its input clock twice: the prescaler
            divides by PSC+1 to produce the counting tick, and the counter
            overflows after ARR+1 ticks. Hitting a frequency exactly means
            factoring <code>f_clk / f_target</code> into two integers that both
            fit in 16 bits. The tool searches that factorization space,
            including near-miss divisors when no exact split exists, and ranks
            by relative error with small prescalers preferred — small PSC keeps
            ARR large, which is what gives PWM its duty-cycle resolution.
          </p>
        </Section>

        <Section title="Worked example">
          <DataWell>
            f_clk 72 MHz · target 1 kHz → total divide 72 000
            <br />
            PSC 71, ARR 999 → 72e6/(72·1000) = <span className="text-ok">1000.000 Hz</span> (exact)
            <br />
            PWM tip: PSC 0, ARR 71999 → same 1 kHz with 72 000 duty steps
          </DataWell>
        </Section>

        <AdSlot id="stm32-timer-content" />

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Formula", value: "f = f_clk/((PSC+1)(ARR+1))" },
              { name: "Register range", value: "0 … 65535 each", note: "16-bit timers" },
              { name: "Period", value: "1/f", note: "shown per row" },
              { name: "PWM resolution", value: "ARR+1 steps", note: "prefer small PSC" },
            ]}
          />
        </Section>

        <Section title="C reference">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools slugs={["uart-baud-error", "can-bit-timing", "adc-calculator"]} />
      </ToolShell>
    </>
  );
}
