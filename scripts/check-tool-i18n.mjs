// Coverage check for the tool dictionaries.
//
// Two things go wrong when several people translate at once: a locale quietly
// misses a key another locale has, and a component gets wrapped in t() without
// its strings ever reaching a dictionary. Both look fine in the browser —
// English simply shows through — so they need catching here.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "apps/web/content/tool-i18n";
const COMPONENTS = "apps/web/components/tool";
const LOCALES = ["ko", "ja", "de", "zh"];

/** Pull a locale's keys out of a dictionary file without importing TS. */
function keysOf(source, locale) {
  const start = source.indexOf(`\n  ${locale}: {`);
  if (start === -1) return null;
  let i = source.indexOf("{", start), depth = 0, end = -1;
  for (let j = i; j < source.length; j++) {
    if (source[j] === "{") depth++;
    else if (source[j] === "}") { depth--; if (depth === 0) { end = j; break; } }
  }
  const body = source.slice(i + 1, end);
  return [...body.matchAll(/^\s*(?:"((?:[^"\\]|\\.)*)"|([A-Za-z_$][\w$]*))\s*:/gm)]
    .map((m) => (m[1] ?? m[2]).replace(/\\"/g, '"'));
}

let failed = 0;
const everyKey = new Set();

for (const file of readdirSync(DIR).filter((f) => /^(shared|batch-.)\.ts$/.test(f))) {
  const source = readFileSync(join(DIR, file), "utf8");
  const sets = Object.fromEntries(LOCALES.map((l) => [l, keysOf(source, l)]));
  if (LOCALES.some((l) => sets[l] === null)) {
    console.log(`✗ ${file}: a locale block is missing`);
    failed++;
    continue;
  }
  const union = new Set(LOCALES.flatMap((l) => sets[l]));
  union.forEach((k) => everyKey.add(k));
  const gaps = LOCALES
    .map((l) => [l, [...union].filter((k) => !sets[l].includes(k))])
    .filter(([, missing]) => missing.length);

  if (gaps.length) {
    failed++;
    console.log(`✗ ${file}: ${union.size} keys, locale gaps —`);
    for (const [l, missing] of gaps) {
      console.log(`    ${l} missing ${missing.length}: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`);
    }
  } else {
    console.log(`✓ ${file}: ${union.size} keys × ${LOCALES.length} locales`);
  }
}

// Every t("…") in a component should resolve to a translated key.
const untranslated = new Map();
for (const file of readdirSync(COMPONENTS).filter((f) => f.endsWith(".tsx"))) {
  const source = readFileSync(join(COMPONENTS, file), "utf8");
  for (const m of source.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g)) {
    const key = m[1].replace(/\\"/g, '"');
    if (!everyKey.has(key)) {
      if (!untranslated.has(file)) untranslated.set(file, []);
      untranslated.get(file).push(key);
    }
  }
}

if (untranslated.size) {
  failed++;
  console.log(`\n✗ t() calls with no dictionary entry:`);
  for (const [file, keys] of untranslated) {
    console.log(`    ${file}: ${keys.slice(0, 5).join(" | ")}${keys.length > 5 ? ` …+${keys.length - 5}` : ""}`);
  }
}

console.log(`\n${failed ? `${failed} problem(s)` : `all good — ${everyKey.size} distinct strings translated`}`);
process.exit(failed ? 1 : 0);
