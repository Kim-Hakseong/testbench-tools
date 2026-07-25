"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOOLS } from "@/content/tools-meta";

// Paths that exist in both locales: hub + live tools with locale "both".
const PAIRED_PATHS = new Set<string>([
  "/",
  ...TOOLS.filter((t) => t.locale === "both" && t.status === "live").map(
    (t) => `/tools/${t.slug}/`,
  ),
]);

/** EN ↔ KO toggle, shown only on pages that exist in the other locale. */
export function LangSwitch() {
  const pathname = usePathname() ?? "/";
  const isKo = pathname === "/ko" || pathname.startsWith("/ko/");
  const basePath = isKo ? pathname.replace(/^\/ko\/?/, "/") : pathname;
  const normalized = basePath.endsWith("/") ? basePath : basePath + "/";
  if (!PAIRED_PATHS.has(normalized)) return null;

  const href = isKo ? normalized : normalized === "/" ? "/ko/" : `/ko${normalized}`;
  return (
    <Link
      href={href}
      hrefLang={isKo ? "en" : "ko"}
      className="rounded-btn border border-line-strong px-2.5 py-1 font-mono text-xs text-body transition-colors hover:border-mute"
    >
      {isKo ? "EN" : "KO"}
    </Link>
  );
}
