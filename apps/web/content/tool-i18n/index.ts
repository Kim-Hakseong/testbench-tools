// Merges every batch into one lookup. Later batches win on a key clash, which
// only happens when two batches translate the same English phrase — and then
// either answer is right.

import { SITE_LOCALES, type SiteLocale } from "@/content/i18n";
import type { ToolDict } from "./types";
import { SHARED } from "./shared";
import { BATCH_A } from "./batch-a";
import { BATCH_B } from "./batch-b";
import { BATCH_C } from "./batch-c";
import { BATCH_D } from "./batch-d";
import { BATCH_E } from "./batch-e";
import { BATCH_F } from "./batch-f";
import { BATCH_G } from "./batch-g";

const SOURCES = [SHARED, BATCH_A, BATCH_B, BATCH_C, BATCH_D, BATCH_E, BATCH_F, BATCH_G];

const MERGED: Record<SiteLocale, ToolDict> = Object.fromEntries(
  SITE_LOCALES.map((locale) => [
    locale,
    Object.assign({}, ...SOURCES.map((s) => s[locale] ?? {})),
  ]),
) as Record<SiteLocale, ToolDict>;

/** Look a string up for a locale, falling back to the English source text. */
export function toolText(locale: SiteLocale, english: string): string {
  return MERGED[locale]?.[english] ?? english;
}

/** Keys that have a translation in a locale — used by the coverage check. */
export function translatedKeys(locale: SiteLocale): string[] {
  return Object.keys(MERGED[locale] ?? {});
}

/** Every string the dictionary knows about, in English. */
export function sharedVocabulary(): string[] {
  return Object.keys(MERGED.ko);
}
