import type { Metadata } from "next";
import { PrivacyBody } from "@/components/pages/PrivacyBody";
import { PRIVACY } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: PRIVACY.de.metaTitle,
  description: PRIVACY.de.metaDesc,
  alternates: sharedAlternates("privacy", "de"),
};

export default function Page() {
  return <PrivacyBody locale="de" />;
}
