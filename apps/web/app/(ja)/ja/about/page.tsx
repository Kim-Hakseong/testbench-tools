import type { Metadata } from "next";
import { AboutBody } from "@/components/pages/AboutBody";
import { ABOUT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: ABOUT.ja.metaTitle,
  description: ABOUT.ja.metaDesc,
  alternates: sharedAlternates("about", "ja"),
  openGraph: { images: ["/og/about.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <AboutBody locale="ja" />;
}
