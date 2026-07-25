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
};

export default function DeLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="de">{children}</RootShell>;
}
