"use client";

import Link from "next/link";
import { ABOUT, CHROME, CONTACT, LOCALE_PREFIX, PRIVACY, type SiteLocale } from "@/content/i18n";
import { LangSwitch } from "@/components/LangSwitch";
import { useActiveLang } from "@/components/useActiveLang";
import { MCP_PAGE } from "@/content/mcp-i18n";

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
      {/* Desktop Apps leads to downloadable products, so it carries an icon and
          full-strength ink. About stays quiet, and the badge is a statement
          rather than a destination — it reads as one only when it looks like
          the links beside it. */}
      <nav className="hidden items-center gap-4 md:flex" aria-label="Site">
        {/* 자매 브랜드 칩 — 보더+브랜드 도트로 '눌리는 링크'임을 드러낸다. 외부 사이트 대신
            사이트 안의 /noctra/ 로 간다(RUN-TB1 §6). */}
        <Link
          href={lang === "ko" ? "/ko/noctra/" : "/noctra/"}
          aria-label="Noctra — verification instruments for air-gapped environments"
          title={lang === "ko" ? "Noctra — 폐쇄망용 오프라인 데스크톱 검증 도구" : "Noctra — offline desktop instruments for air-gapped benches"}
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 font-serif text-[13px] tracking-[0.12em] text-body transition-colors hover:border-ink hover:text-ink"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 flex-none" style={{ background: "#31A9BC" }} />
          Noctra
        </Link>
        <Link href={`${p}mcp/`} className="text-sm font-medium text-ink transition-colors hover:text-mute">
          {MCP_PAGE[lang].nav}
        </Link>
        <Link
          href={`${p}apps/`}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-mute"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <rect x="3" y="4" width="18" height="12" rx="1.5" />
            <path d="M8 20h8M12 16v4" />
          </svg>
          {t.navApps}
        </Link>
        {routeLang === "en" && (
          <Link href="/notes/" className="text-sm text-mute transition-colors hover:text-body">
            Notes
          </Link>
        )}
        <Link href={`${p}about/`} className="text-sm text-mute transition-colors hover:text-body">
          {t.navAbout}
        </Link>
      </nav>
      <span className="hidden font-mono text-[11px] text-mute/70 sm:inline" aria-hidden="true">
        {t.badge}
      </span>
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
      <nav className="flex gap-4" aria-label="Footer">
        {routeLang === "en" && (
          <Link href="/notes/" className="transition-colors hover:text-body">
            Notes
          </Link>
        )}
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
