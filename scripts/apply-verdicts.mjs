#!/usr/bin/env node
// apply-verdicts.mjs — the one write the monthly review is allowed to make.
//
// The monthly reviewer runs in plan mode: it can read and judge but not edit.
// That is deliberate — a review that concludes things about the catalogue should
// not also be able to change the site. But it left the loop open: the first
// expired prediction was judged ✗ in prose and the ledger stayed `null`, so the
// verdict existed only in an email. Unrecorded verdicts mean the ledger stops
// being a ledger.
//
// So instead of granting write access, this reads one strictly-shaped block from
// the review's output and applies only that:
//
//   ===VERDICTS===
//   2026-08-20-beacon|✗|주당 4.5건으로 목표 10 미달. 기저 없이 목표를 잡은 것이 원인.
//   ===END VERDICTS===
//
// Anything outside the block is ignored. Unknown ids are refused rather than
// guessed at, and an entry that already carries a verdict is never overwritten —
// a review re-run must not quietly rewrite history.
//
// Usage: node scripts/apply-verdicts.mjs <file-containing-review-output>

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const LEDGER = resolve(import.meta.dirname, "../telemetry/ledger.json");
const source = process.argv[2];

if (!source || !existsSync(source)) {
  console.error("apply-verdicts: 입력 파일이 없습니다");
  process.exit(1);
}
if (!existsSync(LEDGER)) {
  console.error("apply-verdicts: ledger.json이 없습니다");
  process.exit(1);
}

const text = readFileSync(source, "utf8");
const block = /===VERDICTS===\s*\n([\s\S]*?)\n\s*===END VERDICTS===/.exec(text);
if (!block) {
  console.log("apply-verdicts: 판정 블록 없음 — 원장 변경 없음");
  process.exit(0);
}

const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
const byId = new Map(ledger.map((e) => [e.id, e]));
const today = new Date().toISOString().slice(0, 10);

let applied = 0;
const skipped = [];
for (const raw of block[1].split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;

  const [id, verdict, ...rest] = line.split("|").map((s) => s.trim());
  const reason = rest.join("|").trim();

  if (!["✓", "✗", "판정 불가"].includes(verdict)) {
    skipped.push(`${id}: 판정값이 ✓/✗/판정 불가 가 아님 ("${verdict}")`);
    continue;
  }
  const entry = byId.get(id);
  if (!entry) {
    skipped.push(`${id}: 원장에 없는 id — 추측하지 않고 건너뜀`);
    continue;
  }
  if (entry.verdict !== null && entry.verdict !== undefined) {
    skipped.push(`${id}: 이미 '${entry.verdict}'로 판정됨 — 덮어쓰지 않음`);
    continue;
  }

  entry.verdict = verdict;
  entry.judgedOn = today;
  if (reason) entry.cause = reason;
  applied++;
  console.log(`apply-verdicts: ${id} → ${verdict}`);
}

if (applied > 0) writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n");
for (const s of skipped) console.log(`apply-verdicts: 건너뜀 — ${s}`);
console.log(`apply-verdicts: ${applied}건 기록, ${skipped.length}건 건너뜀`);
