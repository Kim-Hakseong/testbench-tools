import type { Metadata } from "next";
import { HubPage } from "@/components/HubPage";
import { hubAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: hubAlternates("en"),
  openGraph: { images: ["/og/default.png"], url: "/" },
};

export default function Page() {
  return <HubPage locale="en" />;
}
