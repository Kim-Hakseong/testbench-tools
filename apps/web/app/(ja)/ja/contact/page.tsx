import type { Metadata } from "next";
import { ContactBody } from "@/components/pages/ContactBody";
import { CONTACT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: CONTACT.ja.metaTitle,
  description: CONTACT.ja.metaDesc,
  alternates: sharedAlternates("contact", "ja"),
  openGraph: { images: ["/og/default.png"], url: "/ja/contact/" },
};

export default function Page() {
  return <ContactBody locale="ja" />;
}
