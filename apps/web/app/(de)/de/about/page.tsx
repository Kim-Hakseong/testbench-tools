import type { Metadata } from "next";
import { AboutBody } from "@/components/pages/AboutBody";
import { ABOUT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: ABOUT.de.metaTitle,
  description: ABOUT.de.metaDesc,
  alternates: sharedAlternates("about", "de"),
};

export default function Page() {
  return <AboutBody locale="de" />;
}
