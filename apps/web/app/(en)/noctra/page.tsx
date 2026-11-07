import type { Metadata } from "next";
import { NoctraIndex } from "@/components/noctra/NoctraPages";

export const metadata: Metadata = {
  title: "Noctra — offline desktop instruments for air-gapped test benches",
  description: "Noctra makes installable, offline desktop instruments for test benches that cannot touch a network: bus monitoring, large measurement files, PLC code generation.",
  alternates: { canonical: "/noctra/" },
  openGraph: { url: "/noctra/", images: ["/og/default.png"], siteName: "TestBench.tools" },
};

export default function Page() {
  return <NoctraIndex />;
}
