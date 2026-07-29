import type { MetadataRoute } from "next";
import { TOOLS } from "@/content/tools-meta";
import { LOCALE_PREFIX, SITE_LOCALES } from "@/content/i18n";
import links from "@/content/links.json";
import { NOTES } from "@/content/notes";

const SITE = "https://testbench.tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, priority: 1 },
    { url: `${SITE}/ko/`, priority: 0.8 },
    { url: `${SITE}/ja/`, priority: 0.8 },
    { url: `${SITE}/de/`, priority: 0.8 },
    { url: `${SITE}/zh/`, priority: 0.8 },
  ];

  // Shared chrome pages exist in every locale
  for (const loc of SITE_LOCALES) {
    const p = LOCALE_PREFIX[loc];
    urls.push({ url: `${SITE}${p}apps/`, priority: 0.6 });
    urls.push({ url: `${SITE}${p}about/`, priority: 0.3 });
    urls.push({ url: `${SITE}${p}contact/`, priority: 0.3 });
    urls.push({ url: `${SITE}${p}privacy/`, priority: 0.3 });
    for (const app of links.apps) {
      urls.push({ url: `${SITE}${p}apps/${app.slug}/`, priority: 0.5 });
    }
  }

  for (const tool of TOOLS.filter((t) => t.status === "live")) {
    if (tool.locale !== "ko") {
      urls.push({ url: `${SITE}/tools/${tool.slug}/`, priority: 0.8 });
    }
    if (tool.locale !== "en") {
      urls.push({ url: `${SITE}/ko/tools/${tool.slug}/`, priority: 0.7 });
    }
  }

  // Notes are English-only, so they appear once each.
  urls.push({ url: `${SITE}/notes/`, priority: 0.6 });
  for (const note of NOTES) {
    urls.push({ url: `${SITE}/notes/${note.slug}/`, priority: 0.7 });
  }

  return urls;
}
