import Link from "next/link";
import "../design/tokens.css";
import "../app/globals.css";
import ads from "@/content/ads.json";
import analytics from "@/content/analytics.json";
import site from "@/content/site.json";
import { HTML_LANG, type SiteLocale } from "@/content/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FooterNav, HeaderNav, HomeLink } from "@/components/ChromeNav";
import { GitHubIcon } from "@/components/GitHubIcon";
import { JsonLd, siteJsonLd } from "@/lib/jsonld";

const REPO_URL = "https://github.com/Kim-Hakseong/testbench-tools";

// Applies the theme before first paint (FOUC guard): localStorage first,
// then prefers-color-scheme. Must stay inline and synchronous.
const themeInit = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

// Locale routing on the root path only, and only for a visitor who has
// already chosen a language — localStorage "lang", set by the switcher.
//
// It used to fall back to navigator.language, which meant a first-time visit
// from a Korean browser bounced / to /ko/. A crawler is a first-time visit
// every time, so Search Console reported the site's most important URL as
// "Page with redirect". Guessing at a stranger's language was never worth
// that; the switcher is in the header and hreflang tells search engines
// which translations exist.
const langInit = `(function(){try{var p=location.pathname;if(p!=="/"&&p!=="/index.html")return;var m={ko:"/ko/",ja:"/ja/",de:"/de/",zh:"/zh/"};var s=localStorage.getItem("lang");if(s&&s!=="en"&&m[s])location.replace(m[s]);}catch(e){}})();`;

/** Shared document shell — each locale's root layout wraps pages with this. */
export function RootShell({ lang, children }: { lang: SiteLocale; children: React.ReactNode }) {
  const loadEthical = ads.provider === "ethicalads" && ads.ethicalads.publisher !== "";
  const loadAdsense = ads.provider === "adsense" && ads.adsense.client !== "";
  // Page-view counting only, and only once a token exists. Cloudflare Web
  // Analytics sets no cookies and builds no cross-site profile, so it needs no
  // consent dialog — the same reason EthicalAds is preferred over AdSense.
  const loadAnalytics =
    analytics.provider === "cloudflare" && analytics.cloudflare.token !== "";

  return (
    <html lang={HTML_LANG[lang]} suppressHydrationWarning>
      <head>
        <JsonLd data={siteJsonLd()} />
        {/* Ownership tokens for the search consoles. Empty means no tag —
            nothing is emitted until someone pastes one in content/site.json. */}
        {site.verification.google !== "" && (
          <meta name="google-site-verification" content={site.verification.google} />
        )}
        {site.verification.bing !== "" && (
          <meta name="msvalidate.01" content={site.verification.bing} />
        )}
        {site.verification.naver !== "" && (
          <meta name="naver-site-verification" content={site.verification.naver} />
        )}

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
        {loadAnalytics && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: analytics.cloudflare.token })}
          />
        )}
      </head>
      <body>
        <header className="border-b border-line-soft">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <HomeLink routeLang={lang} />
            <div className="flex items-center gap-3">
              <HeaderNav routeLang={lang} />
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener"
                title="TestBench.tools on GitHub"
                className="inline-flex items-center gap-1.5 rounded-btn border border-line-strong bg-surface px-2 py-1 font-mono text-xs text-body transition-colors hover:border-mute"
              >
                <GitHubIcon className="h-4 w-4" />
                GitHub
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-20 border-t border-line-soft">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} TestBench.tools</p>
            <FooterNav routeLang={lang} />
          </div>
        </footer>
      </body>
    </html>
  );
}
