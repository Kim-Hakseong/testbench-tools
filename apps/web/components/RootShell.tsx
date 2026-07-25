import Link from "next/link";
import "../design/tokens.css";
import "../app/globals.css";
import ads from "@/content/ads.json";
import { CHROME, HTML_LANG, LOCALE_PREFIX, type SiteLocale } from "@/content/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangSwitch } from "@/components/LangSwitch";

// Applies the theme before first paint (FOUC guard): localStorage first,
// then prefers-color-scheme. Must stay inline and synchronous.
const themeInit = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

// First-visit locale routing on the root path only: an explicit choice
// (localStorage "lang", set by the language switcher) wins; otherwise the
// browser language decides. Static hosting has no server, so this runs
// client-side before paint. Crawlers get hreflang tags instead.
const langInit = `(function(){try{var p=location.pathname;if(p!=="/"&&p!=="/index.html")return;var m={ko:"/ko/",ja:"/ja/",de:"/de/",zh:"/zh/"};var s=localStorage.getItem("lang");if(s){if(s!=="en"&&m[s])location.replace(m[s]);return;}var n=(navigator.language||"").toLowerCase().slice(0,2);if(m[n])location.replace(m[n]);}catch(e){}})();`;

/** Shared document shell — each locale's root layout wraps pages with this. */
export function RootShell({ lang, children }: { lang: SiteLocale; children: React.ReactNode }) {
  const t = CHROME[lang];
  const loadEthical = ads.provider === "ethicalads" && ads.ethicalads.publisher !== "";
  const loadAdsense = ads.provider === "adsense" && ads.adsense.client !== "";

  return (
    <html lang={HTML_LANG[lang]} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {lang === "en" && <script dangerouslySetInnerHTML={{ __html: langInit }} />}
        {/* Self-hosted fonts drive the LCP headline — preload all three. */}
        <link rel="preload" href="/fonts/instrument-serif-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/geist-latin-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/geist-mono-latin-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {loadEthical && (
          <script async src="https://media.ethicalads.io/media/client/ethicalads.min.js" />
        )}
        {loadAdsense && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.adsense.client}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        <header className="border-b border-line-soft">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href={LOCALE_PREFIX[lang]} className="tb-display text-xl text-ink">
              TestBench<span className="text-mute">.tools</span>
            </Link>
            <div className="flex items-center gap-3">
              <nav className="hidden items-center gap-4 md:flex" aria-label="Site">
                <Link href="/apps/" className="text-sm text-mute transition-colors hover:text-body">
                  {t.navApps}
                </Link>
                <Link href="/about/" className="text-sm text-mute transition-colors hover:text-body">
                  {t.navAbout}
                </Link>
              </nav>
              <span className="hidden font-mono text-xs text-mute sm:inline">{t.badge}</span>
              <LangSwitch current={lang} />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-20 border-t border-line-soft">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} TestBench.tools</p>
            <p>{t.footer}</p>
            <nav className="flex gap-4" aria-label="Legal">
              <Link href="/about/" className="transition-colors hover:text-body">About</Link>
              <Link href="/contact/" className="transition-colors hover:text-body">Contact</Link>
              <Link href="/privacy/" className="transition-colors hover:text-body">Privacy</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
