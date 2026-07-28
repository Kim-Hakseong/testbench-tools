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
spec/                human-verified vendor constants, with sources (release gate)
```

## Development

Requires Node ≥ 20 and **pnpm** (never `npm install`).

```sh
pnpm install
pnpm -r test        # engine golden-vector suite (must stay green)
pnpm build          # static export → apps/web/out/
```

Disk cleanup when done:

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

## Deployment (human steps) — Cloudflare Pages

The site is a pure static export (~3 MB, no server functions), so it fits
Cloudflare Pages' free tier: **unlimited bandwidth, commercial use allowed**.
Hosting cost stays zero no matter how much traffic grows.

> Why not Vercel? Vercel's free (Hobby) plan forbids commercial use — running
> ads would require Pro ($20/mo). Vercel's real limit here isn't bandwidth
> (100 GB/mo free) but that ToS clause. Cloudflare Pages has no such
> restriction, which makes it the better fit for an ad-supported static site.

1. **Cloudflare Pages**: Dashboard → Workers & Pages → Create → Pages →
   Connect to Git → select this repo, then:
   - Build command: `pnpm build`
   - Build output directory: `apps/web/out`
   - Environment: no variables needed (Pages detects pnpm via the lockfile;
     if the build image needs a Node pin, set `NODE_VERSION` = `20`)
   Every push to `main` auto-deploys. Preview deployments per branch are free.
2. **Domain**: register `testbench.tools` at Porkbun with auto-renew ON.
   Two options — no conflict either way (registrar and hosting are
   independent; custom domains are a free feature with automatic HTTPS):
   - *Simplest*: move DNS to Cloudflare (free plan), then Pages → Custom
     domains → add `testbench.tools`. DNS + hosting + cert live in one place.
   - *Keep Porkbun DNS*: add a CNAME for the domain pointing at the
     `<project>.pages.dev` hostname shown in the Pages dashboard.
3. **Contact mail**: enable domain email forwarding for
   `contact@testbench.tools` → personal inbox (Cloudflare Email Routing or
   Porkbun forwarding — both free). No personal names anywhere on the site
   (asset-separation rule).

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
