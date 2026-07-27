import Link from "next/link";
import links from "@/content/links.json";
import { APPS_PAGE, APP_DESC, LOCALE_PREFIX, type SiteLocale } from "@/content/i18n";

export function AppsBody({ locale }: { locale: SiteLocale }) {
  const t = APPS_PAGE[locale];
  const prefix = LOCALE_PREFIX[locale];
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">{t.h1}</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-mute">{t.intro}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.apps.map((app) => (
          <Link
            key={app.slug}
            href={`${prefix}apps/${app.slug}/`}
            className="block rounded-card border border-line-soft bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="tb-display text-2xl">{app.name}</h2>
              {app.url === "" ? (
                <span className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
                  {t.comingSoon}
                </span>
              ) : (
                <span className="rounded-full border border-ok px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ok">
                  {t.download}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-mute">{APP_DESC[locale][app.slug] ?? app.description}</p>
            <p className="mt-3 font-mono text-xs text-mute">
              {app.platforms.join(" · ")} {t.freeSuffix}
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm text-mute">{t.footerNote}</p>
    </div>
  );
}
