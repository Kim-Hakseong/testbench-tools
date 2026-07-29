import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { Pt100Tool } from "@/components/tool/Pt100Tool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "PT100 / PT1000 계산기 — 저항 ↔ 온도 (IEC 60751)",
  description:
    "PT100/PT1000 RTD의 저항을 온도로, 온도를 저항으로 변환. IEC 60751 Callendar-Van Dusen 식(0~850°C) 사용. 100% 브라우저 내 계산.",
  alternates: toolAlternates("pt100-calculator", "ko"),
  openGraph: { images: ["/og/pt100-calculator.png"], siteName: "TestBench.tools", title: "PT100 / PT1000 계산기 — 저항 ↔ 온도 (IEC 60751)", description: "PT100/PT1000 RTD의 저항을 온도로, 온도를 저항으로 변환. IEC 60751 Callendar-Van Dusen 식(0~850°C) 사용. 100% 브라우저 내 계산.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "어떤 식과 계수를 사용하나요?",
    a: "T ≥ 0°C 구간의 IEC 60751 Callendar-Van Dusen 식 R(T) = R0·(1 + A·T + B·T²), A = 3.9083×10⁻³, B = −5.775×10⁻⁷입니다. 저항→온도는 근사 테이블이 아니라 2차식의 정확한 역산(근의 공식)입니다.",
  },
  {
    q: "왜 0~850°C로 제한되나요?",
    a: "0°C 아래에서는 표준에 C항이 붙은 4차식 분기가 추가되는데, 이 계산기는 아직 그 분기를 구현하지 않았습니다. 850°C 초과는 IEC 60751 백금 범위 밖입니다. 범위 밖 입력은 조용히 외삽하지 않고 명시적으로 거부합니다.",
  },
  {
    q: "PT100과 PT1000의 차이는요?",
    a: "0°C 저항 R0만 다릅니다: 100Ω 대 1000Ω. 온도 계수는 동일해서 PT1000은 모든 온도에서 PT100의 정확히 10배를 읽습니다 — 100°C에서 138.5055Ω 대신 1385.055Ω.",
  },
  {
    q: "PT100이 108.5Ω으로 측정되면 몇 도인가요?",
    a: "21.8189°C입니다. 현장 어림법: 상온 부근 PT100은 °C당 약 0.39Ω 변하므로, 108.5Ω은 100Ω 빙점보다 약 22°C 위 — 정확한 2차식 결과와 일치합니다.",
  },
  {
    q: "데이터가 업로드되나요?",
    a: "아니요. 식은 브라우저 안에서 계산됩니다.",
  },
];

const PY_SNIPPET = `# IEC 60751 Callendar-Van Dusen, T >= 0 °C
A, B = 3.9083e-3, -5.775e-7

def rtd_resistance(t, r0=100.0):
    return r0 * (1 + A*t + B*t*t)

def rtd_temperature(r, r0=100.0):
    return (-A + ((A*A - 4*B*(1 - r/r0)) ** 0.5)) / (2*B)

assert abs(rtd_resistance(100) - 138.5055) < 1e-3
assert abs(rtd_temperature(108.5) - 21.8189) < 1e-3`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "PT100 / PT1000 계산기",
          description: metadata.description!,
          slug: "pt100-calculator",
          faqs: FAQS,
          locale: "ko",
        })}
      />
      <ToolShell slug="pt100-calculator" locale="ko">
        <Pt100Tool />
        <AdSlot id="ko-pt100-calculator-results" />

        <AnswerBox>
          이 툴은 PT100·PT1000 백금 측온저항체의 저항을 온도로, 온도를 저항으로
          변환합니다. 0…850°C 구간의 IEC 60751 Callendar-Van Dusen 식을 그대로
          사용하며, 기준점은 100°C ↔ 138.5055Ω, 실측 108.5Ω ↔ 21.8189°C(PT100)
          입니다.
        </AnswerBox>

        <Section title="동작 원리">
          <p>
            백금 저항은 온도에 거의 — 그러나 정확히는 아니게 — 비례합니다. IEC
            60751은 그 곡률을 <code>R(T) = R0·(1 + A·T + B·T²)</code>(T ≥ 0°C)로
            규정하며, <code>A = 3.9083×10⁻³</code>,{" "}
            <code>B = −5.775×10⁻⁷</code>입니다. T에 대한 2차식이므로 역방향은
            근의 공식으로 닫힌 형태로 풀리고, 저항 → 온도 → 저항 왕복 오차는
            10⁻⁵Ω 이내입니다.
          </p>
          <p>
            표준의 음수 온도 분기(C 계수 포함)는 의도적으로 구현하지 않았으며,
            범위 밖 입력은 지원 범위를 안내하며 거부합니다.
          </p>
        </Section>

        <Section title="계산 예제">
          <DataWell>
            PT100 · T = 100 °C
            <br />
            R = 100 × (1 + 3.9083×10⁻³·100 − 5.775×10⁻⁷·100²)
            <br />
            &nbsp;&nbsp;= <span className="text-ok">138.5055 Ω</span>
            <br />
            <br />
            실측 R = 108.5 Ω → T = <span className="text-ok">21.8189 °C</span>
          </DataWell>
        </Section>

        <AdSlot id="ko-pt100-calculator-content" />

        <Section title="파라미터">
          <ParamsTable
            rows={[
              { name: "표준", value: "IEC 60751", note: "Callendar-Van Dusen" },
              { name: "A", value: "3.9083 × 10⁻³ °C⁻¹" },
              { name: "B", value: "−5.775 × 10⁻⁷ °C⁻²" },
              { name: "R0", value: "100 Ω (PT100) / 1000 Ω (PT1000)" },
              { name: "범위", value: "0 … 850 °C", note: "T < 0 분기(C항) 미구현" },
            ]}
          />
        </Section>

        <Section title="Python 구현">
          <CodeSnippet language="Python" code={PY_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools locale="ko" slugs={["adc-calculator", "4-20ma-scaling", "thermocouple-calculator"]} />
      </ToolShell>
    </>
  );
}
