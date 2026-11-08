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
    title: `${p.name} — ${p.lineKo.replace(/\.$/, "")}`,
    description: `${p.lineKo} 폐쇄망·설치형·오프라인. 대기 명단에 등록하세요.`,
    alternates: noctraAlternates("ko", p.slug),
    openGraph: { url: `/ko/noctra/${p.slug}/`, images: ["/og/default.png"], siteName: "TestBench.tools" },
  };
}

export default function Page({ params }: Props) {
  const p = NOCTRA_WAITLIST.find((x) => x.slug === params.product);
  if (!p) notFound();
  return <NoctraWaitlistPage product={p} locale="ko" />;
}
