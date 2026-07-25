# TestBench.tools

Free, ad-supported browser micro-tools for test & measurement, embedded and
industrial automation engineers. 100% client-side — no accounts, no uploads,
no servers. English at the root, Korean under `/ko/`.

## Repository layout

```
apps/web/            Next.js 14 App Router, static export (output: 'export')
  app/(en)/          English pages (hub, tools, apps, about/contact/privacy)
  app/(ko)/ko/       Korean pages (hub + PLC/sensor tools; XGT when unblocked)
  components/        UI components (ToolShell, AdSlot, HexInput, …)
  content/           tools-meta.ts (catalog), links.json (apps), ads.json (ads)
  design/tokens.css  design tokens (dark = Resend-lineage, light = monet-lineage)
  workers/           Web Workers (CRC deep search)
packages/engine/     pure-TS calculation engines + vitest golden-vector tests
  vectors/           golden vectors (DESIGN §9 — DO NOT EDIT)
spec/                human-verified vendor constants gate (CLAUDE.md §5-3)
```

## Development

Requires Node ≥ 20 and **pnpm** (never `npm install`).

```sh
pnpm install
pnpm -r test        # engine golden-vector suite (must stay green)
pnpm build          # static export → apps/web/out/
```

Disk cleanup when done (CLAUDE.md §7):

```sh
rm -rf node_modules apps/web/.next apps/web/out && pnpm store prune
```

### Correctness rules

- Golden vectors in `packages/engine/vectors/` are immutable. New engines get
  new vectors; existing values are never edited.
- Vendor constants (PLC raw ranges, XGT frames, thermocouple coefficients) are
  implemented **only** when recorded with a source in `spec/`. The XGT
  decoder/builder stays blocked until `spec/xgt-reference.md` is filled with
  manual example frames.

## Deployment (human steps)

1. **Vercel**: import the repo. Framework preset: Next.js.
   Build command `pnpm build`, output directory `apps/web/out`,
   install command `pnpm install`. Every page is static — no functions.
2. **Domain**: register `testbench.tools` at Porkbun with auto-renew ON.
   Point it at Vercel (CNAME `cname.vercel-dns.com` or Vercel nameservers) and
   set it as the production domain.
3. **Contact mail**: enable domain email forwarding (Porkbun) for
   `contact@testbench.tools` → personal inbox. No personal names anywhere on
   the site (asset-separation rule).

## Enabling ads (human steps)

Ads are OFF by default (`apps/web/content/ads.json` → `"provider": "none"`).
Slots render nothing until configured — never an empty frame.

- **EthicalAds (preferred, no cookie banner needed)**
  1. Apply at ethicalads.io with the deployed site.
  2. Set `{ "provider": "ethicalads", "ethicalads": { "publisher": "<id>" } }`.
  3. Rebuild + deploy. Script loads only when the publisher id is set.
- **AdSense (optional, requires consent management)**
  1. Verify the site in AdSense (About/Contact/Privacy pages already exist).
  2. Configure Google's CMP (EU consent) in the AdSense console first.
  3. Set `{ "provider": "adsense", "adsense": { "client": "ca-pub-…" } }`.

Placement is fixed in code: max 2 slots per page (below results,
mid-explainer), never inside the tool input/result area.

## Quality snapshot (W10, 2026-07-25)

Lighthouse 12.x, headless Chrome, mobile emulation, gzip static serving
(parity with production hosting):

| Page | Perf | A11y | Best Practices | SEO |
|---|---|---|---|---|
| `/` (hub) | 96 | 100 | 100 | 100 |
| `/tools/crc-16-modbus/` | 98 | 100 | 100* | 100 |
| `/tools/tdms-to-csv/` | 98 | 100 | 100* | 100 |
| `/ko/tools/pt100-calculator/` | 99 | 100 | 100* | 100 |

*measured 96 before the favicon fix landed; the only deduction was the
favicon 404, now resolved.

Engine tests: 66 passing (checksum/convert/modbus/identify/scaling/rtd/tdms
golden vectors). External requests in production build: fonts self-hosted,
zero third-party requests while ads are off.
