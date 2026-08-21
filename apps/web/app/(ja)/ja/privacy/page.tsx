import type { Metadata } from "next";
import { PrivacyBody } from "@/components/pages/PrivacyBody";
import { PRIVACY } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: PRIVACY.ja.metaTitle,
  description: PRIVACY.ja.metaDesc,
  alternates: sharedAlternates("privacy", "ja"),
  openGraph: { images: ["/og/default.png"], url: "/ja/privacy/" },
};

export default function Page() {
  return <PrivacyBody locale="ja" />;
}
