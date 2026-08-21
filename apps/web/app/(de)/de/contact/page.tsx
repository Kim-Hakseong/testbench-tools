import type { Metadata } from "next";
import { ContactBody } from "@/components/pages/ContactBody";
import { CONTACT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: CONTACT.de.metaTitle,
  description: CONTACT.de.metaDesc,
  alternates: sharedAlternates("contact", "de"),
  openGraph: { images: ["/og/default.png"], url: "/de/contact/" },
};

export default function Page() {
  return <ContactBody locale="de" />;
}
