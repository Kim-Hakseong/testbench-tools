import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { TimerCalcTool } from "@/components/tool/TimerCalcTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/stm32-timer/" },
  title: "STM32 Timer Calculator — PSC/ARR pairs and timer period",
  description:
    "Free online STM32-style timer calculator: prescaler and auto-reload (PSC/ARR) pairs for your clock and target frequency, ranked by error, plus the resulting timer period and a PSC/ARR table for 16, 48 and 72 MHz clocks. 100% in your browser.",
  openGraph: { url: "/tools/stm32-timer/",
    images: ["/og/stm32-timer.png"], siteName: "TestBench.tools", title: "STM32 Timer Calculator — PSC/ARR pairs and timer period", description: "PSC/ARR pairs, timer period and tick time for your clock and target frequency, ranked by error.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Why PSC+1 and ARR+1 in the formula?",
    a: "The registers hold 'divide ratio minus one': a prescaler register of 0 divides by 1, and the counter counts 0…ARR inclusive, which is ARR+1 steps. Forgetting either +1 is the classic reason a timer runs one count fast — the formula is f = f_clk / ((PSC+1)·(ARR+1)).",
  },
  {
    q: "Several exact pairs exist — which should I pick?",
    a: "For a plain periodic interrupt any exact pair works. For PWM, prefer the smallest legal PSC and the largest ARR, because ARR sets the duty resolution (ARR+1 steps): 72 MHz → 1 kHz with PSC=1/ARR=35999 gives 36 000 duty steps versus 1 000 with PSC=71/ARR=999. PSC=0 is not available here — it would need ARR=71999, past the 16-bit maximum of 65535 — which is why the smallest prescaler that divides 72 000 into a legal pair is 2, i.e. PSC=1.",
  },
  {
    q: "Is this specific to STM32?",
    a: "The math is generic to any prescaler-plus-autoreload timer (STM32, most ARM MCUs, AVR with its prescaler taps aside). What is STM32-flavored here is the register naming (PSC/ARR) and the 16-bit 0…65535 range; 32-bit timers simply extend the same formula.",
  },
  {
    q: "Why can't some frequencies be hit exactly?",
    a: "Two conditions have to hold at once: f_clk/f_target must be a whole number, and that number must split into two factors each ≤65536. A 72 MHz clock cannot produce exactly 7 Hz because the first condition fails — 72 000 000/7 = 10 285 714.29, not an integer. The second condition sets the slow end: the largest total divide a 16-bit pair can reach is 65536² = 4 294 967 296, so from 72 MHz the lowest exactly reachable update frequency is about 0.0168 Hz. 3 Hz, on the other hand, is exact — 24 000 000 = 375 × 64 000, i.e. PSC 374 / ARR 63999. When no exact split exists the tool shows the nearest pairs with their error instead.",
  },
  {
    q: "What is the timer period for a given PSC/ARR?",
    a: "Period is the reciprocal of the update frequency: T = (PSC+1)·(ARR+1)/f_clk, and one counter tick lasts (PSC+1)/f_clk. At 72 MHz with PSC 71 / ARR 999 the tick is 72/72 000 000 = 1 µs and the period is 72 000/72 000 000 = 1 ms. The tool prints the period next to every pair it lists, so you can read it off directly instead of converting by hand.",
  },
  {
    q: "Is my data uploaded?",
    a: "No. The search runs locally in your browser.",
  },
];

/* Smallest legal PSC for each exact pair: the prescaler is the smallest
   divisor of f_clk/f_target whose quotient still fits ARR+1 ≤ 65536, which
   is also the first row timerSolutions() returns (exact first, then PSC
   ascending). Every row below is that pair, product checked by hand. */
