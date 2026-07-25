import type { FaqItem } from "@/components/tool/AeoBlocks";

const SITE = "https://testbench.tools";

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
