import { HubGrid } from "@/components/HubGrid";
import links from "@/content/links.json";
import Link from "next/link";
import { APP_DESC, HUB, type SiteLocale } from "@/content/i18n";
import { notesByDate } from "@/content/notes";

/** Full hub page (hero + catalog + desktop apps strip), shared by all locales. */
export function HubPage({ locale }: { locale: SiteLocale }) {
  const t = HUB[locale];
  return (
    <>
      <HubGrid locale={locale} />

      {/* Desktop Apps highlight strip (category 8) — links injected via links.json */}
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <h2 className="tb-display text-2xl">
          {t.appsTitle} <span className="text-mute">({links.apps.length})</span>
        </h2>
        <p className="mt-1 text-sm text-mute">{t.appsSubtitle}</p>
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
                    {t.comingSoon}
                  </span>
                ) : (
                  <a
                    href={app.url}
                    className="rounded-btn border border-line-strong px-3 py-1 text-xs text-ink transition-colors hover:border-mute"
                  >
                    {t.download}
                  </a>
                )}
              </div>
              <p className="mt-1.5 text-[13px] text-mute">
                {APP_DESC[locale][app.slug] ?? app.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Notes are English-only, so they surface on the English hub alone —
          sending a Korean visitor to an English essay from their own hub would
          be a worse experience than not showing it. */}
      {locale === "en" && (
        <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
          <h2 className="tb-display text-2xl">
            Field notes <span className="text-mute">({notesByDate().length})</span>
          </h2>
          <p className="mt-1 text-sm text-mute">
            Where a vendor manual and the obvious reading of it disagree. Every claim cited to
            the document it came from.
          </p>
          <ul className="mt-4 space-y-3">
            {notesByDate().slice(0, 3).map((n) => (
              <li key={n.slug} className="rounded-card border border-line-soft bg-surface p-5">
                <Link href={`/notes/${n.slug}/`} className="text-sm font-medium text-ink hover:text-mute">
                  {n.title}
                </Link>
                <p className="mt-1.5 text-[13px] text-mute">{n.description}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/notes/" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-mute">
              All notes
            </Link>
          </p>
        </section>
      )}
    </>
  );
}
