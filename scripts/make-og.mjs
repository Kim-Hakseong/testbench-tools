// Renders the social preview cards under apps/web/public/og/.
//
// Every card is 1200x630 — the size Slack, Discord, Reddit, X and Product Hunt
// all crop to. The HTML is written to a temp directory with the fonts inlined
// as data URIs so Chrome can render it straight off file:// with no server and
// no network, and the site keeps its "no external requests" property.
//
// Chrome is the one already installed on the machine; nothing is added to
// package.json. Cards are English only, matching the site's default language.
//
//   node scripts/make-og.mjs            # every page
//   node scripts/make-og.mjs crc-32     # just the slugs named
//
// Run it from the repo root after changing a tool's name or description.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const WEB = join(ROOT, "apps/web");
const OUT = join(WEB, "public/og");

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

/**
 * Reads the catalogue out of the TypeScript source.
 *
 * A regex over source is fragile in general, but tools-meta.ts is written one
 * entry per line in a fixed field order, and the count check below fails loudly
 * if that ever stops being true — better than silently producing half the cards.
 */
function readCatalogue() {
  const src = readFileSync(join(WEB, "content/tools-meta.ts"), "utf8");

  const categories = new Map();
  for (const m of src.matchAll(/\{ id: "([a-z-]+)", name: "([^"]+)"/g)) {
    categories.set(m[1], m[2]);
  }

  const tools = [];
  for (const line of src.split("\n")) {
    const slug = /slug: "([a-z0-9-]+)"/.exec(line);
    const name = /(?<!ko)[nN]ame: "([^"]+)"/.exec(line);
    const description = /(?<!ko)[dD]escription: "([^"]+)"/.exec(line);
    const category = /category: "([a-z-]+)"/.exec(line);
    if (!slug || !name || !description || !category) continue;
    tools.push({
      slug: slug[1],
      name: name[1],
      description: description[1],
      eyebrow: categories.get(category[1]) ?? "Tools",
      href: `/tools/${slug[1]}/`,
    });
  }

  if (categories.size < 8 || tools.length < 50) {
    throw new Error(
      `catalogue parse looks wrong: ${categories.size} categories, ${tools.length} tools`,
    );
  }
  return tools;
}

/**
 * Field notes. Their card slug is prefixed so a note can never collide with a
 * tool that happens to share a slug.
 */
function readNotes() {
  const src = readFileSync(join(WEB, "content/notes.ts"), "utf8");
  const notes = [];
  for (const m of src.matchAll(
    /slug: "([a-z0-9-]+)",\s*\n\s*title:\s*\n?\s*"([^"]+)",\s*\n\s*description:\s*\n?\s*"([^"]+)"/g,
  )) {
    notes.push({
      slug: `note-${m[1]}`,
      name: m[2],
      description: m[3],
      eyebrow: "Field note",
      href: `/notes/${m[1]}/`,
    });
  }
  return notes;
}

/** Pages that are not tools still get a card — they are what gets shared first. */
const STATIC_CARDS = [
  {
    slug: "default",
    name: "Every bench calculation, one tab away",
    description:
      "Calculators, decoders and converters for test & measurement, embedded and industrial work.",
    eyebrow: "Free engineering tools",
    href: "/",
  },
  {
    slug: "apps",
    name: "Desktop Apps",
    description:
      "Free, MIT-licensed desktop companions for heavier offline work: a Modbus master, a frame-level serial terminal, and a TDMS viewer.",
    eyebrow: "Downloads",
    href: "/apps/",
  },
  {
    slug: "notes",
    name: "Field notes",
    description:
      "Where a vendor manual and the obvious reading of it disagree — raw analog counts, protocol bit order, sensor curves. Every claim cited.",
    eyebrow: "Notes",
    href: "/notes/",
  },
  {
    slug: "about",
    name: "About TestBench.tools",
    description:
      "Why every calculation runs in your browser, and where the vendor constants come from.",
    eyebrow: "About",
    href: "/about/",
  },
];

