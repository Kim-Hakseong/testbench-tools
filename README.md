# TestBench.tools

Free browser tools for test & measurement, embedded and industrial automation
work: CRC calculators, Modbus and MIL-STD-1553B frame decoders, PLC address
converters for Siemens, Mitsubishi, Allen-Bradley and LS, sensor math, and file
converters.

**https://testbench.tools**

Every calculation runs in the browser. The site is a static export — there is no
API and no upload endpoint, so there is nowhere for your data to go even if
someone wanted it to. English at the root, with `/ko/`, `/ja/`, `/de/` and
`/zh/` for the interface.

## Why the source is worth reading

The point of publishing this is that you can check the arithmetic instead of
trusting it.

- **The engine is isolated and tested.** `packages/engine` is plain TypeScript
  with no dependencies, and every module ships golden vectors under
  `packages/engine/vectors/`.
- **Vendor constants are traced, not guessed.** Every PLC raw range, thermocouple
  coefficient and protocol frame here is recorded in `spec/` with the manual it
  came from — document number, revision, and the table it was read out of. Where
  a value could not be traced to a primary source it is recorded as blocked and
  the preset does not ship. `spec/` also lists the transcription hazards found
  along the way, including a vendor manual whose footnote contradicts its own
  table by a factor of four.
- **Where sources genuinely disagree, both are shown.** Public documentation
  numbers ARINC 429 label bits in opposite directions depending on who you read,
  so the decoder makes it a setting and always reports both readings rather than
  quietly picking one.

## Layout

```
apps/web/            Next.js 14 App Router, static export (output: 'export')
  app/(en)/          English pages — hub, tools, apps, about/contact/privacy
  app/(ko|ja|de|zh)/ localised routes
  components/        tool UIs; the engine does the maths, these only render it
  content/           tools-meta.ts (catalogue), i18n, ads.json, links.json
  design/tokens.css  design tokens
  workers/           Web Workers (CRC deep search)
packages/engine/     pure TypeScript calculations + vitest golden vectors
  vectors/           golden vectors — immutable, never edited in place
spec/                sourcing evidence for every vendor constant (release gate)
scripts/             translation coverage check, social card generator
```

## Running it

Requires Node ≥ 20 and [pnpm](https://pnpm.io). `npm install` is not supported —
the workspace is pinned.

```sh
pnpm install
pnpm dev                         # http://localhost:3000
pnpm -r test                     # engine golden vectors
pnpm build                       # static export → apps/web/out/
node scripts/check-tool-i18n.mjs # translation coverage
node scripts/make-og.mjs         # regenerate social preview cards
```

Social cards are generated on demand rather than during the build, so rerun
`make-og.mjs` after changing a tool's name or description.

Disk cleanup:

```sh
rm -rf node_modules apps/web/.next apps/web/out && pnpm store prune
```

### Correctness rules

- Golden vectors are immutable. New engines get new vectors; existing values are
  never edited to make a test pass.
- A vendor constant is implemented **only** when it is recorded in `spec/` with
  its source. No source, no preset — a raw range that is wrong by a factor of
  four silently miscalibrates a process, which is the failure this gate exists
  to prevent.

## Deployment

The static export has no server functions, so it runs on any static host.
Production is Cloudflare Pages:

- Build command: `pnpm build`
- Build output directory: `apps/web/out`
- No environment variables required

Every push to `main` deploys.

## Ads

Ads are off by default (`apps/web/content/ads.json` → `"provider": "none"`).
Slots render nothing at all until a provider is configured — never an empty
frame. EthicalAds is preferred because it does not track, so no cookie banner is
needed; AdSense requires Google's CMP to be configured first.

Placement is fixed in code: at most two slots per page, below the results and
mid-explainer, never inside the tool's input or result area.

## Desktop apps

Heavier offline work — multi-gigabyte files, live serial ports, batch jobs — is
handled by three free MIT-licensed desktop apps, each in its own repository:

- [Modbus Workbench](https://github.com/Kim-Hakseong/testbench-modbus-workbench) — Modbus RTU/TCP master with polling, writes and a built-in slave simulator
- [FrameTerm](https://github.com/Kim-Hakseong/testbench-frameterm) — serial terminal built for frame-level protocol work
- [TDMS Converter](https://github.com/Kim-Hakseong/testbench-tdms-converter) — viewer and CSV converter for NI TDMS measurement files

## Contributing

Corrections to the engineering are the most useful thing you can send. If a
constant is wrong, cite the manual — that is the standard everything here is
held to, and a citation makes the fix reviewable in minutes.

## License

MIT — see [LICENSE](LICENSE). Bundled fonts and the standards documents cited in
`spec/` are not covered by it; see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

---

© 2026 TestBench.tools · MIT licensed — free and open source.
