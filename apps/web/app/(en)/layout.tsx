import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://testbench.tools"),
  title: {
    default: "TestBench.tools — Free tools for T&M and industrial engineers",
    template: "%s · TestBench.tools",
  },
  description:
    "Free browser-based calculators, decoders and converters for test & measurement, embedded and industrial automation engineers. 100% client-side — your data never leaves your browser.",
  // Shared preview card. Pages that have their own override just `images`;
  // everything else inherits this one, so a bare link never renders bare.
  openGraph: {
    siteName: "TestBench.tools",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og/default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>;
}