// ---------------------------------------------------------------------------
// Card markup
// ---------------------------------------------------------------------------

function fontFace(family, file, weightRule) {
  const b64 = readFileSync(join(WEB, "public/fonts", file)).toString("base64");
  return `@font-face{font-family:"${family}";${weightRule}font-style:normal;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
}

const FONTS = [
  fontFace("Instrument Serif", "instrument-serif-latin.woff2", "font-weight:400;"),
  fontFace("Geist", "geist-latin-var.woff2", "font-weight:100 900;"),
  fontFace("Geist Mono", "geist-mono-latin-var.woff2", "font-weight:100 900;"),
].join("");

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Long tool names have to stay on one or two lines at a readable size, so the
 * type scale steps down as the name grows rather than letting it wrap forever.
 */
function titleSize(name) {
  if (name.length > 46) return 60;
  if (name.length > 30) return 72;
  return 84;
}

function card({ name, description, eyebrow }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONTS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px}
body{background:#f1f0ec;font-family:Geist,sans-serif;-webkit-font-smoothing:antialiased}
.frame{position:absolute;inset:40px;background:#fff;border:1px solid #d8d6ce;border-radius:24px;
  padding:56px 64px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:14px;flex:0 0 auto}
.mid{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center}
.foot-wrap{flex:0 0 auto}
.mark{font-family:"Instrument Serif",serif;font-size:30px;color:#201f1c;letter-spacing:-0.01em}
.mark span{color:#6f6e66}
.eyebrow{font-family:"Geist Mono",monospace;font-size:20px;color:#047a4e;
  text-transform:uppercase;letter-spacing:0.14em;margin-bottom:22px}
h1{font-family:"Instrument Serif",serif;font-size:${titleSize(name)}px;line-height:1.04;
  color:#201f1c;letter-spacing:-0.02em;max-width:19ch}
p{font-size:29px;line-height:1.42;color:#6f6e66;margin-top:22px;max-width:34ch}
.foot{font-family:"Geist Mono",monospace;font-size:20px;color:#6f6e66;
  display:flex;justify-content:space-between;align-items:center}
.rule{height:1px;background:#d8d6ce;margin-bottom:22px}
</style></head><body><div class="frame">
  <div class="top">
    <!-- No background plate: the card is already white, and the favicon's
         plate would read as a stray grey square at this size. -->
    <svg width="40" height="40" viewBox="2 6 28 20">
      <path d="M4 20h5V11h7v9h5v-5h7" fill="none" stroke="#047a4e" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="mark">TestBench<span>.tools</span></div>
  </div>
  <div class="mid">
    <div class="eyebrow">${escape(eyebrow)}</div>
    <h1>${escape(name)}</h1>
    <p>${escape(description)}</p>
  </div>
  <div class="foot-wrap">
    <div class="rule"></div>
    <div class="foot"><span>100% in-browser · no sign-up</span><span>testbench.tools</span></div>
  </div>
</div></body></html>`;
}

// ---------------------------------------------------------------------------

const only = new Set(process.argv.slice(2));
const cards = [...STATIC_CARDS, ...readNotes(), ...readCatalogue()].filter(
  (c) => only.size === 0 || only.has(c.slug),
);
if (cards.length === 0) throw new Error(`no card matches ${[...only].join(", ")}`);

mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "tb-og-"));

try {
  for (const [i, c] of cards.entries()) {
    const html = join(work, `${c.slug}.html`);
    writeFileSync(html, card(c));
    execFileSync(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1200,630",
        `--screenshot=${join(OUT, `${c.slug}.png`)}`,
        `file://${html}`,
      ],
      { stdio: "ignore" },
    );
    process.stdout.write(`\r${i + 1}/${cards.length} ${c.slug}`.padEnd(60));
  }
  console.log(`\n${cards.length} cards → apps/web/public/og/`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
