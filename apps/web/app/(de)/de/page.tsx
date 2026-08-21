import type { Metadata } from "next";
import { HubPage } from "@/components/HubPage";
import { hubAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Jede Bench-Berechnung, einen Tab entfernt — kostenlose Browser-Tools",
  description:
    "CRC-Rechner, Frame-Decoder, SPS-Skalierung, Sensor-Mathematik und Dateikonverter — kostenlos, sofort, 100 % clientseitig. Ihre Daten verlassen den Browser nicht.",
  alternates: hubAlternates("de"),
  openGraph: { images: ["/og/default.png"], url: "/de/" },
};

export default function Page() {
  return <HubPage locale="de" />;
}
