"use client";

import { usePathname, useRouter } from "next/navigation";
import { TOOLS } from "@/content/tools-meta";
import {
  LOCALE_LABEL,
  LOCALE_PREFIX,
  localizedPath,
  SITE_LOCALES,
  type SiteLocale,
} from "@/content/i18n";

// Tool paths that also exist under /ko/
const KO_PATHS = new Set<string>(
  TOOLS.filter((t) => t.locale !== "en" && t.status === "live").map(
    (t) => `/tools/${t.slug}/`,
  ),
);

/**
 * Language selector. Remembers the choice (localStorage "lang") so the
 * first-visit auto-detect on the root path respects it. Navigates to the
 * same page when it exists in the target locale, otherwise to that
 * locale's hub.
 */
export function LangSwitch({ current }: { current: SiteLocale }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  function onChange(next: SiteLocale) {
    try {
      // "en" is stored explicitly so the root-path auto-detect respects it
      localStorage.setItem("lang", next);
    } catch {
      // storage unavailable — navigation still works
    }
    // strip the current locale prefix to get the base (EN) path
    let base = pathname;
    for (const l of SITE_LOCALES) {
      const prefix = LOCALE_PREFIX[l];
      if (l !== "en" && (base === prefix || base === prefix.slice(0, -1))) {
        base = "/";
        break;
      }
      if (l !== "en" && base.startsWith(prefix)) {
        base = base.slice(prefix.length - 1);
        break;
      }
    }
    if (!base.endsWith("/")) base += "/";
    router.push(localizedPath(next, base, KO_PATHS));
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value as SiteLocale)}
      aria-label="Language"
      className="rounded-btn border border-line-strong bg-surface px-2 py-1 font-mono text-xs text-body outline-none transition-colors hover:border-mute"
    >
      {SITE_LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABEL[l]}
        </option>
      ))}
    </select>
  );
}
