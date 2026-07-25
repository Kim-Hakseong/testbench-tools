import type { Metadata } from "next";
import { HubPage } from "@/components/HubPage";
import { hubAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Bench-Tools für Mess- und Industrietechnik",
  description:
    "CRC-Rechner, Frame-Decoder, SPS-Skalierung, Sensor-Mathematik und Dateikonverter — kostenlos, sofort, 100 % clientseitig. Ihre Daten verlassen den Browser nicht.",
  alternates: hubAlternates("de"),
};

export default function Page() {
  return <HubPage locale="de" />;
}
