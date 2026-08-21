import type { Metadata } from "next";
import { AboutBody } from "@/components/pages/AboutBody";
import { ABOUT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: ABOUT.de.metaTitle,
  description: ABOUT.de.metaDesc,
  alternates: sharedAlternates("about", "de"),
  openGraph: { url: "/de/about/", images: ["/og/about.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <AboutBody locale="de" />;
}