const TABLE_ROWS = [
  { name: "72 MHz → 1 Hz", value: "PSC 1124 / ARR 63999", note: "1125 × 64 000 = 72 000 000" },
  { name: "72 MHz → 10 Hz", value: "PSC 119 / ARR 59999", note: "120 × 60 000 = 7 200 000" },
  { name: "72 MHz → 100 Hz", value: "PSC 11 / ARR 59999", note: "12 × 60 000 = 720 000" },
  { name: "72 MHz → 1 kHz", value: "PSC 1 / ARR 35999", note: "2 × 36 000 = 72 000" },
  { name: "72 MHz → 10 kHz", value: "PSC 0 / ARR 7199", note: "1 × 7 200 = 7 200" },
  { name: "72 MHz → 100 kHz", value: "PSC 0 / ARR 719", note: "1 × 720 = 720" },
  { name: "48 MHz → 1 Hz", value: "PSC 749 / ARR 63999", note: "750 × 64 000 = 48 000 000" },
  { name: "48 MHz → 10 Hz", value: "PSC 74 / ARR 63999", note: "75 × 64 000 = 4 800 000" },
  { name: "48 MHz → 100 Hz", value: "PSC 7 / ARR 59999", note: "8 × 60 000 = 480 000" },
  { name: "48 MHz → 1 kHz", value: "PSC 0 / ARR 47999", note: "1 × 48 000 = 48 000" },
  { name: "48 MHz → 10 kHz", value: "PSC 0 / ARR 4799", note: "1 × 4 800 = 4 800" },
  { name: "48 MHz → 100 kHz", value: "PSC 0 / ARR 479", note: "1 × 480 = 480" },
  { name: "16 MHz → 1 Hz", value: "PSC 249 / ARR 63999", note: "250 × 64 000 = 16 000 000" },
  { name: "16 MHz → 10 Hz", value: "PSC 24 / ARR 63999", note: "25 × 64 000 = 1 600 000" },
  { name: "16 MHz → 100 Hz", value: "PSC 3 / ARR 39999", note: "4 × 40 000 = 160 000" },
  { name: "16 MHz → 1 kHz", value: "PSC 0 / ARR 15999", note: "1 × 16 000 = 16 000" },
  { name: "16 MHz → 10 kHz", value: "PSC 0 / ARR 1599", note: "1 × 1 600 = 1 600" },
  { name: "16 MHz → 100 kHz", value: "PSC 0 / ARR 159", note: "1 × 160 = 160" },
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
          period, where <code>T = (PSC+1)·(ARR+1)/f_clk</code>. 72 MHz to 1 kHz
          solves exactly with PSC 71 / ARR 999, among others. The table further
          down lists the smallest-prescaler exact pair for six target
          frequencies on 16, 48 and 72 MHz timer clocks.
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
            PWM tip: PSC 1, ARR 35999 → same 1 kHz with 36 000 duty steps
            <br />
            tick = 72/72e6 = 1 µs · period = 72 000/72e6 = 1 ms
          </DataWell>
        </Section>

        <Section title="Timer period and tick time">
          <p>
            The same two registers give you the period directly:{" "}
            <code>T = (PSC+1)·(ARR+1)/f_clk</code>, and one counter tick lasts{" "}
            <code>(PSC+1)/f_clk</code>. Reading them in that order is usually
            the quicker way to set a timer up — pick the tick you want the
            counter to advance at, then set ARR+1 to the number of those ticks
            the period should last. At 72 MHz, PSC 71 makes the tick exactly
            1 µs, so ARR+1 is then the period in microseconds: ARR 999 is 1 ms,
            ARR 19999 is 20 ms, and ARR 65535 is the longest that prescaler can
            reach, 65.536 ms.
          </p>
          <p>
            Because both registers are 16 bit, the longest period from a single
            timer is <code>65536·65536/f_clk</code> — about 59.65 s at 72 MHz
            and 268.4 s at 16 MHz. Anything slower needs a software counter on
            top of the update interrupt, or a 32-bit timer, where the same
            formula applies with the wider range.
          </p>
        </Section>

        <AdSlot id="stm32-timer-content" />

        <Section title="PSC/ARR table for 16, 48 and 72 MHz clocks">
          <p>
            Each row is the exact pair with the smallest legal prescaler, which
            is also the first row this tool returns for that input. The right
            column is the arithmetic: (PSC+1) × (ARR+1) = f_clk/f_target. Note
            what happens at 72 MHz → 1 kHz: the total divide is 72 000, more
            than a single 16-bit register can hold, so PSC 0 is impossible and
            the prescaler has to divide by 2.
          </p>
          <ParamsTable rows={TABLE_ROWS} />
          <p>
            Read the ARR column as duty resolution when you are after PWM: the
            1 Hz rows give 64 000 steps, while 100 kHz on a 16 MHz clock leaves
            only 160. If a row&apos;s resolution is too coarse, the only
            remaining lever is a faster timer clock — the pairs above are
            already the best split of the divide the clock gives you.
          </p>
        </Section>

        <Section title="Parameters">
          <ParamsTable
            rows={[
              { name: "Formula", value: "f = f_clk/((PSC+1)(ARR+1))" },
              { name: "Register range", value: "0 … 65535 each", note: "16-bit timers" },
              { name: "Max total divide", value: "65536² = 4 294 967 296", note: "both registers at full scale" },
              { name: "Period", value: "(PSC+1)(ARR+1)/f_clk", note: "shown per row" },
              { name: "Tick", value: "(PSC+1)/f_clk", note: "one counter step" },
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
