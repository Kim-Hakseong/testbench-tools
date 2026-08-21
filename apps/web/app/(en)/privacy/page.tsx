import type { Metadata } from "next";
import { PrivacyBody } from "@/components/pages/PrivacyBody";
import { PRIVACY } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: PRIVACY.en.metaTitle,
  description: PRIVACY.en.metaDesc,
  alternates: sharedAlternates("privacy", "en"),
  openGraph: { images: ["/og/default.png"], url: "/privacy/" },
};

export default function Page() {
  return <PrivacyBody locale="en" />;
}
