"use client";

import { useCallback } from "react";
import { toolText } from "@/content/tool-i18n";
import { useActiveLang } from "@/components/useActiveLang";

/**
 * Translator for strings inside a tool widget.
 *
 * Call it with the English text as the key — `t("Direction")` — so a component
 * that has not been converted yet, or a string with no translation, renders
 * exactly what it renders today. Tools live on English routes, so the language
 * comes from the visitor's stored choice via the same rule the chrome uses.
 */
export function useToolText(): (english: string) => string {
  const lang = useActiveLang("en");
  return useCallback((english: string) => toolText(lang, english), [lang]);
}
