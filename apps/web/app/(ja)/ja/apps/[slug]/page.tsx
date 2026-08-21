import type { Metadata } from "next";
import { AppDetailBody } from "@/components/pages/AppDetailBody";
import links from "@/content/links.json";
import { APP_DETAIL } from "@/content/i18n";
import { sharedAlternates } from "@/lib/i18n";

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return links.apps.map((app) => ({ slug: app.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const app = links.apps.find((a) => a.slug === params.slug);
  if (!app) return {};
  const d = APP_DETAIL.ja.apps[app.slug];
  return {
    title: app.name,
    description: d?.tagline ?? app.description,
    alternates: sharedAlternates(`apps/${params.slug}`, "ja"),
    openGraph: { images: ["/og/default.png"], url: `/ja/apps/${params.slug}/` },
  };
}

export default function Page({ params }: Props) {
  return <AppDetailBody locale="ja" slug={params.slug} />;
}
