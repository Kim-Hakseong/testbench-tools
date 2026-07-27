import type { Metadata } from "next";
import { ContactBody } from "@/components/pages/ContactBody";
import { CONTACT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: CONTACT.zh.metaTitle,
  description: CONTACT.zh.metaDesc,
  alternates: sharedAlternates("contact", "zh"),
};

export default function Page() {
  return <ContactBody locale="zh" />;
}
