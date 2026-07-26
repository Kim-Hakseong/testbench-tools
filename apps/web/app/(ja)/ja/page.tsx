import type { Metadata } from "next";
import { HubPage } from "@/components/HubPage";
import { hubAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "ベンチの計算は、このタブひとつで — 無料ツール41種",
  description:
    "CRC計算、フレームデコード、PLCスケーリング、センサー計算、ファイル変換 — 無料・即時・100%クライアントサイド。データはブラウザの外に出ません。",
  alternates: hubAlternates("ja"),
};

export default function Page() {
  return <HubPage locale="ja" />;
}
