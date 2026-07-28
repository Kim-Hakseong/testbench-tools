"use client";

import Link from "next/link";
import { ABOUT, CHROME, CONTACT, LOCALE_PREFIX, PRIVACY, type SiteLocale } from "@/content/i18n";
import { LangSwitch } from "@/components/LangSwitch";
import { useActiveLang } from "@/components/useActiveLang";

/**
 * Header nav, badge and language selector. Client-side so that an English-only
 * tool page still speaks the visitor's language and keeps its links pointing
 * back into that locale instead of stranding them in English.
 */
export function HeaderNav({ routeLang }: { routeLang: SiteLocale }) {
  const lang = useActiveLang(routeLang);
  const t = CHROME[lang];
  const p = LOCALE_PREFIX[lang];

  return (
    <>
      <nav className="hidden items-center gap-4 md:flex" aria-label="Site">
        <Link href={`${p}apps/`} className="text-sm text-mute transition-colors hover:text-body">
          {t.navApps}
        </Link>
        <Link href={`${p}about/`} className="text-sm text-mute transition-colors hover:text-body">
          {t.navAbout}
        </Link>
      </nav>
      <span className="hidden font-mono text-xs text-mute sm:inline">{t.badge}</span>
      <LangSwitch current={lang} />
    </>
  );
}

/** Home link — returns to the visitor's own hub, not always the English one. */
export function HomeLink({ routeLang }: { routeLang: SiteLocale }) {
  const lang = useActiveLang(routeLang);
  return (
    <Link href={LOCALE_PREFIX[lang]} className="tb-display text-xl text-ink">
      TestBench<span className="text-mute">.tools</span>
    </Link>
  );
}

/** Footer note and legal links, in the visitor's language. */
export function FooterNav({ routeLang }: { routeLang: SiteLocale }) {
  const lang = useActiveLang(routeLang);
  const p = LOCALE_PREFIX[lang];

  return (
    <>
      <p>{CHROME[lang].footer}</p>
      <nav className="flex gap-4" aria-label="Legal">
        <Link href={`${p}about/`} className="transition-colors hover:text-body">
          {ABOUT[lang].metaTitle}
        </Link>
        <Link href={`${p}contact/`} className="transition-colors hover:text-body">
          {CONTACT[lang].metaTitle}
        </Link>
        <Link href={`${p}privacy/`} className="transition-colors hover:text-body">
          {PRIVACY[lang].metaTitle}
        </Link>
      </nav>
    </>
  );
}
