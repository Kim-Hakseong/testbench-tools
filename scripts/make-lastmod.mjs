#!/usr/bin/env node
// make-lastmod.mjs — record each page's real last-modified date for the sitemap.
//
// Why: the sitemap shipped without <lastmod>, and nine tool pages sat at
// "Discovered — currently not indexed" or unknown to Google, never crawled
// (checked 2026-08-24 via the URL Inspection API). A sitemap that says nothing
// about freshness gives the crawler no reason to prioritise anything.
//
// Why a generated file instead of reading git inside sitemap.ts: the sitemap is
// part of a static export and must not depend on a shell or on git being present
// in the build environment (CLAUDE.md §4). So this runs locally before the build
// and writes plain JSON that sitemap.ts imports.
//
// The dates are the real commit dates of the files that produce each page. We do
// not stamp "now" — a sitemap that claims every page changed today is a lie the
// crawler learns to ignore.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const gitDate = (path) => {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", path], {
      encoding: "utf8",
    }).trim();
    return out ? out.slice(0, 10) : null;
  } catch {
    return null;
  }
};

// Parsing tools-meta.ts with a regex keeps this script dependency-free, the same
// approach make-og.mjs already uses. Tools live under (en)/tools/<slug>, with
// ko-only ones under (ko)/ko/tools/<slug>.
const metaSrc = readFileSync("apps/web/content/tools-meta.ts", "utf8");
const entries = [...metaSrc.matchAll(/\{\s*slug:\s*"([a-z0-9-]+)"[^}]*?status:\s*"([a-z]+)"[^}]*?\}/g)];

const dates = {};
for (const [, slug, status] of entries) {
  if (status !== "live") continue;
  const candidates = [
    `apps/web/app/(en)/tools/${slug}/page.tsx`,
    `apps/web/app/(ko)/ko/tools/${slug}/page.tsx`,
  ].filter(existsSync);
  const d = candidates.map(gitDate).filter(Boolean).sort().pop();
  if (d) dates[slug] = d;
}

// Notes and the hub move with their own sources.
const extras = {
  "__hub": "apps/web/app/(en)/page.tsx",
  "__notes": "apps/web/content/notes.ts",
  "__apps": "apps/web/content/links.json",
};
for (const [key, path] of Object.entries(extras)) {
  if (!existsSync(path)) continue;
  const d = gitDate(path);
  if (d) dates[key] = d;
}

writeFileSync(
  "apps/web/content/lastmod.json",
  JSON.stringify(dates, null, 2) + "\n",
);
console.log(`✓ lastmod: ${Object.keys(dates).length} entries written to apps/web/content/lastmod.json`);
