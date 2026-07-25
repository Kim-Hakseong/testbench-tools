import Link from "next/link";
import "../design/tokens.css";
import "../app/globals.css";
import ads from "@/content/ads.json";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangSwitch } from "@/components/LangSwitch";

// Applies the theme before first paint (FOUC guard): localStorage first,
// then prefers-color-scheme. Must stay inline and synchronous.
const themeInit = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

const STRINGS = {
  en: {
    badge: "100% in-browser",
    footer: "All calculations run 100% in your browser. No uploads, no accounts.",
    home: "/",
    nav: [
      { href: "/apps/", label: "Desktop Apps" },
      { href: "/about/", label: "About" },
    ],
    legal: [
      { href: "/about/", label: "About" },
      { href: "/contact/", label: "Contact" },
      { href: "/privacy/", label: "Privacy" },
    ],
  },
  ko: {
    badge: "100% 브라우저 내 계산",
    footer: "모든 계산은 브라우저 안에서 실행됩니다. 업로드도, 계정도 없습니다.",
    home: "/ko/",
    nav: [
      { href: "/apps/", label: "Desktop Apps" },
      { href: "/about/", label: "About" },
    ],
    legal: [
      { href: "/about/", label: "About" },
      { href: "/contact/", label: "Contact" },
      { href: "/privacy/", label: "Privacy" },
    ],
  },
} as const;

/** Shared document shell — each locale's root layout wraps pages with this. */
export function RootShell({ lang, children }: { lang: "en" | "ko"; children: React.ReactNode }) {
  const t = STRINGS[lang];
  const loadEthical = ads.provider === "ethicalads" && ads.ethicalads.publisher !== "";
  const loadAdsense = ads.provider === "adsense" && ads.adsense.client !== "";

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
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
            <Link href={t.home} className="tb-display text-xl text-ink">
              TestBench<span className="text-mute">.tools</span>
            </Link>
            <div className="flex items-center gap-3">
              <nav className="hidden items-center gap-4 md:flex" aria-label="Site">
                {t.nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm text-mute transition-colors hover:text-body"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <span className="hidden font-mono text-xs text-mute sm:inline">{t.badge}</span>
              <LangSwitch />
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
              {t.legal.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-body"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
