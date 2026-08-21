import type { Metadata } from "next";
import { ContactBody } from "@/components/pages/ContactBody";
import { CONTACT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: CONTACT.en.metaTitle,
  description: CONTACT.en.metaDesc,
  alternates: sharedAlternates("contact", "en"),
  openGraph: { images: ["/og/default.png"], url: "/contact/" },
};

export default function Page() {
  return <ContactBody locale="en" />;
}
