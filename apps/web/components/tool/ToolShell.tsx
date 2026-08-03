import Link from "next/link";
import { CATEGORIES, TOOLS } from "@/content/tools-meta";
import { CATEGORY_ACCENT, CATEGORY_GLOW } from "@/lib/category-style";
import { NoktraBanner } from "./NoktraBanner";

type ShellLocale = "en" | "ko";

/**
 * Common tool-page frame (DESIGN §6 anatomy):
 * breadcrumb → serif H1 + one-line description → children
 * (tool panel, ad slots, AEO sections, FAQ, related tools).
 */
export function ToolShell({
  slug,
  locale = "en",
  children,
}: {
  slug: string;
  locale?: ShellLocale;
  children: React.ReactNode;
}) {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
  const category = CATEGORIES.find((c) => c.id === tool.category)!;
  const ko = locale === "ko";
  const name = ko ? tool.koName ?? tool.name : tool.name;
  const description = ko ? tool.koDescription ?? tool.description : tool.description;

  return (
    <article
      className="border-b border-line-soft"
      style={{ backgroundImage: CATEGORY_GLOW[tool.category] }}
    >
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="font-mono text-xs text-mute">
          <Link href={ko ? "/ko/" : "/"} className="transition-colors hover:text-body">
            {ko ? "툴" : "Tools"}
          </Link>
          <span className="mx-1.5">/</span>
          <span style={{ color: CATEGORY_ACCENT[tool.category] }}>
            {ko ? category.koName : category.name}
          </span>
        </nav>
        <h1 className="mt-4 text-4xl sm:text-5xl">{name}</h1>
        <p className="mt-3 max-w-2xl text-[15px] text-mute">{description}</p>
        <div className="mt-8">{children}</div>
        <NoktraBanner slug={slug} locale={locale} />
      </div>
    </article>
  );
}

/** 3 related-tool cards; unbuilt tools render as non-link "Soon" cards. */
export function RelatedTools({ slugs, locale = "en" }: { slugs: string[]; locale?: ShellLocale }) {
  const ko = locale === "ko";
  const tools = slugs
    .map((s) => TOOLS.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <section className="mt-12">
      <h2 className="tb-display text-2xl">{ko ? "관련 툴" : "Related tools"}</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tools.map((tool) => {
          // On ko pages, link into /ko/ when the tool has a Korean page; else EN page.
          const hasKo = tool.locale !== "en" && tool.status === "live";
          const href =
            ko && hasKo
              ? `/ko/tools/${tool.slug}/`
              : tool.locale === "ko"
                ? `/ko/tools/${tool.slug}/`
                : `/tools/${tool.slug}/`;
          const name = ko ? tool.koName ?? tool.name : tool.name;
          const description = ko ? tool.koDescription ?? tool.description : tool.description;
          const soonLabel = ko ? "준비 중" : "Soon";
          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-ink">{name}</h3>
                {tool.status === "soon" && (
                  <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
                    {soonLabel}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-mute">{description}</p>
            </>
          );
          const cls = "block rounded-card border border-line-soft bg-surface p-4 transition-all duration-200";
          return tool.status === "live" ? (
            <Link key={tool.slug} href={href} className={`${cls} hover:-translate-y-0.5 hover:border-line-strong`}>
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
  );
}
