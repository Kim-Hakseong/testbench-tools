import Link from "next/link";
import {
  NOCTRA_PRODUCTS,
  NOCTRA_TRAITS,
  NOCTRA_TRAITS_KO,
  NOCTRA_WAITLIST,
  noctraPath,
  waitlistHref,
  type NoctraLocale,
  type NoctraWaitlist,
} from "@/content/noctra";

const T = {
  en: {
    intro:
      "Desktop instruments for test benches that cannot touch a network. The tools on this site decode one frame or one value in a browser; Noctra does the same work at full size, installed on the machine, offline.",
    preparing: "In preparation",
    join: "Join the waitlist →",
    available: "Available",
    questions: "Questions or a bench to describe:",
    contact: "contact",
    inPrep: (name: string) => `${name} is in preparation.`,
    leave: "Leave your address and you will hear when it is ready — one email, nothing else.",
    joinEmail: "Join the waitlist by email →",
    shot: (name: string) => `${name} screenshot`,
  },
  ko: {
    intro:
      "네트워크에 연결할 수 없는 시험 벤치를 위한 데스크톱 계측 도구입니다. 이 사이트의 툴은 브라우저에서 프레임 하나, 값 하나를 해석합니다. Noctra는 같은 일을 실제 규모로, 장비에 설치해 오프라인으로 합니다.",
    preparing: "준비 중",
    join: "대기 명단 등록 →",
    available: "출시됨",
    questions: "질문이나 설명하고 싶은 벤치가 있다면:",
    contact: "문의",
    inPrep: (name: string) => `${name} — 준비 중입니다.`,
    leave: "주소를 남기면 준비됐을 때 알려 드립니다 — 메일 한 통, 그 외에는 없습니다.",
    joinEmail: "메일로 대기 명단 등록 →",
    shot: (name: string) => `${name} 스크린샷`,
  },
} satisfies Record<NoctraLocale, unknown>;

function Traits({ locale }: { locale: NoctraLocale }) {
  return (
    <ul className="mt-5 flex flex-wrap gap-2" aria-label="Noctra">
      {(locale === "ko" ? NOCTRA_TRAITS_KO : NOCTRA_TRAITS).map((w) => (
        <li key={w} className="rounded-md border border-line-strong px-2.5 py-1 font-mono text-xs uppercase tracking-[0.14em] text-body">{w}</li>
      ))}
    </ul>
  );
}

function Mark() {
  return (
    <div className="flex items-center gap-2 font-serif text-[13px] tracking-[0.12em] text-mute">
      <span aria-hidden="true" className="h-1.5 w-1.5 flex-none" style={{ background: "#31A9BC" }} />
      Noctra
    </div>
  );
}

export function NoctraIndex({ locale = "en" }: { locale?: NoctraLocale }) {
  const t = T[locale];
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Mark />
      <h1 className="mt-3 text-4xl sm:text-5xl">Noctra</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-body">{t.intro}</p>
      <Traits locale={locale} />

      <h2 className="tb-display mt-12 text-2xl">{t.preparing}</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {NOCTRA_WAITLIST.map((p) => (
          <Link key={p.slug} href={noctraPath(locale, p.slug)} className="rounded-card border border-line-soft bg-surface p-4 transition-colors hover:border-line-strong">
            <h3 className="text-sm font-medium text-ink">{p.name}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-mute">{locale === "ko" ? p.lineKo : p.line}</p>
            <span className="mt-3 inline-block font-mono text-[11px] text-body">{t.join}</span>
          </Link>
        ))}
      </div>

      <h2 className="tb-display mt-12 text-2xl">{t.available}</h2>
      <ul className="mt-4 divide-y divide-line-soft rounded-btn border border-line-soft">
        {NOCTRA_PRODUCTS.map((p) => (
          <li key={p.name} className="px-4 py-3">
            <span className="text-sm font-medium text-ink">{p.name}</span>
            <span className="text-sm text-body"> — {locale === "ko" ? p.lineKo : p.line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-mute">
        {t.questions} <Link href={locale === "ko" ? "/ko/contact/" : "/contact/"} className="underline decoration-line-strong underline-offset-4 hover:text-body">{t.contact}</Link>.
      </p>
    </div>
  );
}

export function NoctraWaitlistPage({ product, locale = "en" }: { product: NoctraWaitlist; locale?: NoctraLocale }) {
  const t = T[locale];
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-mute">
        <Link href={noctraPath(locale)} className="transition-colors hover:text-body">Noctra</Link>
        <span className="mx-1.5">/</span>
        <span>{product.slug}</span>
      </nav>
      <h1 className="mt-4 text-4xl sm:text-5xl">{product.name}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-body">{locale === "ko" ? product.lineKo : product.line}</p>
      <Traits locale={locale} />

      {/* Rendered only once a real screenshot is configured in content/noctra.ts. */}
      {product.screenshot && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.screenshot} alt={t.shot(product.name)} className="mt-8 w-full rounded-card border border-line-soft" />
      )}

      <div className="mt-10 rounded-card border border-line-strong bg-surface p-5">
        <p className="text-[15px] text-ink">{t.inPrep(product.name)}</p>
        <p className="mt-1 text-sm text-mute">
          {t.leave} {locale === "ko" ? product.fromHereKo : product.fromHere}
        </p>
        <a href={waitlistHref(product.name)} className="mt-4 inline-block rounded-btn border border-line-strong px-4 py-2 text-sm text-ink transition-colors hover:border-ink">
          {t.joinEmail}
        </a>
      </div>
    </div>
  );
}
