import { noktraFor, noktraUrl } from "@/content/noktra-links";

/**
 * 관련 NOKTRA 데스크톱 제품 배너 — 매핑이 있는 툴 페이지에만 렌더.
 * 웹툴은 온라인에서, 같은 영역의 본격 작업은 오프라인 데스크톱에서 — 라는 정직한 연결.
 */
export function NoktraBanner({ slug, locale = "en" }: { slug: string; locale?: "en" | "ko" }) {
  const product = noktraFor(slug);
  if (!product) return null;
  const ko = locale === "ko";

  return (
    <aside className="mt-12 rounded-card border border-line-soft bg-well p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
        {ko ? "데스크톱 · 폐쇄망용" : "Desktop · air-gapped"}
      </div>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-body">
        {ko ? (
          <>
            이 영역의 본격 작업용 오프라인 데스크톱 도구:{" "}
            <span className="font-medium text-ink">{product.name}</span> — {product.ko}
          </>
        ) : (
          <>
            For the full workflow, offline:{" "}
            <span className="font-medium text-ink">{product.name}</span> — {product.en}
          </>
        )}
      </p>
      <a
        href={noktraUrl(product, ko ? "ko" : "en")}
        target="_blank"
        rel="noopener"
        className="mt-3 inline-block font-mono text-xs text-body underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
      >
        NOKTRA · {product.name} →
      </a>
    </aside>
  );
}
