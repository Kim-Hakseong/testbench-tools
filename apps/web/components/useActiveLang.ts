"use client";

import { useEffect, useState } from "react";
import { chromeLang, type SiteLocale } from "@/content/i18n";

/**
 * The language the chrome should speak.
 *
 * Localized routes (/ko/, /ja/ …) always win: their body really is in that
 * language, so the header must match. English routes are different — most tool
 * pages exist only in English, so a Korean visitor gets dropped onto one and
 * would otherwise lose their language along with every nav link. There, and
 * only there, the stored choice takes over.
 */
export function useActiveLang(routeLang: SiteLocale): SiteLocale {
  const [lang, setLang] = useState<SiteLocale>(routeLang);

  useEffect(() => {
    try {
      setLang(chromeLang(routeLang, localStorage.getItem("lang")));
    } catch {
      // storage unavailable — the route's own language is a fine fallback
    }
  }, [routeLang]);

  return lang;
}
