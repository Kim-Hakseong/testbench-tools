import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import links from "@/content/links.json";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return links.apps.map((app) => ({ slug: app.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const app = links.apps.find((a) => a.slug === params.slug);
  if (!app) return {};
  return {
    title: `${app.name} — free desktop app`,
    description: app.description,
  };
}

// Static feature lists — factual scope statements, not marketing claims.
const DETAILS: Record<string, { tagline: string; features: string[]; webCounterpart?: { href: string; label: string } }> = {
  "tdms-converter": {
    tagline: "Batch-convert NI TDMS measurement files to CSV on your desktop.",
    features: [
      "Convert many TDMS files in one run (folder batch)",
      "Handles files larger than browser memory allows",
      "Channel selection and CSV column layout options",
      "Runs fully offline — measurement data never leaves the machine",
    ],
    webCounterpart: { href: "/tools/tdms-to-csv/", label: "TDMS to CSV web tool" },
  },
  frameterm: {
    tagline: "A serial terminal built for frame-level protocol work.",
    features: [
      "Hex-first send/receive view for binary protocols",
      "Frame delimiting and timestamping",
      "CRC checking on received frames",
      "Runs fully offline on your bench PC",
    ],
    webCounterpart: { href: "/tools/modbus-frame-decoder/", label: "Modbus Frame Decoder web tool" },
  },
};

export default function AppPage({ params }: Props) {
  const app = links.apps.find((a) => a.slug === params.slug);
  if (!app) notFound();
  const detail = DETAILS[app.slug];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-mute">
        <Link href="/apps/" className="transition-colors hover:text-body">
          Desktop Apps
        </Link>
        <span className="mx-1.5">/</span>
        <span>{app.name}</span>
      </nav>

      <h1 className="mt-4 text-4xl sm:text-5xl">{app.name}</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-mute">{detail?.tagline ?? app.description}</p>

      <div className="mt-6">
        {app.url === "" ? (
          <span className="inline-block rounded-btn border border-line-strong px-4 py-2 font-mono text-sm text-mute">
            Coming soon — {app.platforms.join(", ")}
          </span>
        ) : (
          <a
            href={app.url}
            className="inline-block rounded-btn bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
          >
            Download for {app.platforms.join(", ")} — free
          </a>
        )}
      </div>

      {detail && (
        <section className="mt-10">
          <h2 className="tb-display text-2xl">
            {app.url === "" ? "Planned scope" : "What it does"}
          </h2>
          <ul className="mt-3 max-w-2xl space-y-2 text-[15px] text-body">
            {detail.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-ok">—</span>
                {f}
              </li>
            ))}
          </ul>
          {detail.webCounterpart && (
            <p className="mt-6 text-sm text-mute">
              Need it right now, in the browser?{" "}
              <Link
                href={detail.webCounterpart.href}
                className="text-body underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
              >
                {detail.webCounterpart.label} →
              </Link>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
