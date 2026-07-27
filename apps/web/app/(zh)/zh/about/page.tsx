import type { Metadata } from "next";
import { AboutBody } from "@/components/pages/AboutBody";
import { ABOUT } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: ABOUT.zh.metaTitle,
  description: ABOUT.zh.metaDesc,
  alternates: sharedAlternates("about", "zh"),
};

export default function Page() {
  return <AboutBody locale="zh" />;
}
