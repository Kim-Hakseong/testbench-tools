import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { PlcScalingTool } from "@/components/tool/PlcScalingTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "PLC 아날로그 스케일링 계산기 — raw ↔ 공학 단위",
  description:
    "PLC 아날로그 raw 카운트를 공학 단위로, 공학 단위를 raw로 변환. 검증된 Siemens S7 0–27648 프리셋 또는 커스텀 범위 지원. 100% 브라우저 내 계산.",
  alternates: toolAlternates("plc-analog-scaling", "ko"),
  openGraph: { images: ["/og/plc-analog-scaling.png"], siteName: "TestBench.tools", title: "PLC 아날로그 스케일링 계산기 — raw ↔ 공학 단위", description: "PLC 아날로그 raw 카운트를 공학 단위로, 공학 단위를 raw로 변환. 검증된 Siemens S7 0–27648 프리셋 또는 커스텀 범위 지원. 100% 브라우저 내 계산.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "Siemens S7의 raw 범위는 얼마인가요?",
    a: "S7 아날로그 입력 모듈은 정격 0~100% 신호를 0~27648 카운트로 내보냅니다. 27648의 절반인 13824는 0~100 범위에서 정확히 50.0이 됩니다. 이 프리셋이 현재 유일하게 탑재된 벤더 범위인데, 이 프로젝트의 검증 파일에 출처와 함께 기재된 값만 구현하기 때문입니다.",
  },
  {
    q: "Allen-Bradley, Mitsubishi, LS 프리셋은 왜 없나요?",
    a: "이 사이트는 벤더 상수를 매뉴얼 출처가 검증 파일에 기재된 뒤에만 구현합니다(정확성 게이트). 그 전까지는 커스텀 raw 범위 입력을 사용하세요 — 모듈의 카운트 범위만 알면 계산식은 동일합니다.",
  },
  {
    q: "어떤 공식을 쓰나요?",
    a: "단순 선형 보간입니다: 공학값 = engMin + (raw − rawMin) × (engMax − engMin) / (rawMax − rawMin). 역방향은 식을 뒤집고 가장 가까운 정수 카운트로 반올림합니다.",
  },
  {
    q: "raw 값이 설정 범위를 벗어나면 어떻게 되나요?",
    a: "선형 외삽 결과와 함께 경고를 표시합니다. 실제 모듈은 클리핑하거나 오버플로 신호를 내므로, 범위 밖 결과는 대개 raw 범위 설정이 잘못됐다는 뜻입니다.",
  },
  {
    q: "데이터가 업로드되나요?",
    a: "아니요. 모든 스케일링은 브라우저 안에서 실행됩니다.",
  },
];

const C_SNIPPET = `/* PLC raw 카운트 -> 공학 단위 (선형) */
float plc_scale(long raw, long raw_min, long raw_max,
                float eng_min, float eng_max)
{
    return eng_min + (float)(raw - raw_min)
         * (eng_max - eng_min) / (float)(raw_max - raw_min);
}
/* S7: plc_scale(13824, 0, 27648, 0.0f, 100.0f) -> 50.0f */`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "PLC 아날로그 스케일링 계산기",
          description: metadata.description!,
          slug: "plc-analog-scaling",
          faqs: FAQS,
          locale: "ko",
        })}
      />
      <ToolShell slug="plc-analog-scaling" locale="ko">
        <PlcScalingTool />
        <AdSlot id="ko-plc-analog-scaling-results" />

        <AnswerBox>
          이 툴은 PLC 아날로그 raw 카운트를 공학 단위로, 공학 단위를 raw
          카운트로 양방향 변환합니다. 검증된 Siemens S7 프리셋(0…27648)을
          선택하거나 커스텀 raw 범위를 입력하면, 스팬 백분율과 함께 결과가
          즉시 갱신됩니다.
        </AnswerBox>

        <Section title="동작 원리">
          <p>
            아날로그 입력 모듈은 전기 신호를 정수 raw 범위로 디지털화하고,
            프로그램에서 직선식{" "}
            <code>공학값 = engMin + (raw − rawMin) × 스팬 ÷ raw스팬</code>으로
            물리 단위에 매핑합니다. 식이 대칭이므로 목표 공학값에 대응하는 raw
            카운트도 같은 툴로 구할 수 있어, 강제값 테스트나 트랜스미터 대조
            점검에 그대로 쓸 수 있습니다.
          </p>
          <p>
            벤더 프리셋은 보수적으로 운영합니다: 매뉴얼 출처가 스펙 게이트에
            기재된 범위만 탑재하며, 현재는 Siemens S7(0…27648)뿐입니다. 다른
            벤더는 커스텀 범위로 동일하게 계산하세요.
          </p>
        </Section>

        <Section title="계산 예제">
          <DataWell>
            프리셋: Siemens S7 (0…27648) · 공학 범위 0…100
            <br />
            raw 13824 → <span className="text-ok">50.0</span> (27648의 정확히 절반)
            <br />
            raw 27648 → 100 · raw 0 → 0
          </DataWell>
        </Section>

        <AdSlot id="ko-plc-analog-scaling-content" />

        <Section title="파라미터">
          <ParamsTable
            rows={[
              { name: "Siemens S7", value: "0 … 27648", note: "검증 완료 프리셋" },
              { name: "Allen-Bradley", value: "—", note: "매뉴얼 검증 대기" },
              { name: "Mitsubishi", value: "—", note: "매뉴얼 검증 대기" },
              { name: "LS ELECTRIC", value: "—", note: "매뉴얼 검증 대기" },
              { name: "커스텀", value: "임의 raw 범위", note: "동일한 선형 공식" },
            ]}
          />
        </Section>

        <Section title="C 구현">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools locale="ko" slugs={["4-20ma-scaling", "adc-calculator", "bcd-converter"]} />
      </ToolShell>
    </>
  );
}
