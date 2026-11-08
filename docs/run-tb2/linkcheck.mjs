// RUN-TB2 G1 — every internal href in the static export resolves to a file.
//   node docs/run-tb2/linkcheck.mjs apps/web/out
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? "apps/web/out";
const pages = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".html")) pages.push(p);
  }
})(OUT);

const resolves = (path) => {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]);
  if (clean.endsWith("/")) return existsSync(join(OUT, clean, "index.html"));
  return existsSync(join(OUT, clean)) || existsSync(join(OUT, clean + ".html")) || existsSync(join(OUT, clean, "index.html"));
};

let links = 0;
const broken = [];
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    if (m[1].startsWith("//")) continue;
    links++;
    if (!resolves(m[1])) broken.push(`${page.slice(OUT.length)} → ${m[1]}`);
  }
}
console.log(JSON.stringify({ pages: pages.length, internalLinks: links, broken: broken.length, sample: broken.slice(0, 20) }, null, 1));
process.exit(broken.length ? 1 : 0);
