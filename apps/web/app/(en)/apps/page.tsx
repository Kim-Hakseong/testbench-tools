import type { Metadata } from "next";
import { AppsBody } from "@/components/pages/AppsBody";
import { APPS_PAGE } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: APPS_PAGE.en.metaTitle,
  description: APPS_PAGE.en.metaDesc,
  alternates: sharedAlternates("apps", "en"),
  openGraph: { images: ["/og/apps.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <AppsBody locale="en" />;
}
