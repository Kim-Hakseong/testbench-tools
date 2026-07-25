"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PUBLIC_TOOL_COUNT, CATEGORIES, TOOLS, type ToolMeta } from "@/content/tools-meta";
import { CARD_DESC, CATEGORY_NAMES, HUB, type SiteLocale } from "@/content/i18n";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_ACCENT, CATEGORY_WASH } from "@/lib/category-style";

const POPULAR_TAGS = ["crc", "modbus", "tdms", "plc", "float"];

function cardDesc(tool: ToolMeta, locale: SiteLocale): string {
  if (locale === "ko" && tool.koDescription) return tool.koDescription;
  return CARD_DESC[locale]?.[tool.slug] ?? tool.description;
}

function matches(tool: ToolMeta, locale: SiteLocale, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    tool.name.toLowerCase().includes(needle) ||
    tool.description.toLowerCase().includes(needle) ||
    cardDesc(tool, locale).toLowerCase().includes(needle) ||
    tool.tags.some((t) => t.includes(needle))
  );
}

function ToolCard({ tool, locale }: { tool: ToolMeta; locale: SiteLocale }) {
  const t = HUB[locale];
  const hasKoPage = tool.locale !== "en" && tool.status === "live";
  // Non-EN locales link into /ko/ when a Korean page exists (ko locale only);
  // everything else goes to the English tool page, marked with an EN chip.
  const href =
    locale === "ko" && hasKoPage
      ? `/ko/tools/${tool.slug}/`
      : tool.locale === "ko"
        ? `/ko/tools/${tool.slug}/`
        : `/tools/${tool.slug}/`;
  const pageIsEnglish = locale !== "en" && !(locale === "ko" && hasKoPage) && tool.locale !== "ko";
  const name = locale === "ko" && tool.koName ? tool.koName : tool.name;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-ink">{name}</h3>
        {tool.status === "soon" && (
          <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
            {t.soon}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-mute">{cardDesc(tool, locale)}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {locale === "en" && tool.locale !== "en" && (
          <span className="rounded-full border border-line-soft px-2 py-0.5 font-mono text-[10px] text-mute">
            {tool.locale === "both" ? "EN/KO" : "KO"}
          </span>
        )}
        {pageIsEnglish && tool.status === "live" && (
          <span className="rounded-full border border-line-soft px-2 py-0.5 font-mono text-[10px] text-mute">
            {t.enChip}
          </span>
        )}
        {tool.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-line-soft px-2 py-0.5 font-mono text-[10px] text-mute"
          >
            {tag}
          </span>
        ))}
      </div>
    </>
  );

  const cardClass =
    "block rounded-card border border-line-soft bg-surface p-4 transition-all duration-200";

  if (tool.status === "live") {
    return (
      <Link href={href} className={`${cardClass} hover:-translate-y-0.5 hover:border-line-strong`}>
        {inner}
      </Link>
    );
  }
  return <div className={cardClass}>{inner}</div>;
}

export function HubGrid({ locale = "en" }: { locale?: SiteLocale }) {
  const [query, setQuery] = useState("");
  const t = HUB[locale];

  const visible = useMemo(
    () => TOOLS.filter((tool) => !tool.hubHidden && matches(tool, locale, query)),
    [query, locale],
  );

  return (
    <div>
      {/* Hero = search bar. Rose-led glow on dark, pastel edge wash on paper. */}
      <section
        className="border-b border-line-soft"
        style={{ backgroundImage: "var(--tb-hero)" }}
      >
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6">
          <h1 className="text-4xl sm:text-5xl">{t.title}</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-mute">{t.subtitle}</p>
          <div className="mt-7 max-w-2xl">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="w-full rounded-btn border border-line-strong bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-mute focus:border-mute"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-mute">{t.popular}</span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQuery(tag)}
                  className="rounded-full border border-line-soft px-3 py-1 font-mono text-xs text-body transition active:scale-95 hover:border-line-strong hover:bg-elevated"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-8 font-mono text-xs text-mute">{t.stats}</p>
        </div>
      </section>

      {/* Category sections, PRD §3 order */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {CATEGORIES.map((cat) => {
          const tools = visible.filter((tool) => tool.category === cat.id);
          if (tools.length === 0) return null;
          return (
            <section
              key={cat.id}
              className="mt-10 rounded-card pt-2"
              style={{ backgroundImage: CATEGORY_WASH[cat.id] }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ color: CATEGORY_ACCENT[cat.id] }}>
                  <CategoryIcon id={cat.id} />
                </span>
                <h2 className="tb-display text-2xl">
                  {CATEGORY_NAMES[locale][cat.id]}{" "}
                  <span style={{ color: CATEGORY_ACCENT[cat.id] }}>({tools.length})</span>
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} locale={locale} />
                ))}
              </div>
            </section>
          );
        })}
        {visible.length === 0 && (
          <p className="mt-16 text-center text-mute">
            {t.noMatch} “{query}”
          </p>
        )}
      </div>
    </div>
  );
}

export { PUBLIC_TOOL_COUNT };
