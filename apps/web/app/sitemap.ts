import type { MetadataRoute } from "next";
import { TOOLS } from "@/content/tools-meta";
import { LOCALE_PREFIX, SITE_LOCALES } from "@/content/i18n";
import links from "@/content/links.json";
import { NOTES } from "@/content/notes";
import lastmod from "@/content/lastmod.json";

const SITE = "https://testbench.tools";

export const dynamic = "force-static";

/**
 * Real last-modified dates, generated from git history by scripts/make-lastmod.mjs.
 * Added 2026-08-24: nine tool pages were sitting at "Discovered — currently not
 * indexed" or unknown to Google, never once crawled. A sitemap with no <lastmod>
 * gives the crawler nothing to prioritise on. These are genuine commit dates —
 * stamping "today" on every page each build would be a freshness claim that is
 * false, and crawlers learn to discount sitemaps that do it.
 */
const dates: Record<string, string> = lastmod;
const when = (key: string) => (dates[key] ? new Date(dates[key]) : undefined);

export default function sitemap(): MetadataRoute.Sitemap {
  const hub = when("__hub");
  const urls: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, priority: 1, lastModified: hub },
    { url: `${SITE}/ko/`, priority: 0.8, lastModified: hub },
    { url: `${SITE}/ja/`, priority: 0.8, lastModified: hub },
    { url: `${SITE}/de/`, priority: 0.8, lastModified: hub },
    { url: `${SITE}/zh/`, priority: 0.8, lastModified: hub },
  ];

  // Shared chrome pages exist in every locale
  const appsWhen = when("__apps");
  for (const loc of SITE_LOCALES) {
    const p = LOCALE_PREFIX[loc];
    urls.push({ url: `${SITE}${p}apps/`, priority: 0.6, lastModified: appsWhen });
    urls.push({ url: `${SITE}${p}about/`, priority: 0.3 });
    urls.push({ url: `${SITE}${p}contact/`, priority: 0.3 });
    urls.push({ url: `${SITE}${p}privacy/`, priority: 0.3 });
    for (const app of links.apps) {
      urls.push({ url: `${SITE}${p}apps/${app.slug}/`, priority: 0.5, lastModified: appsWhen });
    }
  }

  for (const tool of TOOLS.filter((t) => t.status === "live")) {
    const modified = when(tool.slug);
    if (tool.locale !== "ko") {
      urls.push({ url: `${SITE}/tools/${tool.slug}/`, priority: 0.8, lastModified: modified });
    }
    if (tool.locale !== "en") {
      urls.push({ url: `${SITE}/ko/tools/${tool.slug}/`, priority: 0.7, lastModified: modified });
    }
  }

  // Notes are English-only, so they appear once each.
  const notesWhen = when("__notes");
  urls.push({ url: `${SITE}/notes/`, priority: 0.6, lastModified: notesWhen });
  for (const note of NOTES) {
    urls.push({ url: `${SITE}/notes/${note.slug}/`, priority: 0.7, lastModified: notesWhen });
  }

  return urls;
}
