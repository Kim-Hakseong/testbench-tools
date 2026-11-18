#!/usr/bin/env node
// demand.mjs — weekly demand scan for new tools and missed queries.
//
// Why this exists (2026-11-17): GSC and Bing query stats only list searches
// where a page of ours already appeared, so demand for things we have no page
// about never reached a report — 12 of the first 13 ledger actions were edits
// to existing pages. Bing's keyword research (GetRelatedKeywords) is
// site-independent: it expands a seed into what people searched across Bing,
// with impressions. Seeds live in scripts/demand-seeds.json.
//
// Used by pulse.mjs every week (2026-11-18: weekly, not monthly, so the loop
// reacts within a week). Run directly to print the section without touching
// any telemetry file:  node scripts/demand.mjs
//
// Zero dependencies, same as pulse.mjs. The API key goes only into the request
// URL and is never logged.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TOOL_INTENT = /\b(calculator|calc|converter|convert|conversion|decoder|decode|encoder|encode|generator|checker|check|checksum|table|chart|formula|online|tool|viewer|parser|simulator|tester|analyzer|lookup|to)\b/;
const INFO_INTENT = /^(what|how|why|when|where|which|is|are|can i|does)\b|\b(vs|versus|meaning|definition|tutorial|pdf|course|salary|jobs?)\b/;
const GENERIC = new Set(["calculator", "converter", "decoder", "builder", "generator", "viewer", "to", "and", "the", "a", "of", "for", "online", "tool", "table"]);

/** Distinctive words per live tool (slug + tags + name), for a "does something already answer this" hint. */
function toolVocabulary(root) {
  const src = readFileSync(join(root, "apps/web/content/tools-meta.ts"), "utf8");
  const out = [];
  for (const [, slug, body] of src.matchAll(/\{\s*slug:\s*"([a-z0-9-]+)"(.*?)\}/gs)) {
    if (!/status:\s*"live"/.test(body) || /locale:\s*"ko"/.test(body)) continue;
    const name = /name:\s*"([^"]+)"/.exec(body)?.[1] ?? "";
    const tags = [...(/tags:\s*\[([^\]]*)\]/.exec(body)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const words = `${slug.replaceAll("-", " ")} ${name} ${tags.join(" ")}`.toLowerCase().split(/[^a-z0-9.]+/)
      .filter((w) => w.length > 1 && !GENERIC.has(w));
    out.push({ slug, words: new Set(words) });
  }
  return out;
}

// A query asking for a kind of tool the catalogue does not make ("plc simulator")
// is not answered by a tool that merely shares the subject word ("plc").
const TOOL_KIND = new Set(["simulator", "emulator", "tester", "analyzer", "oscilloscope", "discovery", "monitor", "sniffer"]);

function nearestTool(query, vocab) {
  const q = query.toLowerCase().split(/[^a-z0-9.]+/).filter((w) => w.length > 1 && !GENERIC.has(w));
  const kinds = q.filter((w) => TOOL_KIND.has(w));
  if (!q.length) return null;
  let best = null;
  for (const t of vocab) {
    const hit = q.filter((w) => t.words.has(w)).length;
    if (hit && (!best || hit > best.hit)) best = { slug: t.slug, hit, share: hit / q.length };
  }
  if (!best || best.share < 0.5) return null;
  const tool = vocab.find((t) => t.slug === best.slug);
  return kinds.every((k) => tool.words.has(k)) ? best.slug : null;
}

const compact = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Does the query contain every required word? Matched on whole tokens (or two
 * or three adjacent tokens joined, so "4-20" finds "4 20ma"), never on raw
 * substrings: "adc" must not match "roadclosure".
 */
function mentions(query, must) {
  const t = query.split(/[^a-z0-9]+/).filter(Boolean);
  const grams = [...t, ...t.slice(1).map((w, i) => t[i] + w), ...t.slice(2).map((w, i) => t[i] + t[i + 1] + w)];
  return must.every((m) => grams.some((g) => g.startsWith(m)));
}

/**
 * @param {object} o
 * @param {string} o.apiKey   Bing Webmaster API key
 * @param {string} o.root     repository root
 * @param {string} o.start    YYYY-MM-DD
 * @param {string} o.end      YYYY-MM-DD
 * @param {Set<string>} [o.seen]  queries the site already shows for in Bing (excluded)
 * @param {string[]} o.notes  collection notes are pushed here
 */
