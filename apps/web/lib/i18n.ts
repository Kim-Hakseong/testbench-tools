import type { Metadata } from "next";

/**
 * hreflang alternates for a tool available in both locales (PRD §4):
 * mutual en/ko tags + x-default = English.
 */
export function toolAlternates(slug: string, locale: "en" | "ko"): Metadata["alternates"] {
  const en = `/tools/${slug}/`;
  const ko = `/ko/tools/${slug}/`;
  return {
    canonical: locale === "en" ? en : ko,
    languages: { en, ko, "x-default": en },
  };
}

export function hubAlternates(locale: "en" | "ko"): Metadata["alternates"] {
  return {
    canonical: locale === "en" ? "/" : "/ko/",
    languages: { en: "/", ko: "/ko/", "x-default": "/" },
  };
}

/** ko-only pages (XGT): a self-referencing ko tag only — no English variant. */
export function koOnlyAlternates(slug: string): Metadata["alternates"] {
  const ko = `/ko/tools/${slug}/`;
  return { canonical: ko, languages: { ko, "x-default": ko } };
}
