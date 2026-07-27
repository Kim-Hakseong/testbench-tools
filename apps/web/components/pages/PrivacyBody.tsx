import { PRIVACY, type SiteLocale } from "@/content/i18n";

export function PrivacyBody({ locale }: { locale: SiteLocale }) {
  const t = PRIVACY[locale];
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">{t.h1}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-body">
        <p className="font-mono text-xs text-mute">{t.updated}</p>
        {t.sections.map((s) => (
          <div key={s.heading}>
            <h2 className="tb-display pt-2 text-2xl">{s.heading}</h2>
            <p className="mt-2">{s.body}</p>
          </div>
        ))}
        <h2 className="tb-display pt-2 text-2xl">{t.contactHeading}</h2>
        <p>
          {t.contactBefore}
          <a
            href="mailto:contact@testbench.tools"
            className="font-mono underline decoration-line-strong underline-offset-4"
          >
            contact@testbench.tools
          </a>
        </p>
      </div>
    </div>
  );
}
