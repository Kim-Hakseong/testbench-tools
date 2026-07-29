import type { Metadata } from "next";
import { AboutBody } from "@/components/pages/AboutBody";
import { ABOUT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: ABOUT.ko.metaTitle,
  description: ABOUT.ko.metaDesc,
  alternates: sharedAlternates("about", "ko"),
  openGraph: { images: ["/og/about.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <AboutBody locale="ko" />;
}
