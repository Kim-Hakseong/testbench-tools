#!/usr/bin/env node
// monthly.mjs — the month-scale view the weekly pulse cannot give.
//
// Why this exists: pulse.mjs runs weekly over a 28-day window, so two
// consecutive weekly reports share 21 of their 28 days. Week-to-week "movement"
// in that report is mostly the window sliding. This script compares whole
// calendar months, which do not overlap at all, and answers the questions that
// only make sense at that scale:
//
//   - did the month actually move, against a clean prior month
//   - which live tools produced no signal at all (no impressions, no use)
//   - which tools have gone quiet long enough to be a removal candidate
//     (AUTOPILOT.md: three consecutive cycles of zero use — a T2 proposal that
//     nothing was computing until now)
//   - where does every open prediction stand
//
// Everything here is analysis only. Monthly conclusions (catalogue changes, tier
// changes, removals) are all T2 in AUTOPILOT.md, so this script never edits,
// commits or deploys — it writes a report for a human to approve.
//
// Zero dependencies, same as pulse.mjs.

import { createSign } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TELEMETRY = join(ROOT, "telemetry");
const CF_ACCOUNT = "386edd63ce4a88f434f940ecc24f063e";
const GSC_PROPERTY = "sc-domain:testbench.tools";

// GSC finalises data a couple of days late, so a month is only trustworthy once
// a few days of the next one have passed. Running on the 4th keeps the last days
// of the reported month from reading as a phantom decline.
const SETTLE_DAYS = 3;

const notes = [];

function loadEnv() {
  const env = {};
  const path = join(homedir(), ".config/testbench/telemetry.env");
  if (existsSync(path)) {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m) env[m[1]] = m[2];
    }
  }
  return env;
}
const ENV = loadEnv();

const iso = (d) => d.toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((b - a) / 86400_000);

/**
 * Calendar months counting back from the last one that is safely complete.
 * back=0 is that month, back=1 the one before it.
 */
function month(back) {
  const now = new Date();
  const settled = new Date(now.getTime() - SETTLE_DAYS * 86400_000);
  // First day of the settled month, then step back `back + 1` months.
  const start = new Date(Date.UTC(settled.getUTCFullYear(), settled.getUTCMonth() - back - 1, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)); // last day
  return { start: iso(start), end: iso(end), label: iso(start).slice(0, 7), startDate: start, endDate: end };
}

// --- GSC --------------------------------------------------------------------

async function gscToken() {
  const keyFile = (ENV.GSC_KEY_FILE ?? "~/.config/testbench/gsc-sa.json").replace(/^~/, homedir());
  if (!existsSync(keyFile)) { notes.push("GSC: 서비스 계정 키 없음"); return null; }
  const key = JSON.parse(readFileSync(keyFile, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.` + b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  });
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const json = await res.json();
  if (!json.access_token) { notes.push("GSC: 토큰 발급 실패"); return null; }
  return json.access_token;
}

async function gscQuery(token, body) {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_PROPERTY)}/searchAnalytics/query`,
    { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) },
  );
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error).slice(0, 300));
  return json.rows ?? [];
}

async function collectGsc(cur, prev) {
  const token = await gscToken();
  if (!token) return null;
  const one = async (m) => {
    const base = { startDate: m.start, endDate: m.end };
    const [totals, queries, pages] = await Promise.all([
      gscQuery(token, { ...base, rowLimit: 1 }),
      gscQuery(token, { ...base, dimensions: ["query"], rowLimit: 250 }),
      gscQuery(token, { ...base, dimensions: ["page"], rowLimit: 250 }),
    ]);
    const t = totals[0];
    return {
      window: m,
      totals: t ? { impressions: t.impressions, clicks: t.clicks, position: t.position, ctr: t.ctr } : null,
      queries: queries.map((r) => ({ q: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: +r.position.toFixed(1) })),
      pages: pages.map((r) => ({ page: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: +r.position.toFixed(1) })),
    };
  };
  try {
    return { cur: await one(cur), prev: await one(prev) };
  } catch (e) {
    notes.push(`GSC: 조회 실패 — ${e.message}`);
    return null;
  }
}

// --- Beacon usage, bucketed by month ---------------------------------------

/**
 * Analytics Engine keeps a rolling window, so months are addressed as
 * days-ago bounds (the same INTERVAL form pulse.mjs already relies on).
 */
