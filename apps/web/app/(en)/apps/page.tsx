import type { Metadata } from "next";
import Link from "next/link";
import links from "@/content/links.json";

export const metadata: Metadata = {
  title: "Desktop Apps — free companions for heavier workloads",
  description:
    "Free desktop applications from TestBench.tools: batch TDMS conversion and frame-level serial work, for jobs too heavy for a browser tab.",
};

export default function AppsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Desktop Apps</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-mute">
        The web tools on this site handle everyday conversions instantly. For
        heavier, offline workloads — multi-gigabyte files, batch jobs, live
        serial ports — these free desktop companions take over.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.apps.map((app) => (
          <Link
            key={app.slug}
            href={`/apps/${app.slug}/`}
            className="block rounded-card border border-line-soft bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="tb-display text-2xl">{app.name}</h2>
              {app.url === "" ? (
                <span className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
                  Coming soon
                </span>
              ) : (
                <span className="rounded-full border border-ok px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ok">
                  Download
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-mute">{app.description}</p>
            <p className="mt-3 font-mono text-xs text-mute">
              {app.platforms.join(" · ")} · free
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm text-mute">
        Both apps are free, like everything on this site. Release notifications
        will appear here when downloads open.
      </p>
    </div>
  );
}
