import Link from "next/link";
import links from "@/content/links.json";
import { GitHubIcon } from "@/components/GitHubIcon";
import { APPS_PAGE, APP_DESC, LOCALE_PREFIX, type SiteLocale } from "@/content/i18n";

export function AppsBody({ locale }: { locale: SiteLocale }) {
  const t = APPS_PAGE[locale];
  const prefix = LOCALE_PREFIX[locale];
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">{t.h1}</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-mute">{t.intro}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.apps.map((app) => {
          const detailHref = `${prefix}apps/${app.slug}/`;
          return (
            <div
              key={app.slug}
              className="flex flex-col overflow-hidden rounded-card border border-line-soft bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong"
            >
              {app.screenshot && (
                <Link href={detailHref} aria-label={app.name} className="block border-b border-line-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={app.screenshot}
                    alt={`${app.name} — desktop app screenshot`}
                    className="aspect-[16/10] w-full bg-canvas object-cover object-top"
                    loading="lazy"
                  />
                </Link>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={detailHref} className="tb-display text-2xl transition-colors hover:text-ink">
                    {app.name}
                  </Link>
                  {app.url === "" && (
                    <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
                      {t.comingSoon}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-mute">{APP_DESC[locale][app.slug] ?? app.description}</p>
                <p className="mt-3 font-mono text-xs text-mute">
                  {app.platforms.join(" · ")} {t.freeSuffix}
                  {app.version && ` · ${app.version} · ${app.sizeMb} MB`}
                </p>

                {app.sha256 && (
                  <details className="mt-3 rounded-btn border border-line-soft px-3 py-2">
                    <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wide text-mute">
                      SHA-256
                    </summary>
                    <p className="mt-2 break-all font-mono text-[11px] leading-5 text-body">
                      {app.sha256}
                    </p>
                  </details>
                )}

                {(app.url || app.repo) && (
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    {app.url && (
                      <a
                        href={app.url}
                        className="inline-flex items-center rounded-btn bg-ink px-3.5 py-1.5 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98]"
                      >
                        {t.download}
                      </a>
                    )}
                    {app.repo && (
                      <a
                        href={app.repo}
                        target="_blank"
                        rel="noopener"
                        aria-label={`${app.name} — ${t.sourceLabel}`}
                        title={t.sourceLabel}
                        className="inline-flex items-center justify-center rounded-btn border border-line-strong p-2 text-mute transition-colors hover:border-mute hover:text-body"
                      >
                        <GitHubIcon className="h-[18px] w-[18px]" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unsigned binaries stop most people at the SmartScreen dialog. Saying
          why it appears, and giving a checksum to check instead, is the only
          honest substitute for a signing certificate. */}
      <section className="mt-12 grid gap-6 border-t border-line-soft pt-8 md:grid-cols-2">
        <div>
          <h2 className="text-lg text-ink">{t.verifyHeading}</h2>
          <p className="mt-2 text-sm leading-6 text-mute">{t.verifyBefore}</p>
          <pre className="mt-3 overflow-x-auto rounded-btn border border-line-soft bg-elevated p-3 font-mono text-xs text-body">
            {"Get-FileHash .\\ModbusWorkbench-v1.7.0-win-x64.exe -Algorithm SHA256"}
          </pre>
        </div>
        <div>
          <h2 className="text-lg text-ink">{t.smartScreenTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-mute">{t.smartScreenBody}</p>
        </div>
      </section>

      <p className="mt-10 text-sm text-mute">{t.footerNote}</p>
    </div>
  );
}
