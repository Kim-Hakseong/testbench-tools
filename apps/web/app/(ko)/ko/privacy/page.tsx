import type { Metadata } from "next";
import { PrivacyBody } from "@/components/pages/PrivacyBody";
import { PRIVACY } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: PRIVACY.ko.metaTitle,
  description: PRIVACY.ko.metaDesc,
  alternates: sharedAlternates("privacy", "ko"),
  openGraph: { images: ["/og/default.png"], url: "/ko/privacy/" },
};

export default function Page() {
  return <PrivacyBody locale="ko" />;
}
