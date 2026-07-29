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
  // Shared preview card. Pages that have their own override just `images`;
  // everything else inherits this one, so a bare link never renders bare.
  openGraph: {
    siteName: "TestBench.tools",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/og/default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function KoLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="ko">{children}</RootShell>;
}
