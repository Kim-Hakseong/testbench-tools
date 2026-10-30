#!/usr/bin/env node
// indexnow.mjs — tell Bing (and every IndexNow engine) which pages just changed.
//
// Why: on 2026-10-26 the site's search visitors turned out to come from
// Bing-fed engines (Bing, DuckDuckGo, Yahoo, ChatGPT), not Google. Bing reads
// IndexNow pings; without them a changed page waits for the next crawl.
//
// What gets submitted is read from the *live* sitemap, not the repo: a ping for
// a page Cloudflare has not deployed yet would send the crawler to the old
// version. So the script waits until the deploy is visible — until the live
// sitemap carries a lastmod on or after --since — and submits only those URLs.
// The lastmod values are real commit dates (make-lastmod.mjs), so "changed
// since" is exactly the set of pages that changed.
//
// The key is public by design: it is served at /<key>.txt and proves only that
// the submitter controls the host. It is not a secret.
//
// Usage:
//   node scripts/indexnow.mjs --since 2026-11-02   pages modified on/after that date
//   node scripts/indexnow.mjs --all                every URL in the sitemap (one-off seed)

const SITE = "https://testbench.tools";
const HOST = "testbench.tools";
const KEY = "2752b5407fbdf426629ca60acd401f55";
const WAIT_MS = 10 * 60 * 1000;
const POLL_MS = 20 * 1000;

const args = process.argv.slice(2);
const all = args.includes("--all");
const since = args[args.indexOf("--since") + 1];
if (!all && !/^\d{4}-\d{2}-\d{2}$/.test(since ?? "")) {
  console.error("indexnow: --since YYYY-MM-DD 또는 --all 이 필요합니다");
  process.exit(1);
}

async function liveEntries() {
  const res = await fetch(`${SITE}/sitemap.xml`, { cache: "no-store" });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: /<loc>([^<]+)<\/loc>/.exec(m[1])?.[1],
    lastmod: /<lastmod>(\d{4}-\d{2}-\d{2})/.exec(m[1])?.[1] ?? null,
  }));
}

async function pick() {
  const deadline = Date.now() + WAIT_MS;
  for (;;) {
    const entries = await liveEntries();
    const urls = all
      ? entries.map((e) => e.loc)
      : entries.filter((e) => e.lastmod && e.lastmod >= since).map((e) => e.loc);
    if (urls.length || all || Date.now() > deadline) return urls.filter(Boolean);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

const keyRes = await fetch(`${SITE}/${KEY}.txt`, { cache: "no-store" });
if (!keyRes.ok || (await keyRes.text()).trim() !== KEY) {
  console.log(`indexnow: 키 파일이 라이브에 없음(${keyRes.status}) — 제출 안 함`);
  process.exit(0);
}

const urls = await pick();
if (!urls.length) {
  console.log(`indexnow: ${since} 이후 바뀐 페이지가 라이브 사이트맵에 없음 — 제출 안 함`);
  process.exit(0);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
// 200 = accepted, 202 = accepted, key validation pending. Anything else is a refusal.
const ok = res.status === 200 || res.status === 202;
console.log(`indexnow: ${urls.length}개 제출 → HTTP ${res.status}${ok ? "" : " (거부)"}`);
for (const u of urls.slice(0, 10)) console.log(`  ${u.replace(SITE, "")}`);
if (urls.length > 10) console.log(`  … 외 ${urls.length - 10}개`);
process.exit(ok ? 0 : 1);
