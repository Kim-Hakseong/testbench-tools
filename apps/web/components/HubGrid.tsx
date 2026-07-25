"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CATEGORIES,
  PUBLIC_TOOL_COUNT,
  TOOLS,
  type ToolMeta,
} from "@/content/tools-meta";
import { CategoryIcon } from "@/components/CategoryIcon";

const POPULAR_TAGS = ["crc", "modbus", "tdms", "plc", "float"];

function matches(tool: ToolMeta, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    tool.name.toLowerCase().includes(needle) ||
    tool.description.toLowerCase().includes(needle) ||
    tool.tags.some((t) => t.includes(needle))
  );
}

function ToolCard({ tool }: { tool: ToolMeta }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-ink">{tool.name}</h3>
        {tool.status === "soon" && (
          <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
            Soon
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-mute">{tool.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tool.locale !== "en" && (
          <span className="rounded-full border border-line-soft px-2 py-0.5 font-mono text-[10px] text-mute">
            {tool.locale === "both" ? "EN/KO" : "KO"}
          </span>
        )}
        {tool.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded-full border border-line-soft px-2 py-0.5 font-mono text-[10px] text-mute"
          >
            {t}
          </span>
        ))}
      </div>
    </>
  );

  const cardClass =
    "block rounded-card border border-line-soft bg-surface p-4 transition-colors";

  if (tool.status === "live") {
    const href = tool.locale === "ko" ? `/ko/tools/${tool.slug}/` : `/tools/${tool.slug}/`;
    return (
      <Link href={href} className={`${cardClass} hover:border-line-strong`}>
        {inner}
      </Link>
    );
  }
  return <div className={cardClass}>{inner}</div>;
}

export function HubGrid() {
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => TOOLS.filter((t) => !t.hubHidden && matches(t, query)),
    [query],
  );

  return (
    <div>
      {/* Hero = search bar. One atmospheric glow max, dark theme only via token. */}
      <section
        className="border-b border-line-soft"
        style={{ backgroundImage: "var(--tb-glow)" }}
      >
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6">
          <h1 className="text-4xl sm:text-5xl">
            Bench tools for T&amp;M and industrial engineers
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] text-mute">
            CRC calculators, frame decoders, PLC scaling, sensor math and file
            converters — free, instant, and 100% client-side.
          </p>
          <div className="mt-7 max-w-2xl">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 41 tools — try “crc”, “modbus”, “pt100”…"
              aria-label="Search tools"
              className="w-full rounded-btn border border-line-strong bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-mute focus:border-mute"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-mute">Popular:</span>
              {POPULAR_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setQuery(t)}
                  className="rounded-full border border-line-soft px-3 py-1 font-mono text-xs text-body transition-colors hover:border-line-strong"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-8 font-mono text-xs text-mute">
            {PUBLIC_TOOL_COUNT} tools · {CATEGORIES.length + 1} categories · 100%
            in-browser · Free
          </p>
        </div>
      </section>

      {/* Category sections, PRD §3 order */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {CATEGORIES.map((cat) => {
          const tools = visible.filter((t) => t.category === cat.id);
          if (tools.length === 0) return null;
          return (
            <section key={cat.id} className="mt-12">
              <div className="flex items-center gap-2.5">
                <span className="text-mute">
                  <CategoryIcon id={cat.id} />
                </span>
                <h2 className="tb-display text-2xl">
                  {cat.name}{" "}
                  <span className="text-mute">({tools.length})</span>
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          );
        })}
        {visible.length === 0 && (
          <p className="mt-16 text-center text-mute">
            No tools match “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}
