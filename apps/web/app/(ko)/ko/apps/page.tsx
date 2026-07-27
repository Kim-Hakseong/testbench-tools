import type { Metadata } from "next";
import { AppsBody } from "@/components/pages/AppsBody";
import { APPS_PAGE } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: APPS_PAGE.ko.metaTitle,
  description: APPS_PAGE.ko.metaDesc,
  alternates: sharedAlternates("apps", "ko"),
};

export default function Page() {
  return <AppsBody locale="ko" />;
}
