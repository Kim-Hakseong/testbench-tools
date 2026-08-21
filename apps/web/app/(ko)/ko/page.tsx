import type { Metadata } from "next";
import { HubPage } from "@/components/HubPage";
import { hubAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "엔지니어의 계산, 브라우저에서 바로 — 무료 브라우저 툴",
  description:
    "CRC 계산기, 프레임 디코더, PLC 스케일링, 센서 계산, 파일 변환 — 무료, 즉시, 100% 클라이언트 사이드. 데이터는 브라우저 밖으로 나가지 않습니다.",
  alternates: hubAlternates("ko"),
  openGraph: { images: ["/og/default.png"], url: "/ko/" },
};

export default function Page() {
  return <HubPage locale="ko" />;
}
