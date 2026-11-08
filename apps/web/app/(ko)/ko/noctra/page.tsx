import type { Metadata } from "next";
import { NoctraIndex } from "@/components/noctra/NoctraPages";
import { noctraAlternates } from "@/content/noctra";

export const metadata: Metadata = {
  title: "Noctra — 폐쇄망 시험 벤치를 위한 오프라인 데스크톱 계측 도구",
  description: "Noctra는 네트워크에 연결할 수 없는 시험 벤치를 위한 설치형 오프라인 데스크톱 계측 도구를 만듭니다: 버스 모니터링, 대용량 측정 파일, PLC 코드 생성.",
  alternates: noctraAlternates("ko"),
  openGraph: { url: "/ko/noctra/", images: ["/og/default.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <NoctraIndex locale="ko" />;
}
