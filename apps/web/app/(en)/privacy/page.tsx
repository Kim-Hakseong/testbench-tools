import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "TestBench.tools privacy policy: client-side calculations, no accounts, no upload servers.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Privacy</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-body">
        <p className="font-mono text-xs text-mute">Last updated: 2026-07-25</p>

        <h2 className="tb-display pt-2 text-2xl">Your data stays with you</h2>
        <p>
          Every calculator, decoder and file converter on this site runs
          entirely in your browser. Values you type and files you open are
          processed locally by JavaScript and are never transmitted to us or to
          any server. There are no upload endpoints, no accounts and no
          databases behind this site — it is served as static files.
        </p>

        <h2 className="tb-display pt-2 text-2xl">What is stored locally</h2>
        <p>
          One item of localStorage: your dark/light theme preference
          (<code>theme</code>). It stays in your browser and is not readable by
          us. No other client-side storage is used by the site itself.
        </p>

        <h2 className="tb-display pt-2 text-2xl">Analytics</h2>
        <p>We run no analytics and no tracking scripts of our own.</p>

        <h2 className="tb-display pt-2 text-2xl">Advertising</h2>
        <p>
          The site is ad-supported. When advertising is active, we prefer
          EthicalAds, a network that serves contextual ads without cookies,
          tracking or personal-data collection. If Google AdSense units are
          ever enabled, a consent dialog compliant with Google&apos;s
          requirements will be shown first, and Google&apos;s own privacy
          policy applies to those units. Ad scripts are the only third-party
          requests this site makes.
        </p>

        <h2 className="tb-display pt-2 text-2xl">Contact</h2>
        <p>
          Privacy questions:{" "}
          <a href="mailto:contact@testbench.tools" className="font-mono underline decoration-line-strong underline-offset-4">
            contact@testbench.tools
          </a>
        </p>
      </div>
    </div>
  );
}
