import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://testbench.tools"),
  title: {
    default: "TestBench.tools — エンジニア向け無料計算・変換ツール",
    template: "%s · TestBench.tools",
  },
  description:
    "計測・組み込み・産業オートメーションエンジニアのための無料ブラウザツール。CRC、Modbus、PLCスケーリング、PT100、TDMS変換 — 100%クライアントサイド。",
};

export default function JaLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="ja">{children}</RootShell>;
}
