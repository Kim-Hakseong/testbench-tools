import type { Metadata } from "next";
import { AppsBody } from "@/components/pages/AppsBody";
import { APPS_PAGE } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: APPS_PAGE.de.metaTitle,
  description: APPS_PAGE.de.metaDesc,
  alternates: sharedAlternates("apps", "de"),
  openGraph: { url: "/de/apps/", images: ["/og/apps.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <AppsBody locale="de" />;
}
