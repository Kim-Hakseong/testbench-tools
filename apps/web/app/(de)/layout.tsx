import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://testbench.tools"),
  title: {
    default: "TestBench.tools — Kostenlose Tools für Mess- und Industrietechnik",
    template: "%s · TestBench.tools",
  },
  description:
    "Kostenlose Browser-Tools für Mess-, Embedded- und Automatisierungstechnik. CRC, Modbus, SPS-Skalierung, PT100, TDMS-Konvertierung — 100 % clientseitig.",
  // Shared preview card. Pages that have their own override just `images`;
  // everything else inherits this one, so a bare link never renders bare.
  openGraph: {
    siteName: "TestBench.tools",
    locale: "de_DE",
    type: "website",
    images: [{ url: "/og/default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function DeLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="de">{children}</RootShell>;
}
