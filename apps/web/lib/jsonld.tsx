import type { FaqItem } from "@/components/tool/AeoBlocks";

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
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: opts.name,
      description: opts.description,
      url,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any (web browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: opts.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
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
