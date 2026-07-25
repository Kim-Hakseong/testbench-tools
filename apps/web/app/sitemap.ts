import type { MetadataRoute } from "next";
import { TOOLS } from "@/content/tools-meta";
import links from "@/content/links.json";

const SITE = "https://testbench.tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, priority: 1 },
    { url: `${SITE}/ko/`, priority: 0.8 },
    { url: `${SITE}/ja/`, priority: 0.8 },
    { url: `${SITE}/de/`, priority: 0.8 },
    { url: `${SITE}/zh/`, priority: 0.8 },
    { url: `${SITE}/apps/`, priority: 0.6 },
    { url: `${SITE}/about/`, priority: 0.3 },
    { url: `${SITE}/contact/`, priority: 0.3 },
    { url: `${SITE}/privacy/`, priority: 0.3 },
  ];

  for (const app of links.apps) {
    urls.push({ url: `${SITE}/apps/${app.slug}/`, priority: 0.5 });
  }

  for (const tool of TOOLS.filter((t) => t.status === "live")) {
    if (tool.locale !== "ko") {
      urls.push({ url: `${SITE}/tools/${tool.slug}/`, priority: 0.8 });
    }
    if (tool.locale !== "en") {
      urls.push({ url: `${SITE}/ko/tools/${tool.slug}/`, priority: 0.7 });
    }
  }

  return urls;
}
