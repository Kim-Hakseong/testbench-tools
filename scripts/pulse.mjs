// The loop's sensor. Collects, never decides.
//
//   node scripts/pulse.mjs
//
// Pulls Search Console (queries/pages), the usage beacon (Analytics Engine),
// optionally Cloudflare RUM page views, and live site health — then writes
//   telemetry/pulse-<date>.json   raw snapshot
//   telemetry/report-latest.md    deltas, anomalies, due predictions
//
// Tokens live OUTSIDE the repo in ~/.config/testbench/telemetry.env; a source
// with no token degrades to a SETUP NEEDED line instead of failing the run.
// AUTOPILOT.md is the contract for what happens with this data; this script's
// entire job is to make sure decisions happen on data instead of memory.

import { createSign } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TELEMETRY = join(ROOT, "telemetry");
const SITE = "https://testbench.tools";
const CF_ACCOUNT = "386edd63ce4a88f434f940ecc24f063e";
const GSC_PROPERTY = "sc-domain:testbench.tools";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

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
const today = new Date().toISOString().slice(0, 10);
const setupNeeded = [];
const anomalies = [];

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400_000);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Search Console (service-account JWT, no dependencies)
// ---------------------------------------------------------------------------

async function gscToken() {
  const keyFile = (ENV.GSC_KEY_FILE ?? "~/.config/testbench/gsc-sa.json")
    .replace(/^~/, homedir());
  if (!existsSync(keyFile)) {
    setupNeeded.push("GSC: 서비스 계정 키가 없습니다 → AUTOPILOT.md의 1회 설정 참조");
    return null;
  }

  const key = JSON.parse(readFileSync(keyFile, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned =
    `${b64({ alg: "RS256", typ: "JWT" })}.` +
    b64({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
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
  if (!json.access_token) {
    setupNeeded.push(`GSC: 토큰 발급 실패 — ${JSON.stringify(json).slice(0, 200)}`);
    return null;
  }
  return json.access_token;
}

async function gscQuery(token, body) {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_PROPERTY)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error).slice(0, 300));
  return json.rows ?? [];
}

async function collectGsc() {
  const token = await gscToken();
  if (!token) return null;

  try {
    // GSC data lags ~2 days; window accordingly.
    const [end, start, prevEnd, prevStart] = [daysAgo(2), daysAgo(29), daysAgo(30), daysAgo(57)];
    const dims = (dimensions, range) =>
      gscQuery(token, { startDate: range[0], endDate: range[1], dimensions, rowLimit: 250 });

    const [queries, pages, prevQueries, totals] = await Promise.all([
      dims(["query"], [start, end]),
      dims(["page"], [start, end]),
      dims(["query"], [prevStart, prevEnd]),
      gscQuery(token, { startDate: start, endDate: end, rowLimit: 1 }),
    ]);

    return {
      window: { start, end },
      totals: totals[0] ?? null,
      queries: queries.map((r) => ({ q: r.keys[0], ...pick(r) })),
      pages: pages.map((r) => ({ page: r.keys[0].replace(SITE, ""), ...pick(r) })),
      prevQueries: prevQueries.map((r) => ({ q: r.keys[0], ...pick(r) })),
    };
  } catch (e) {
    setupNeeded.push(`GSC: 조회 실패 — ${e.message}`);
    return null;
  }
}

const pick = (r) => ({
  impressions: r.impressions,
  clicks: r.clicks,
  position: Math.round(r.position * 10) / 10,
});

// ---------------------------------------------------------------------------
// Usage beacon (Analytics Engine SQL API)
// ---------------------------------------------------------------------------

async function collectUsage() {
  if (!ENV.CF_API_TOKEN) {
    setupNeeded.push("CF: API 토큰이 없습니다 (Account Analytics:Read) → AUTOPILOT.md 참조");
    return null;
  }

  const sql = (days) =>
    `SELECT blob1 AS tool, SUM(_sample_interval) AS uses
     FROM testbench_tool_usage
     WHERE timestamp > NOW() - INTERVAL '${days}' DAY
     GROUP BY tool ORDER BY uses DESC`;

  try {
    const run = async (days) => {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/analytics_engine/sql`,
        { method: "POST", headers: { authorization: `Bearer ${ENV.CF_API_TOKEN}` }, body: sql(days) },
      );
      const json = await res.json();
      if (!json.data) throw new Error(JSON.stringify(json).slice(0, 300));
      return json.data.map((r) => ({ tool: r.tool, uses: Number(r.uses) }));
    };
    return { last7: await run(7), last28: await run(28) };
  } catch (e) {
    setupNeeded.push(`사용 카운터: 조회 실패 — ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cloudflare RUM page views (optional)
// ---------------------------------------------------------------------------

async function collectRum() {
  if (!ENV.CF_API_TOKEN || !ENV.CF_RUM_SITE_TAG) {
    if (!ENV.CF_RUM_SITE_TAG) setupNeeded.push("RUM(선택): CF_RUM_SITE_TAG 미설정 — 페이지뷰 생략");
    return null;
  }

  const query = `{
    viewer { accounts(filter: {accountTag: "${CF_ACCOUNT}"}) {
      rumPageloadEventsAdaptiveGroups(
        filter: {siteTag: "${ENV.CF_RUM_SITE_TAG}", datetime_geq: "${daysAgo(7)}T00:00:00Z"},
        limit: 100, orderBy: [sum_visits_DESC]) {
        sum { visits }
        dimensions { requestPath }
      }
    } }
  }`;

  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { authorization: `Bearer ${ENV.CF_API_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    const groups = json?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups;
    if (!groups) throw new Error(JSON.stringify(json.errors ?? json).slice(0, 300));
    return groups.map((g) => ({ path: g.dimensions.requestPath, visits: g.sum.visits }));
  } catch (e) {
    setupNeeded.push(`RUM: 조회 실패(스키마 확인 필요할 수 있음) — ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Site health — no tokens needed, always runs
// ---------------------------------------------------------------------------

async function collectHealth() {
  const checks = [];
  const check = async (name, fn) => {
    try {
      checks.push({ name, ...(await fn()) });
    } catch (e) {
      checks.push({ name, ok: false, note: e.message });
    }
  };

  await check("home", async () => {
    const r = await fetch(`${SITE}/`);
    const body = await r.text();
    return { ok: r.status === 200 && body.includes("free tools"), note: `HTTP ${r.status}` };
  });
  await check("sitemap", async () => {
    const r = await fetch(`${SITE}/sitemap.xml`);
    const urls = ((await r.text()).match(/<url>/g) ?? []).length;
    return { ok: r.status === 200 && urls > 100, note: `${urls} URLs` };
  });
  await check("beacon-worker", async () => {
    // '!' fails the worker's slug regex, so this probes liveness without
    // writing a fake data point.
    const r = await fetch(`${SITE}/hit`, { method: "POST", body: "pulse-probe!" });
    return { ok: r.status === 204, note: `HTTP ${r.status}` };
  });
  await check("tool-page", async () => {
    const r = await fetch(`${SITE}/tools/crc-16-modbus/`);
    return { ok: r.status === 200, note: `HTTP ${r.status}` };
  });
  await check("rsc-noindex", async () => {
    const r = await fetch(`${SITE}/index.txt`);
    const tag = r.headers.get("x-robots-tag") ?? "";
    return { ok: tag.includes("noindex"), note: tag || "헤더 없음" };
  });

  for (const c of checks.filter((c) => !c.ok)) {
    anomalies.push(`헬스: ${c.name} 실패 (${c.note})`);
  }
  return checks;
}

// ---------------------------------------------------------------------------
// Analysis helpers — deltas, anomalies, the prediction ledger
// ---------------------------------------------------------------------------

function previousSnapshot() {
  if (!existsSync(TELEMETRY)) return null;
  const files = readdirSync(TELEMETRY)
    .filter((f) => /^pulse-\d{4}-\d{2}-\d{2}\.json$/.test(f) && !f.includes(today))
    .sort();
  return files.length
    ? JSON.parse(readFileSync(join(TELEMETRY, files.at(-1)), "utf8"))
    : null;
}

function loadLedger() {
  const path = join(TELEMETRY, "ledger.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
}

function analyseGsc(gsc, prev) {
  if (!gsc) return null;
  const prevMap = new Map(gsc.prevQueries.map((r) => [r.q, r]));

  const newQueries = gsc.queries
    .filter((r) => r.impressions >= 5 && !prevMap.has(r.q))
    .slice(0, 15);

  const opportunities = gsc.queries
    .filter((r) => r.impressions >= 15 && r.clicks === 0 && r.position > 15)
    .slice(0, 15);

  if (prev?.gsc?.totals && gsc.totals) {
    const drop = 1 - gsc.totals.impressions / prev.gsc.totals.impressions;
    if (drop > 0.4) anomalies.push(`노출 급감: ${prev.gsc.totals.impressions} → ${gsc.totals.impressions} (전 스냅샷 대비 −${Math.round(drop * 100)}%)`);
  }

  return { newQueries, opportunities };
}

function checkLedger(ledger, snapshot) {
  return ledger
    .filter((e) => e.verdict === null || e.verdict === undefined)
    .map((e) => {
      const due = new Date(e.date).getTime() + e.horizonDays * 86400_000 <= Date.now();
      return { ...e, due, snapshotHint: due ? hintFor(e, snapshot) : null };
    });
}

function hintFor(entry, snapshot) {
  // Best-effort: surface the relevant current number next to a due prediction
  // so the reviewing session judges on data, not memory.
  const m = /nmea/i.exec(entry.metric);
  if (m && snapshot.gsc) {
    const total = snapshot.gsc.queries
      .filter((q) => q.q.includes("nmea"))
      .reduce((a, q) => a + q.clicks, 0);
    return `현재 nmea* 클릭 합: ${total}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function fmtRows(rows, cols) {
  if (!rows?.length) return "_없음_\n";
  const header = `| ${cols.map((c) => c.h).join(" | ")} |`;
  const sep = `|${cols.map(() => "---").join("|")}|`;
  const body = rows.map((r) => `| ${cols.map((c) => c.f(r)).join(" | ")} |`).join("\n");
  return `${header}\n${sep}\n${body}\n`;
}

async function main() {
  mkdirSync(TELEMETRY, { recursive: true });
  const prev = previousSnapshot();

  const [gsc, usage, rum, health] = await Promise.all([
    collectGsc(),
    collectUsage(),
    collectRum(),
    collectHealth(),
  ]);

  const snapshot = { date: today, gsc, usage, rum, health };
  const insight = analyseGsc(gsc, prev);
  const ledger = loadLedger();
  const pending = checkLedger(ledger, snapshot);

  writeFileSync(join(TELEMETRY, `pulse-${today}.json`), JSON.stringify(snapshot, null, 2));

  const md = [];
  md.push(`# Pulse — ${today}`, "");
  md.push(`이 리포트는 기계가 수집만 한 것이다. 판단은 AUTOPILOT.md 계약대로.`, "");

  md.push(`## 헬스`, "");
  md.push(fmtRows(health, [
    { h: "체크", f: (r) => r.name },
    { h: "상태", f: (r) => (r.ok ? "✓" : "✗ FAIL") },
    { h: "비고", f: (r) => r.note },
  ]));

  if (anomalies.length) {
    md.push(`## ⚠ 이상 신호`, "");
    for (const a of anomalies) md.push(`- ${a}`);
    md.push("");
  }

  if (pending.length) {
    md.push(`## 예측 원장 (${pending.filter((p) => p.due).length}건 만기)`, "");
    md.push(fmtRows(pending, [
      { h: "행동", f: (r) => `${r.date} ${r.action}` },
      { h: "예측", f: (r) => `${r.metric} ${r.prediction} (기준 ${r.baseline})` },
      { h: "상태", f: (r) => (r.due ? `**만기** ${r.snapshotHint ?? ""}` : `${r.horizonDays}일 대기`) },
    ]));
  }

  if (usage) {
    md.push(`## 툴 실사용 (비콘, 최근 7일 / 28일)`, "");
    const map28 = new Map(usage.last28.map((r) => [r.tool, r.uses]));
    md.push(fmtRows(usage.last7.slice(0, 20), [
      { h: "툴", f: (r) => r.tool },
      { h: "7일", f: (r) => r.uses },
      { h: "28일", f: (r) => map28.get(r.tool) ?? "" },
    ]));
    if (usage.last28.length === 0) {
      md.push("_28일간 사용 0 — 비콘 헬스가 ✓라면 방문 자체가 없는 것_", "");
    }
  }

  if (gsc) {
    md.push(`## 검색 (GSC ${gsc.window.start} ~ ${gsc.window.end})`, "");
    if (gsc.totals) {
      const p = prev?.gsc?.totals;
      md.push(`총 노출 **${gsc.totals.impressions}** (이전 ${p?.impressions ?? "?"}) · 클릭 **${gsc.totals.clicks}** (이전 ${p?.clicks ?? "?"}) · 평균 순위 ${gsc.totals.position?.toFixed(1)}`, "");
    }
    md.push(`### 상위 검색어`, "");
    md.push(fmtRows(gsc.queries.slice(0, 20), [
      { h: "검색어", f: (r) => r.q },
      { h: "노출", f: (r) => r.impressions },
      { h: "클릭", f: (r) => r.clicks },
      { h: "순위", f: (r) => r.position },
    ]));
    md.push(`### 새로 등장한 검색어 (노출≥5, 이전 창에 없음)`, "");
    md.push(fmtRows(insight.newQueries, [
      { h: "검색어", f: (r) => r.q },
      { h: "노출", f: (r) => r.impressions },
      { h: "순위", f: (r) => r.position },
    ]));
    md.push(`### 기회 (노출≥15 · 클릭 0 · 순위>15)`, "");
    md.push(fmtRows(insight.opportunities, [
      { h: "검색어", f: (r) => r.q },
      { h: "노출", f: (r) => r.impressions },
      { h: "순위", f: (r) => r.position },
    ]));
    md.push(`### 페이지별`, "");
    md.push(fmtRows(gsc.pages.slice(0, 20), [
      { h: "페이지", f: (r) => r.page },
      { h: "노출", f: (r) => r.impressions },
      { h: "클릭", f: (r) => r.clicks },
      { h: "순위", f: (r) => r.position },
    ]));
  }

  if (rum) {
    md.push(`## 페이지뷰 (RUM, 최근 7일)`, "");
    md.push(fmtRows(rum.slice(0, 20), [
      { h: "경로", f: (r) => r.path },
      { h: "방문", f: (r) => r.visits },
    ]));
  }

  if (setupNeeded.length) {
    md.push(`## SETUP NEEDED`, "");
    for (const s of setupNeeded) md.push(`- ${s}`);
    md.push("");
  }

  writeFileSync(join(TELEMETRY, "report-latest.md"), md.join("\n"));
  console.log(`pulse: telemetry/pulse-${today}.json + report-latest.md`);
  console.log(`  health ${health.filter((c) => c.ok).length}/${health.length} ok` +
    ` · gsc ${gsc ? "ok" : "—"} · usage ${usage ? "ok" : "—"} · rum ${rum ? "ok" : "—"}` +
    ` · setup-needed ${setupNeeded.length} · anomalies ${anomalies.length}`);
}

await main();
