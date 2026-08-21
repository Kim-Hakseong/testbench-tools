#!/usr/bin/env node
// check-og.mjs — build-time guard for Open Graph completeness (zero-dep).
//
// Why this exists: an external SEO audit (2026-08-21) found og:url missing on
// every page — present og:title/description/image but no og:url — because each
// page's openGraph object was hand-written and the field was simply forgotten.
// pulse.mjs (GSC aggregates) can never see a per-page tag gap like this, so we
// catch it here instead, at the same gate that runs test + i18n + build.
//
// Rule: any exported page that carries a canonical link is a real, indexable URL
// and must also carry og:url, and that og:url must EQUAL the canonical. (Social
// cards and some crawlers read og:url as the page's own address; a missing or
// mismatched one is a silent defect.) og:image is required too — every card
// needs one. Pages with no canonical (none exist today) are left alone.
//
// Runs against the static export in apps/web/out/. No deps; plain string scans.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = new URL("../apps/web/out/", import.meta.url).pathname;

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith(".html")) yield p;
  }
}

const attr = (html, tag, key, val) => {
  // find <tag ... key="val" ... content/href="X"> and return X
  const re = new RegExp(`<${tag}[^>]*\\b${key}="${val}"[^>]*>`, "i");
  const el = html.match(re)?.[0];
  if (!el) return null;
  return el.match(/\b(?:content|href)="([^"]*)"/i)?.[1] ?? null;
};

const problems = [];
let checked = 0;

for (const file of htmlFiles(OUT)) {
  const html = readFileSync(file, "utf8");
  const canonical = attr(html, "link", "rel", "canonical");
  if (!canonical) continue; // no canonical → not treated as an indexable landing
  checked++;
  const rel = file.slice(OUT.length);

  const ogUrl = attr(html, "meta", "property", "og:url");
  const ogImage = attr(html, "meta", "property", "og:image");

  if (!ogUrl) problems.push(`${rel}: has canonical but no og:url`);
  else if (ogUrl !== canonical)
    problems.push(`${rel}: og:url (${ogUrl}) != canonical (${canonical})`);
  if (!ogImage) problems.push(`${rel}: has canonical but no og:image`);
}

if (problems.length) {
  console.error(`✗ OG check failed — ${problems.length} issue(s) across ${checked} canonical pages:`);
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`);
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`);
  process.exit(1);
}

console.log(`✓ OG check: ${checked} canonical pages all carry a matching og:url and og:image`);
