import { CONTACT, type SiteLocale } from "@/content/i18n";

export function ContactBody({ locale }: { locale: SiteLocale }) {
  const t = CONTACT[locale];
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">{t.h1}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-body">
        <p>{t.lead}</p>
        <p className="font-mono text-lg text-ink">
          <a
            href="mailto:contact@testbench.tools"
            className="underline decoration-line-strong underline-offset-4 hover:opacity-90"
          >
            contact@testbench.tools
          </a>
        </p>
        <p>{t.priority}</p>
      </div>
    </div>
  );
}
