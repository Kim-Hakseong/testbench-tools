import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NoctraWaitlistPage } from "@/components/noctra/NoctraPages";
import { NOCTRA_WAITLIST, noctraAlternates } from "@/content/noctra";

interface Props { params: { product: string } }

export function generateStaticParams() {
  return NOCTRA_WAITLIST.map((p) => ({ product: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const p = NOCTRA_WAITLIST.find((x) => x.slug === params.product);
  if (!p) return {};
  return {
    title: `${p.name} — ${p.line.replace(/\.$/, "")}`,
    description: `${p.line} Air-gapped, installed, offline. Join the waitlist.`,
    alternates: noctraAlternates("en", p.slug),
    openGraph: { url: `/noctra/${p.slug}/`, images: ["/og/default.png"], siteName: "TestBench.tools" },
  };
}

export default function Page({ params }: Props) {
  const p = NOCTRA_WAITLIST.find((x) => x.slug === params.product);
  if (!p) notFound();
  return <NoctraWaitlistPage product={p} />;
}
