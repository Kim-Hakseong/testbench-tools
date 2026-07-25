import type { Metadata } from "next";
import { LOCALE_PREFIX, type SiteLocale } from "@/content/i18n";

const HUB_LANGUAGES = {
  en: "/",
  ko: "/ko/",
  ja: "/ja/",
  de: "/de/",
  "zh-CN": "/zh/",
  "x-default": "/",
};

/** hreflang set for the hub — all five locales + x-default (English). */
export function hubAlternates(locale: SiteLocale): Metadata["alternates"] {
  return {
    canonical: LOCALE_PREFIX[locale],
    languages: HUB_LANGUAGES,
  };
}

/**
 * hreflang alternates for a tool available in en + ko (PRD §4):
 * mutual tags + x-default = English.
 */
export function toolAlternates(slug: string, locale: "en" | "ko"): Metadata["alternates"] {
  const en = `/tools/${slug}/`;
  const ko = `/ko/tools/${slug}/`;
  return {
    canonical: locale === "en" ? en : ko,
    languages: { en, ko, "x-default": en },
  };
}

/** ko-only pages (XGT): a self-referencing ko tag only — no English variant. */
export function koOnlyAlternates(slug: string): Metadata["alternates"] {
  const ko = `/ko/tools/${slug}/`;
  return { canonical: ko, languages: { ko, "x-default": ko } };
}