export async function collectDemand({ apiKey, root, start, end, seen = new Set(), notes }) {
  if (!apiKey) { notes.push("수요 탐색: BING_API_KEY 없음"); return null; }
  const seedsPath = join(root, "scripts/demand-seeds.json");
  if (!existsSync(seedsPath)) { notes.push("수요 탐색: scripts/demand-seeds.json 없음"); return null; }
  const cfg = JSON.parse(readFileSync(seedsPath, "utf8"));
  const norm = (x, kind) => {
    const q = typeof x === "string" ? x : x.q;
    return { s: q, kind, must: (typeof x === "string" ? q.split(/\s+/) : x.must).map(compact) };
  };
  const seeds = [...cfg.covered.map((x) => norm(x, "covered")), ...cfg.adjacent.map((x) => norm(x, "adjacent"))];
  const block = (cfg.block ?? []).map((b) => new RegExp(`\\b${b}\\b`));
  const base = "https://ssl.bing.com/webmaster/api.svc/json/GetRelatedKeywords";

  const found = new Map();
  let failed = 0;
  for (const { s, kind, must } of seeds) {
    const qs = `apikey=${apiKey}&q=${encodeURIComponent(s)}&country=${cfg.country}&language=${cfg.language}&startDate=${start}&endDate=${end}`;
    try {
      const res = await fetch(`${base}?${qs}`);
      const json = await res.json();
      if (!Array.isArray(json?.d)) throw new Error(`HTTP ${res.status}`);
      for (const k of json.d) {
        const q = (k.Query ?? "").toLowerCase().trim();
        // GetRelatedKeywords expands semantically ("crc" -> "crc to usd", "bacnet" -> "marine online").
        if (!q || seen.has(q) || !mentions(q, must) || block.some((b) => b.test(q))) continue;
        const prev = found.get(q);
        if (!prev || (k.Impressions ?? 0) > prev.impressions) {
          found.set(q, { q, impressions: k.Impressions ?? 0, seed: s, kind });
        }
      }
    } catch (e) {
      failed += 1;
      // Never echo the URL: it carries the API key.
      notes.push(`수요 탐색: '${s}' 조회 실패 — ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (failed === seeds.length) return null;

  const vocab = toolVocabulary(root);
  const rows = [...found.values()].map((r) => ({
    ...r,
    intent: INFO_INTENT.test(r.q) ? "정보" : TOOL_INTENT.test(r.q) ? "툴" : "중립",
    near: nearestTool(r.q, vocab),
  }));
  return {
    window: `${start}~${end}`, country: cfg.country, language: cfg.language,
    seeds: seeds.length, failed,
    // Tool-intent queries with no existing tool behind them: new-tool candidates (T2).
    candidates: rows.filter((r) => r.intent === "툴" && !r.near).sort((a, b) => b.impressions - a.impressions).slice(0, 25),
    // Tool-intent queries an existing tool should answer but we are not shown for: page work (T1).
    gaps: rows.filter((r) => r.intent === "툴" && r.near).sort((a, b) => b.impressions - a.impressions).slice(0, 15),
    adjacentTotals: seeds.filter((x) => x.kind === "adjacent").map(({ s }) => ({
      seed: s,
      impressions: rows.filter((r) => r.seed === s).reduce((a, r) => a + r.impressions, 0),
      toolIntent: rows.filter((r) => r.seed === s && r.intent === "툴").reduce((a, r) => a + r.impressions, 0),
    })).sort((a, b) => b.toolIntent - a.toolIntent),
  };
}

const table = (rows, cols) => rows.length === 0 ? "_없음_\n" : [
  `| ${cols.map((c) => c.h).join(" | ")} |`,
  `|${cols.map(() => "---").join("|")}|`,
  ...rows.map((r) => `| ${cols.map((c) => c.f(r)).join(" | ")} |`),
  "",
].join("\n");

/** Report section as an array of markdown blocks. */
export function demandSection(demand) {
  const md = ["## 수요 탐색 — Bing 키워드 조사 (신규 툴·놓친 검색어)", ""];
  if (!demand) return [...md, "_수집 실패 — 아래 '설정 필요'/수집 참고_", ""];
  md.push(
    `> 우리 사이트와 무관한 Bing 전체 검색 수요다(${demand.country}/${demand.language}, ${demand.window}, 씨앗 ${demand.seeds}개` +
      `${demand.failed ? `, 실패 ${demand.failed}` : ""}). 우리가 이미 Bing에 노출된 검색어는 뺐다 — 위 'Bing 검색'이 이미 보여 주기 때문이다.`,
    "> 노출은 씨앗당 상위 일부만 돌아오는 값이라 절대 수요가 아니라 **후보끼리의 상대 비교**로 읽는다.",
    "> '가까운 기존 툴'은 단어 겹침 힌트다. 행동 전에 tools-meta.ts와 해당 페이지를 직접 확인한다.",
    "",
    "### 기존 툴이 받아야 하는데 우리가 안 보이는 검색어 (페이지 개선 후보 — T1)",
    "",
  );
  md.push(table(demand.gaps, [
    { h: "검색어", f: (r) => `\`${r.q}\`` },
    { h: "노출", f: (r) => r.impressions },
    { h: "가까운 기존 툴", f: (r) => `\`${r.near}\`` },
  ]));
  md.push("### 툴 의도인데 답하는 툴이 없는 검색어 (신규 툴 후보 — T2 제안)", "");
  md.push(table(demand.candidates, [
    { h: "검색어", f: (r) => `\`${r.q}\`` },
    { h: "노출", f: (r) => r.impressions },
    { h: "씨앗", f: (r) => `${r.seed}${r.kind === "adjacent" ? " (인접)" : ""}` },
  ]));
  md.push("### 인접 분야별 수요 합 (카탈로그에 없는 분야)", "");
  md.push(table(demand.adjacentTotals.filter((r) => r.impressions > 0), [
    { h: "분야", f: (r) => r.seed },
    { h: "툴 의도 노출", f: (r) => r.toolIntent },
    { h: "전체 노출", f: (r) => r.impressions },
  ]));
  return md;
}

// Direct run: print the section for the last 28 days. Reads nothing but the
// key file and the seed list; writes nothing.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = resolve(import.meta.dirname, "..");
  const envPath = join(homedir(), ".config/testbench/telemetry.env");
  const env = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m) env[m[1]] = m[2];
    }
  }
  const day = (n) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
  const notes = [];
  const demand = await collectDemand({ apiKey: env.BING_API_KEY, root, start: day(29), end: day(1), notes });
  console.log([...demandSection(demand), ...notes.map((n) => `- ${n}`)].join("\n"));
}
