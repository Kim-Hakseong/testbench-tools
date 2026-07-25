import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, TOOLS } from "@/content/tools-meta";
import { CategoryIcon } from "@/components/CategoryIcon";
import { hubAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "한국어 툴 — PLC·센서·XGT 계산기",
  description:
    "PLC 아날로그 스케일링, 4-20mA, PT100, BCD, ADC 계산기와 LS XGT Cnet 툴 — 무료, 100% 브라우저 내 계산.",
  alternates: hubAlternates("ko"),
};

export default function KoHubPage() {
  const koTools = TOOLS.filter((t) => t.locale !== "en" && !t.hubHidden);

  return (
    <div>
      <section
        className="border-b border-line-soft"
        style={{ backgroundImage: "var(--tb-glow)" }}
      >
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6">
          <h1 className="text-4xl sm:text-5xl">한국어로 제공되는 엔지니어 툴</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-mute">
            PLC·계측 현장에서 바로 쓰는 계산기 모음입니다. 모든 계산은 브라우저
            안에서 실행되며, 입력한 데이터는 어디에도 전송되지 않습니다.
          </p>
          <p className="mt-6 font-mono text-xs text-mute">
            {koTools.length} tools · 100% in-browser · Free
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="mt-12">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {koTools.map((tool) => {
              const category = CATEGORIES.find((c) => c.id === tool.category)!;
              const name = tool.koName ?? tool.name;
              const description = tool.koDescription ?? tool.description;
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-ink">{name}</h3>
                    {tool.status === "soon" && (
                      <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
                        준비 중
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-mute">{description}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-mute">
                    <CategoryIcon id={tool.category} className="h-4 w-4" />
                    <span className="font-mono text-[10px]">{category.koName}</span>
                  </div>
                </>
              );
              const cls = "block rounded-card border border-line-soft bg-surface p-4 transition-colors";
              return tool.status === "live" ? (
                <Link key={tool.slug} href={`/ko/tools/${tool.slug}/`} className={`${cls} hover:border-line-strong`}>
                  {inner}
                </Link>
              ) : (
                <div key={tool.slug} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        <p className="mt-10 text-sm text-mute">
          영어판에는 CRC·프로토콜 디코더·파일 툴을 포함해 41종의 툴이 있습니다.{" "}
          <Link href="/" className="text-body underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink">
            전체 카탈로그 보기 →
          </Link>
        </p>
      </div>
    </div>
  );
}
