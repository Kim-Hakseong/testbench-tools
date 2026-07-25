import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://testbench.tools"),
  title: {
    default: "TestBench.tools — 엔지니어용 무료 계산·변환 툴",
    template: "%s · TestBench.tools",
  },
  description:
    "계측·임베디드·산업자동화 엔지니어를 위한 무료 브라우저 툴. PLC 스케일링, 4-20mA, PT100, BCD, ADC 계산기 — 100% 클라이언트 사이드.",
};

export default function KoLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="ko">{children}</RootShell>;
}
