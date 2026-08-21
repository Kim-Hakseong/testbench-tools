import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { AdcTool } from "@/components/tool/AdcTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "ADC 계산기 — 카운트 ↔ 전압, LSB 크기",
  description:
    "8~24비트 ADC 카운트를 전압으로, 전압을 카운트로 변환하고 LSB 크기를 계산. count/(2^N−1) 규약 명시. 100% 브라우저 내 계산.",
  alternates: toolAlternates("adc-calculator", "ko"),
  openGraph: { url: "/ko/tools/adc-calculator/", images: ["/og/adc-calculator.png"], siteName: "TestBench.tools", title: "ADC 계산기 — 카운트 ↔ 전압, LSB 크기", description: "8~24비트 ADC 카운트를 전압으로, 전압을 카운트로 변환하고 LSB 크기를 계산. count/(2^N−1) 규약 명시. 100% 브라우저 내 계산.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "어떤 변환 규약을 사용하나요?",
    a: "ratio = count / (2^N − 1), 즉 전체 비트가 1인 코드가 정확히 Vref에 대응하는 규약입니다. 데이터시트에 따라 count / 2^N 규약(풀스케일 = Vref × (1 − 1/2^N))을 쓰는 경우도 있으며, 두 규약의 차이는 풀스케일에서 1 LSB입니다. 값을 비교할 때 규약부터 확인하세요.",
  },
  {
    q: "LSB는 몇 볼트인가요?",
    a: "이 규약에서 1 LSB = Vref / (2^N − 1)입니다. 12비트, 3.3V 기준으로 3.3 / 4095 ≈ 0.805861mV — 컨버터가 구분할 수 있는 최소 전압 변화입니다.",
  },
  {
    q: "카운트 2048이 왜 정확히 3.3V의 절반이 아닌가요?",
    a: "4095의 절반은 2047.5로 정수 코드가 아닙니다. 코드 2048은 중간보다 살짝 위라서 2048/4095 × 3.3 = 1.650403V가 됩니다.",
  },
  {
    q: "ADC 오차도 반영되나요?",
    a: "아니요 — 이상적인 전달 함수만 계산합니다. 오프셋, 게인 오차, INL/DNL, 기준전압 드리프트는 데이터시트를 참고하세요.",
  },
  {
    q: "데이터가 업로드되나요?",
    a: "아니요. 모든 계산은 브라우저 안에서 실행됩니다.",
  },
];

const C_SNIPPET = `/* 이상적 ADC 전달 함수, 규약: ratio = count / (2^N - 1) */
float adc_to_voltage(unsigned count, unsigned bits, float vref)
{
    unsigned max_code = (1u << bits) - 1u;
    return (float)count * vref / (float)max_code;
}
/* 12-bit, 3.3 V: 4095 -> 3.3000 V, 2048 -> 1.650403 V
 * LSB = 3.3 / 4095 = 0.805861 mV */`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "ADC 계산기",
          description: metadata.description!,
          slug: "adc-calculator",
          faqs: FAQS,
          locale: "ko",
        })}
      />
      <ToolShell slug="adc-calculator" locale="ko">
        <AdcTool />
        <AdSlot id="ko-adc-calculator-results" />

        <AnswerBox>
          이 툴은 8~24비트 ADC의 카운트를 입력 전압으로(또는 반대로) 변환하고
          LSB 크기를 알려줍니다. 규약은 <code>count / (2ᴺ − 1)</code>이며 패널에
          명시되어 있습니다 — 계산값과 데이터시트가 1 LSB 어긋나는 고전적 원인이
          규약 혼동이기 때문입니다.
        </AnswerBox>

        <Section title="동작 원리">
          <p>
            이상적인 N비트 ADC는 기준전압을 균등한 단계로 나눕니다. 이 규약에서
            최상위 코드(<code>2ᴺ − 1</code>)가 정확히 Vref를 읽으므로{" "}
            <code>V = count × Vref / (2ᴺ − 1)</code>, 1 LSB는{" "}
            <code>Vref / (2ᴺ − 1)</code>입니다. 역방향은 가장 가까운 코드로
            반올림한 뒤 유효 범위로 클램프합니다 — 실제 컨버터가 레일에서
            하는 동작과 같습니다.
          </p>
        </Section>

        <Section title="계산 예제">
          <DataWell>
            12비트 ADC · Vref 3.3 V
            <br />
            count 4095 → <span className="text-ok">3.3000 V</span> (풀 스케일)
            <br />
            count 2048 → 1.650403 V
            <br />
            LSB = 3.3 / 4095 = 0.805861 mV
          </DataWell>
        </Section>

        <AdSlot id="ko-adc-calculator-content" />

        <Section title="파라미터">
          <ParamsTable
            rows={[
              { name: "해상도", value: "8 / 10 / 12 / 14 / 16 / 24 bit" },
              { name: "규약", value: "ratio = count / (2ᴺ − 1)", note: "풀스케일 = 전체 1 코드" },
              { name: "LSB", value: "Vref / (2ᴺ − 1)" },
              { name: "역방향", value: "반올림 + 클램프", note: "0 … 2ᴺ − 1" },
            ]}
          />
        </Section>

        <Section title="C 구현">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools locale="ko" slugs={["plc-analog-scaling", "pt100-calculator", "4-20ma-scaling"]} />
      </ToolShell>
    </>
  );
}
