import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { FourTwentyTool } from "@/components/tool/FourTwentyTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "4-20mA 스케일링 계산기 — 단선 판정 포함",
  description:
    "4-20mA 루프 전류를 공정값으로, 공정값을 전류로 즉시 변환. 3.8mA 미만 단선(open loop)·범위 이탈 경고 포함. 100% 브라우저 내 계산.",
  alternates: toolAlternates("4-20ma-scaling", "ko"),
  openGraph: { url: "/ko/tools/4-20ma-scaling/", images: ["/og/4-20ma-scaling.png"], siteName: "TestBench.tools", title: "4-20mA 스케일링 계산기 — 단선 판정 포함", description: "4-20mA 루프 전류를 공정값으로, 공정값을 전류로 즉시 변환. 3.8mA 미만 단선(open loop)·범위 이탈 경고 포함. 100% 브라우저 내 계산.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "3.7mA를 넣으면 왜 음수값 대신 OPEN LOOP가 표시되나요?",
    a: "정상 동작하는 4-20mA 트랜스미터는 3.8mA 아래로 내려가지 않습니다. 그보다 낮은 전류는 대부분 단선, 트랜스미터 고장, 루프 무전원 상태를 뜻하므로, 계산기는 선형 외삽값보다 고장 진단을 먼저 표시합니다.",
  },
  {
    q: "판정 기준값은 정확히 어떻게 되나요?",
    a: "3.8mA 미만: 단선(open loop). 3.8~4mA: 하한 이탈(under-range). 20.5mA 초과: 상한 이탈(over-range). 4~20mA(20.5까지): 정상 범위입니다.",
  },
  {
    q: "왜 0mA가 아니라 4mA를 0%로 쓰나요?",
    a: "4mA 라이브 제로(live zero)는 '측정값이 0'과 '회로가 죽음'을 구분해 줍니다. 0mA는 오직 고장에서만 나오는 값이 되고, 남는 전류로 2선식 트랜스미터에 전원도 공급할 수 있습니다.",
  },
  {
    q: "공정값은 어떤 식으로 계산하나요?",
    a: "선형 보간입니다: 값 = 하한 + (mA − 4) × (상한 − 하한) / 16. 0~200°C 범위에서 12mA는 스팬의 정중앙인 100°C가 됩니다.",
  },
  {
    q: "입력한 데이터가 서버로 전송되나요?",
    a: "아니요. 모든 계산은 브라우저 안에서 실행됩니다.",
  },
];

const C_SNIPPET = `/* 4-20 mA -> 공학 단위 + 루프 판정 */
typedef enum { OPEN_LOOP, UNDER_RANGE, OK, OVER_RANGE } loop_status_t;

float scale_4_20(float ma, float lo, float hi, loop_status_t *st)
{
    *st = (ma < 3.8f) ? OPEN_LOOP
        : (ma < 4.0f) ? UNDER_RANGE
        : (ma > 20.5f) ? OVER_RANGE : OK;
    return lo + (ma - 4.0f) * (hi - lo) / 16.0f;
}
/* 12 mA @ 0..200 -> 100.0, OK; 3.7 mA -> OPEN_LOOP */`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "4-20mA 스케일링 계산기",
          description: metadata.description!,
          slug: "4-20ma-scaling",
          faqs: FAQS,
          locale: "ko",
        })}
      />
      <ToolShell slug="4-20ma-scaling" locale="ko">
        <FourTwentyTool />
        <AdSlot id="ko-4-20ma-scaling-results" />

        <AnswerBox>
          이 툴은 4-20mA 루프 전류를 설정한 범위의 공정값으로(또는 반대로) 즉시
          변환합니다. 동시에 루프 상태를 판정합니다 — 3.8mA 미만은 측정값이
          아니라 <strong>단선(open loop)</strong>으로 표시하고, 3.8~4mA는 하한
          이탈, 20.5mA 초과는 상한 이탈로 경고합니다.
        </AnswerBox>

        <Section title="동작 원리">
          <p>
            4-20mA 트랜스미터는 교정된 측정 범위를 16mA 스팬에 선형으로
            매핑합니다. 4mA가 범위 하한(라이브 제로), 20mA가 상한이며, 공정값은{" "}
            <code>하한 + (mA − 4) × (상한 − 하한) / 16</code>으로 계산합니다.
            정상 루프는 약 3.8mA 아래로 내려가지 않으므로, 그 미만의 전류는
            변환하지 않고 단선으로 진단하는 것이 계장 점검의 기본입니다.
          </p>
        </Section>

        <Section title="계산 예제">
          <DataWell>
            범위: 0…200 °C
            <br />
            12 mA → <span className="text-ok">100.0 °C</span> (스팬 50 %)
            <br />
            &nbsp;4 mA → 0 °C&nbsp;&nbsp;·&nbsp;&nbsp;20 mA → 200 °C
            <br />
            3.7 mA → <span className="text-err">OPEN LOOP</span> (3.8 mA 미만)
          </DataWell>
        </Section>

        <AdSlot id="ko-4-20ma-scaling-content" />

        <Section title="파라미터">
          <ParamsTable
            rows={[
              { name: "라이브 제로", value: "4 mA", note: "범위 하한" },
              { name: "풀 스케일", value: "20 mA", note: "범위 상한" },
              { name: "단선 판정", value: "< 3.8 mA", note: "배선·트랜스미터 점검" },
              { name: "하한 이탈", value: "3.8 – 4 mA", note: "하한 포화" },
              { name: "상한 이탈", value: "> 20.5 mA", note: "상한 포화" },
            ]}
          />
        </Section>

        <Section title="C 구현">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools locale="ko" slugs={["plc-analog-scaling", "adc-calculator", "pt100-calculator"]} />
      </ToolShell>
    </>
  );
}
