import type { Metadata } from "next";
import { HubGrid } from "@/components/HubGrid";
import links from "@/content/links.json";
import { hubAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: hubAlternates("en"),
};

export default function HubPage() {
  return (
    <>
      <HubGrid />

      {/* Desktop Apps highlight strip (category 8) — links injected via links.json */}
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <h2 className="tb-display text-2xl">
          Desktop Apps <span className="text-mute">({links.apps.length})</span>
        </h2>
        <p className="mt-1 text-sm text-mute">
          Free desktop companions for heavier, offline workloads.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {links.apps.map((app) => (
            <div
              key={app.slug}
              className="rounded-card border border-line-soft bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-ink">{app.name}</h3>
                {app.url === "" ? (
                  <span className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
                    Coming soon
                  </span>
                ) : (
                  <a
                    href={app.url}
                    className="rounded-btn border border-line-strong px-3 py-1 text-xs text-ink transition-colors hover:border-mute"
                  >
                    Download
                  </a>
                )}
              </div>
              <p className="mt-1.5 text-[13px] text-mute">{app.description}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
