import type { Metadata } from "next";
import { ContactBody } from "@/components/pages/ContactBody";
import { CONTACT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: CONTACT.ko.metaTitle,
  description: CONTACT.ko.metaDesc,
  alternates: sharedAlternates("contact", "ko"),
};

export default function Page() {
  return <ContactBody locale="ko" />;
}
