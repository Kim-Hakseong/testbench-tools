import type { Metadata } from "next";
import { AppsBody } from "@/components/pages/AppsBody";
import { APPS_PAGE } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: APPS_PAGE.zh.metaTitle,
  description: APPS_PAGE.zh.metaDesc,
  alternates: sharedAlternates("apps", "zh"),
};

export default function Page() {
  return <AppsBody locale="zh" />;
}
