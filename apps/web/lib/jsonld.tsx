import type { FaqItem } from "@/components/tool/AeoBlocks";
import { LOCALE_PREFIX, type SiteLocale } from "@/content/i18n";
import type { NoteMeta } from "@/content/notes";

const SITE = "https://testbench.tools";

// Brand-scoped public repositories — used as schema.org sameAs so search and
// AI engines resolve the site and its open source to a single entity. Kept as
// the brand-named repos (not a personal profile) so the asset stays portable.
export const GITHUB_REPOS = [
  "https://github.com/Kim-Hakseong/testbench-tools",
  "https://github.com/Kim-Hakseong/testbench-frameterm",
  "https://github.com/Kim-Hakseong/testbench-modbus-workbench",
  "https://github.com/Kim-Hakseong/testbench-tdms-converter",
];

/** Site-wide Organization node — carries sameAs to the GitHub repositories. */
export function siteJsonLd(): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "TestBench.tools",
      url: SITE,
      logo: `${SITE}/icon.svg`,
      description:
        "Free, 100% client-side micro-tools for test & measurement, embedded and industrial-automation engineers.",
      sameAs: GITHUB_REPOS,
    },
  ];
}

/** SoftwareApplication + FAQPage JSON-LD for a tool page (PRD §4). */
export function toolJsonLd(opts: {
  name: string;
  description: string;
  slug: string;
  faqs: FaqItem[];
  locale?: "en" | "ko";
}): object[] {
  const url =
    opts.locale === "ko" ? `${SITE}/ko/tools/${opts.slug}/` : `${SITE}/tools/${opts.slug}/`;
  // `@id` and `mainEntityOfPage` state, in the structured data itself, which URL
  // this content belongs to. Added 2026-08-24: three tool pages had been assigned
  // a scraper's domain as their Google-selected canonical, so every self-reference
  // the page can carry is worth carrying — the <link rel="canonical"> alone was
  // not enough to keep the original attributed to us.
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": url,
      name: opts.name,
      description: opts.description,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      publisher: { "@type": "Organization", name: "TestBench.tools", url: SITE },
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any (web browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      mainEntity: opts.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
}

/**
 * SoftwareApplication node for a desktop app's detail page.
 *
 * Added 2026-08-31: these pages carried no page-level structured data at all —
 * only the site-wide Organization node — and two of them (ja/zh Modbus
 * Workbench) had been assigned a scraper's domain as their Google-selected
 * canonical, the same way three tool pages were a week earlier. Tool pages
 * already say which URL they belong to; the download pages did not, so they say
 * it now. Every value comes from content/links.json, so nothing here is a claim
 * the download page does not already make.
 */
export function appJsonLd(opts: {
  name: string;
  description: string;
  slug: string;
  locale: SiteLocale;
  platforms: string[];
  version?: string;
  downloadUrl?: string;
  repo?: string;
  sizeMb?: number;
}): object[] {
  const url = `${SITE}${LOCALE_PREFIX[opts.locale]}apps/${opts.slug}/`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": url,
      name: opts.name,
      description: opts.description,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      applicationCategory: "DeveloperApplication",
      operatingSystem: opts.platforms.join(", "),
      ...(opts.version ? { softwareVersion: opts.version.replace(/^v/, "") } : {}),
      ...(opts.downloadUrl ? { downloadUrl: opts.downloadUrl } : {}),
      ...(opts.sizeMb ? { fileSize: `${opts.sizeMb} MB` } : {}),
      ...(opts.repo ? { codeRepository: opts.repo } : {}),
      license: "https://opensource.org/licenses/MIT",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "TestBench.tools", url: SITE },
    },
  ];
}

/**
 * Article node for a field note. `citation` carries the source document, since
 * a note whose whole argument rests on one manual should say which one in the
 * structured data too, not only in the prose.
 */
export function noteJsonLd(note: NoteMeta): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: note.title,
      description: note.description,
      url: `${SITE}/notes/${note.slug}/`,
      datePublished: note.published,
      dateModified: note.published,
      inLanguage: "en",
      citation: note.source,
      author: { "@type": "Organization", name: "TestBench.tools", url: SITE },
      publisher: { "@type": "Organization", name: "TestBench.tools", url: SITE },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/notes/${note.slug}/` },
    },
  ];
}

export function JsonLd({ data }: { data: object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