async function collectUsage(months) {
  if (!ENV.CF_API_TOKEN) { notes.push("CF: API 토큰 없음"); return null; }
  const now = new Date();
  const run = async (m) => {
    const from = daysBetween(m.endDate, now) + 1; // month start is further back
    const fromDays = daysBetween(m.startDate, now) + 1;
    const sql =
      `SELECT blob1 AS tool, SUM(_sample_interval) AS uses
       FROM testbench_tool_usage
       WHERE timestamp > NOW() - INTERVAL '${fromDays}' DAY
         AND timestamp <= NOW() - INTERVAL '${from}' DAY
       GROUP BY tool ORDER BY uses DESC`;
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/analytics_engine/sql`,
      { method: "POST", headers: { authorization: `Bearer ${ENV.CF_API_TOKEN}` }, body: sql },
    );
    const json = await res.json();
    if (!json.data) throw new Error(JSON.stringify(json).slice(0, 200));
    return json.data.map((r) => ({ tool: r.tool, uses: Number(r.uses) }));
  };
  try {
    const out = {};
    for (const m of months) out[m.label] = await run(m);
    return out;
  } catch (e) {
    notes.push(`사용 카운터: 조회 실패 — ${e.message}`);
    return null;
  }
}

// --- Catalogue --------------------------------------------------------------

/** Live, publicly listed tools, parsed from the catalogue the same way make-og.mjs does. */
function liveTools() {
  const src = readFileSync(join(ROOT, "apps/web/content/tools-meta.ts"), "utf8");
  const out = [];
  for (const [, slug, body] of src.matchAll(/\{\s*slug:\s*"([a-z0-9-]+)"(.*?)\}/gs)) {
    if (!/status:\s*"live"/.test(body)) continue;
    if (/hubHidden:\s*true/.test(body)) continue;
    if (/locale:\s*"ko"/.test(body)) continue;
    out.push(slug);
  }
  return [...new Set(out)];
}

/** When did the beacon start reporting? Needed before any removal claim. */
function beaconHistoryDays() {
  const files = readdirSync(TELEMETRY).filter((f) => /^pulse-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of files) {
    const snap = JSON.parse(readFileSync(join(TELEMETRY, f), "utf8"));
    if (snap.usage) return { since: f.slice(6, 16), days: daysBetween(new Date(f.slice(6, 16)), new Date()) };
  }
  return null;
}

// --- Ledger -----------------------------------------------------------------

function ledgerStatus() {
  const path = join(TELEMETRY, "ledger.json");
  if (!existsSync(path)) return [];
  const now = new Date();
  return JSON.parse(readFileSync(path, "utf8")).map((e) => {
    const due = new Date(new Date(e.date).getTime() + e.horizonDays * 86400_000);
    return { ...e, due: iso(due), daysLeft: daysBetween(now, due) };
  }).sort((a, b) => a.daysLeft - b.daysLeft);
}

// --- Report -----------------------------------------------------------------

const fmt = (rows, cols) => rows.length === 0 ? ["_없음_", ""] : [
  `| ${cols.map((c) => c.h).join(" | ")} |`,
  `|${cols.map(() => "---").join("|")}|`,
  ...rows.map((r) => `| ${cols.map((c) => c.f(r)).join(" | ")} |`),
  "",
];

const delta = (a, b) => (a == null || b == null) ? "?" : (a - b >= 0 ? `+${a - b}` : `${a - b}`);

async function main() {
  const cur = month(0), prev = month(1), prev2 = month(2);
  const [gsc, usage] = await Promise.all([
    collectGsc(cur, prev),
    collectUsage([cur, prev, prev2]),
  ]);
  const tools = liveTools();
  const history = beaconHistoryDays();
  const ledger = ledgerStatus();

  const md = [
    `# TestBench 월간 리뷰 — ${cur.label}`,
    "",
    `대상: **${cur.start} ~ ${cur.end}** · 비교: ${prev.start} ~ ${prev.end}`,
    "",
    "> 이 리뷰는 **겹치지 않는 달력 월**을 비교한다. 주간 리포트의 28일 창은 매주 75%가 겹쳐",
    "> 주 단위 추세를 읽을 수 없으므로, 추세 판단은 이 문서를 기준으로 한다.",
    "> 월간 결론(카탈로그 변경·티어 조정·툴 제거)은 전부 **T2 = 제안만**이며 자동 실행되지 않는다.",
    "",
  ];

  // Search, month over month
  if (gsc?.cur?.totals) {
    const c = gsc.cur.totals, p = gsc.prev?.totals;
    md.push("## 검색 — 달 대 달", "");
    md.push(`| 지표 | ${cur.label} | ${prev.label} | 변화 |`, "|---|---|---|---|");
    md.push(`| 노출 | ${c.impressions} | ${p?.impressions ?? "?"} | ${delta(c.impressions, p?.impressions)} |`);
    md.push(`| 클릭 | ${c.clicks} | ${p?.clicks ?? "?"} | ${delta(c.clicks, p?.clicks)} |`);
    md.push(`| 평균 순위 | ${c.position?.toFixed(1)} | ${p?.position?.toFixed(1) ?? "?"} | ${p ? (c.position - p.position).toFixed(1) : "?"} |`, "");

    const prevClicks = new Map((gsc.prev?.pages ?? []).map((r) => [r.page, r.clicks]));
    const movers = gsc.cur.pages
      .map((r) => ({ ...r, was: prevClicks.get(r.page) ?? 0 }))
      .filter((r) => r.clicks !== r.was)
      .sort((a, b) => (b.clicks - b.was) - (a.clicks - a.was));
    md.push("### 클릭이 움직인 페이지", "");
    md.push(...fmt(movers.slice(0, 15), [
      { h: "페이지", f: (r) => r.page.replace("https://testbench.tools", "") },
      { h: `${cur.label}`, f: (r) => r.clicks },
      { h: `${prev.label}`, f: (r) => r.was },
      { h: "변화", f: (r) => delta(r.clicks, r.was) },
    ]));
  }

  // Usage by month
  md.push("## 툴 실사용 (비콘, 월별)", "");
  if (usage) {
    const labels = [cur.label, prev.label, prev2.label];
    const all = new Set(labels.flatMap((l) => (usage[l] ?? []).map((r) => r.tool)));
    const rows = [...all].map((tool) => ({
      tool, ...Object.fromEntries(labels.map((l) => [l, (usage[l] ?? []).find((r) => r.tool === tool)?.uses ?? 0])),
    })).sort((a, b) => b[cur.label] - a[cur.label]);
    md.push(...fmt(rows, [
      { h: "툴", f: (r) => r.tool },
      ...labels.map((l) => ({ h: l, f: (r) => r[l] })),
    ]));
  } else md.push("_수집 실패_", "");

  // Zero-signal tools and removal candidates
  md.push("## 신호 없는 툴", "");
  // A tool counts as "seen" from any locale — /tools/x/ and /ko/tools/x/ are the
  // same tool, and matching only the English path would report a tool with
  // Korean-only impressions as silent.
  const impressed = new Set(
    (gsc?.cur?.pages ?? [])
      .map((r) => /\/tools\/([a-z0-9-]+)\/?$/.exec(r.page)?.[1])
      .filter(Boolean),
  );
  const used = new Set(Object.values(usage ?? {}).flat().map((r) => r.tool));
  const silent = tools.filter((t) => !impressed.has(t) && !used.has(t));
  md.push(`공개 툴 ${tools.length}개 중 **${silent.length}개**가 이 달 노출·사용 모두 0이다.`, "");
  md.push(silent.length ? silent.map((t) => `\`${t}\``).join(" · ") : "_없음_", "");

  md.push("### 제거 후보 판정", "");
  if (!history) {
    md.push("_비콘 데이터 없음 — 판정 불가._", "");
  } else if (history.days < 90) {
    md.push(
      `**판정 보류.** AUTOPILOT.md는 제거 제안에 **3주기 연속 사용 0**을 요구하는데, ` +
      `비콘은 ${history.since}에 켜져 아직 ${history.days}일치뿐이다(90일 필요). ` +
      `그때까지 위 목록은 "제거 후보"가 아니라 **관찰 대상**이다.`, "");
    md.push(
      `> 표본이 적을 때 조용한 툴을 지우면, 카탈로그 완결성(Tier 3 존치 결정)을 ` +
      `측정 부족과 맞바꾸는 것이 된다. 기다리는 편이 싸다.`, "");
  } else {
    md.push(`비콘 이력 ${history.days}일 — 3주기 판정 가능. 위 목록 중 3개월 연속 0인 툴이 제거 제안 대상이다.`, "");
  }

  // Ledger
  md.push("## 예측 원장", "");
  md.push(...fmt(ledger, [
    // The id is what a verdict line refers to; dates are not unique.
    { h: "id", f: (e) => `\`${e.id ?? "(id 없음)"}\`` },
    { h: "만기", f: (e) => e.due },
    { h: "D", f: (e) => (e.daysLeft >= 0 ? `+${e.daysLeft}` : `${e.daysLeft} 지남`) },
    { h: "행동", f: (e) => e.action.slice(0, 34) },
    { h: "예측", f: (e) => `${e.metric.slice(0, 24)} ${e.prediction}` },
    { h: "기저", f: (e) => e.baseline ?? "—" },
    { h: "판정", f: (e) => e.verdict ?? "—" },
  ]));
  const overdue = ledger.filter((e) => e.daysLeft < 0 && !e.verdict);
  if (overdue.length) {
    md.push(`> **만기가 지났는데 판정이 비어 있는 예측 ${overdue.length}건.** ` +
      `계약상 ✗이면 같은 계열 행동을 멈추고 원인 분석이 먼저다.`, "");
  }

  if (notes.length) {
    md.push("## 수집 참고", "");
    for (const n of notes) md.push(`- ${n}`);
    md.push("");
  }

  writeFileSync(join(TELEMETRY, `monthly-${cur.label}.json`),
    JSON.stringify({ month: cur.label, gsc, usage, tools, silent, history, ledger }, null, 2));
  writeFileSync(join(TELEMETRY, "monthly-latest.md"), md.join("\n"));
  console.log(`monthly: telemetry/monthly-${cur.label}.json + monthly-latest.md`);
  console.log(`  gsc ${gsc ? "ok" : "—"} · usage ${usage ? "ok" : "—"} · 공개툴 ${tools.length} · 무신호 ${silent.length} · 예측 ${ledger.length}(만기미판정 ${overdue.length})`);
}

await main();
