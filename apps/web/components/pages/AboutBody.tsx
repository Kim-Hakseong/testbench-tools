import Link from "next/link";
import { ABOUT, LOCALE_PREFIX, type SiteLocale } from "@/content/i18n";

export function AboutBody({ locale }: { locale: SiteLocale }) {
  const t = ABOUT[locale];
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">{t.h1}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-body">
        <p>{t.intro}</p>
        <p>{t.principlesLead}</p>
        <ul className="space-y-2 pl-5">
          {t.principles.map((p) => (
            <li key={p.title} className="list-disc">
              <strong className="text-ink">{p.title}</strong> {p.body}
            </li>
          ))}
        </ul>
        <p>{t.free}</p>
        <p>
          {t.contactBefore}
          <Link
            href={`${LOCALE_PREFIX[locale]}contact/`}
            className="text-body underline decoration-line-strong underline-offset-4 hover:text-ink"
          >
            {t.contactLink}
          </Link>
          {t.contactAfter}
        </p>
      </div>

      {/* These tools describe other companies' formats and protocols by name,
          which is what makes them findable — so say plainly whose marks they
          are and that this site is not connected to them. */}
      <p className="mt-10 border-t border-line-soft pt-6 text-xs leading-relaxed text-mute">
        {t.trademarks}
      </p>
    </div>
  );
}
