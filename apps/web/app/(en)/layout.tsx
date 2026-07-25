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
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>;
}
