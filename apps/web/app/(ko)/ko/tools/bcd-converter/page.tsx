import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { AnswerBox, DataWell, Faq, ParamsTable, Section, type FaqItem } from "@/components/tool/AeoBlocks";
import { CodeSnippet } from "@/components/tool/CodeSnippet";
import { BcdTool } from "@/components/tool/BcdTool";
import { RelatedTools, ToolShell } from "@/components/tool/ToolShell";
import { toolAlternates } from "@/lib/i18n";
import { JsonLd, toolJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "BCD 변환기 — 패킹 BCD ↔ 10진수, 니블 검증",
  description:
    "패킹 BCD 워드를 10진수로, 10진수를 BCD로 변환. 니블 단위 검증으로 잘못된 자리 위치를 정확히 표시. 100% 브라우저 내 계산.",
  alternates: toolAlternates("bcd-converter", "ko"),
  openGraph: { url: "/ko/tools/bcd-converter/", images: ["/og/bcd-converter.png"], siteName: "TestBench.tools", title: "BCD 변환기 — 패킹 BCD ↔ 10진수, 니블 검증", description: "패킹 BCD 워드를 10진수로, 10진수를 BCD로 변환. 니블 단위 검증으로 잘못된 자리 위치를 정확히 표시. 100% 브라우저 내 계산.", type: "website" },
};

const FAQS: FaqItem[] = [
  {
    q: "패킹 BCD가 뭔가요?",
    a: "4비트 니블 하나에 10진 숫자 하나(0~9)를 담는 인코딩입니다. 16진 워드 0x1234는 문자 그대로 숫자 1, 2, 3, 4 — 10진수 1234입니다. 구형 PLC 펑션블록, 썸휠 스위치, 7세그먼트 표시 드라이버가 BCD를 사용합니다.",
  },
  {
    q: "0x12A4는 왜 오류인가요?",
    a: "최상위에서 세 번째 니블(위치 2)이 0xA로, 9를 넘어 10진 숫자에 대응하지 않습니다. 이 변환기는 틀린 숫자를 조용히 만들어내는 대신 해당 니블을 정확히 강조 표시합니다.",
  },
  {
    q: "BCD와 일반 16진수는 뭐가 다른가요?",
    a: "BCD에서 0x1234는 10진수 1234지만, 같은 비트를 이진수로 읽으면 4660입니다. BCD 레지스터를 바이너리로(또는 그 반대로) 읽는 것은 PLC 연동의 고전적 버그입니다 — 값이 일정한 패턴으로 계속 틀리면 이것부터 의심하세요.",
  },
  {
    q: "변환 가능한 범위는요?",
    a: "8자리(32비트 워드)까지: 10진수 0~99,999,999. 숫자 한 자리가 4비트이므로 16비트 워드에는 4자리, 32비트 워드에는 8자리가 들어갑니다.",
  },
  {
    q: "데이터가 업로드되나요?",
    a: "아니요. 변환은 브라우저 안에서 실행됩니다.",
  },
];

const C_SNIPPET = `#include <stdint.h>

/* 패킹 BCD 워드 -> 10진수; 잘못된 니블이면 -1 */
long bcd_to_dec(uint32_t bcd, int nibbles)
{
    long value = 0;
    for (int i = nibbles - 1; i >= 0; i--) {
        uint32_t nib = (bcd >> (i * 4)) & 0xF;
        if (nib > 9) return -1;      /* 예: 0x12A4는 여기서 실패 */
        value = value * 10 + (long)nib;
    }
    return value;                    /* 0x1234 -> 1234 */
}`;

export default function Page() {
  return (
    <>
      <JsonLd
        data={toolJsonLd({
          name: "BCD 변환기",
          description: metadata.description!,
          slug: "bcd-converter",
          faqs: FAQS,
          locale: "ko",
        })}
      />
      <ToolShell slug="bcd-converter" locale="ko">
        <BcdTool />
        <AdSlot id="ko-bcd-converter-results" />

        <AnswerBox>
          이 툴은 패킹 BCD 워드를 10진수로, 10진수를 BCD로 변환합니다:{" "}
          <code>0x1234</code> ↔ <code>1234</code>. 모든 니블을 검증해서{" "}
          <code>0x12A4</code>처럼 0xA가 들어간 워드는 잘못된 자리를 강조 표시하며
          거부합니다 — 0xA는 10진 숫자가 아니기 때문입니다.
        </AnswerBox>

        <Section title="동작 원리">
          <p>
            패킹 BCD는 최상위 자리부터 니블 하나에 10진 숫자 하나를 담습니다.
            디코딩은 니블을 왼쪽부터 훑으며 누적값에 10을 곱해 더하고, 9를 넘는
            니블이 나오면 그 위치와 함께 중단합니다. 인코딩은 반대로 10으로
            나누며 숫자를 떼어 4비트씩 채웁니다. 결과적으로 어떤 수의 BCD 표현은
            그 10진 자릿수를 16진수로 읽은 것과 동일합니다 — 바이너리/BCD
            혼동이 그토록 찾기 어려운 이유이기도 합니다.
          </p>
        </Section>

        <Section title="계산 예제">
          <DataWell>
            0x1234 → <span className="text-ok">1234</span>
            <br />
            5678 → <span className="text-ok">0x5678</span>
            <br />
            0x12A4 → <span className="text-err">오류</span> — 니블 2가 0xA (0~9만 허용)
          </DataWell>
        </Section>

        <AdSlot id="ko-bcd-converter-content" />

        <Section title="파라미터">
          <ParamsTable
            rows={[
              { name: "인코딩", value: "패킹 BCD", note: "니블당 10진 숫자 1개" },
              { name: "숫자 범위", value: "니블당 0 – 9", note: "0xA–0xF는 오류" },
              { name: "용량", value: "8자리 / 32비트", note: "0 … 99,999,999" },
              { name: "오류 보고", value: "MSB 기준 니블 인덱스", note: "0부터 시작" },
            ]}
          />
        </Section>

        <Section title="C 구현">
          <CodeSnippet language="C" code={C_SNIPPET} />
        </Section>

        <Faq items={FAQS} />
        <RelatedTools locale="ko" slugs={["plc-analog-scaling", "4-20ma-scaling", "number-base-converter"]} />
      </ToolShell>
    </>
  );
}
