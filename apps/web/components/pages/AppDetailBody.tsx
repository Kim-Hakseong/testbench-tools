import Link from "next/link";
import { notFound } from "next/navigation";
import links from "@/content/links.json";
import { GitHubIcon } from "@/components/GitHubIcon";
import { APP_DETAIL, APPS_PAGE, LOCALE_PREFIX, type SiteLocale } from "@/content/i18n";

// Web-tool counterpart per app (English-only tool pages).
const COUNTERPART: Record<string, string> = {
  "tdms-converter": "/tools/tdms-to-csv/",
  frameterm: "/tools/modbus-frame-decoder/",
};

export function AppDetailBody({ locale, slug }: { locale: SiteLocale; slug: string }) {
  const app = links.apps.find((a) => a.slug === slug);
  if (!app) notFound();
  const t = APP_DETAIL[locale];
  const detail = t.apps[app.slug];
  const prefix = LOCALE_PREFIX[locale];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-mute">
        <Link href={`${prefix}apps/`} className="transition-colors hover:text-body">
          {t.breadcrumb}
        </Link>
        <span className="mx-1.5">/</span>
        <span>{app.name}</span>
      </nav>

      <h1 className="mt-4 text-4xl sm:text-5xl">{app.name}</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-mute">{detail?.tagline ?? app.description}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {app.url === "" ? (
          <span className="inline-block rounded-btn border border-line-strong px-4 py-2 font-mono text-sm text-mute">
            {t.comingSoonPrefix}
            {app.platforms.join(", ")}
          </span>
        ) : (
          <a
            href={app.url}
            className="inline-block rounded-btn bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98]"
          >
            {t.downloadPrefix}
            {app.platforms.join(", ")}
            {t.downloadSuffix}
          </a>
        )}
        {app.repo && (
          <a
            href={app.repo}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-btn border border-line-strong px-4 py-2 text-sm text-body transition-colors hover:border-mute hover:text-ink"
          >
            <GitHubIcon className="h-[18px] w-[18px]" />
            {APPS_PAGE[locale].sourceLabel}
          </a>
        )}
      </div>

      {app.screenshot && (
        <div className="mt-8 overflow-hidden rounded-card border border-line-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={app.screenshot}
            alt={`${app.name} — desktop app screenshot`}
            className="w-full bg-canvas"
            loading="lazy"
          />
        </div>
      )}

      {detail && (
        <section className="mt-10">
          <h2 className="tb-display text-2xl">{app.url === "" ? t.plannedScope : t.whatItDoes}</h2>
          <ul className="mt-3 max-w-2xl space-y-2 text-[15px] text-body">
            {detail.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-ok">—</span>
                {f}
              </li>
            ))}
          </ul>
          {COUNTERPART[app.slug] && (
            <p className="mt-6 text-sm text-mute">
              {t.needNow}
              <Link
                href={COUNTERPART[app.slug]!}
                className="text-body underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
              >
                {detail.counterpartLabel} →
              </Link>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
