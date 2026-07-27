import type { Metadata } from "next";
import { AppsBody } from "@/components/pages/AppsBody";
import { APPS_PAGE } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: APPS_PAGE.de.metaTitle,
  description: APPS_PAGE.de.metaDesc,
  alternates: sharedAlternates("apps", "de"),
};

export default function Page() {
  return <AppsBody locale="de" />;
}
