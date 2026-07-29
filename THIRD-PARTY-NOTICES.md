# Third-party notices

The MIT license in [LICENSE](LICENSE) covers the code and the writing in this
repository. It does not cover the material below.

## Bundled fonts

Three font files are committed under `apps/web/public/fonts/` so the site makes
no external font requests. They are not ours and are not MIT licensed — each is
under the SIL Open Font License 1.1, which permits bundling and redistribution
but has its own conditions, including that the fonts may not be sold on their
own.

| File | Family | Copyright | License |
|---|---|---|---|
| `instrument-serif-latin.woff2` | Instrument Serif | Copyright 2022 The Instrument Serif Project Authors — https://github.com/Instrument/instrument-serif | OFL-1.1 |
| `geist-latin-var.woff2` | Geist | Copyright 2024 The Geist Project Authors — https://github.com/vercel/geist-font | OFL-1.1 |
| `geist-mono-latin-var.woff2` | Geist Mono | Copyright 2024 The Geist Project Authors — https://github.com/vercel/geist-font | OFL-1.1 |

The full OFL 1.1 text ships with each font upstream at the URLs above.

## Standards data and vendor constants

Files under `spec/` record where each implemented constant came from —
manufacturer manuals, NIST publications, published datasheets — with document
numbers and revisions. Those source documents belong to their publishers and are
cited, not redistributed. The numeric values themselves are facts and are
implemented as such; the surrounding explanation is ours and is MIT licensed.

Where a value could not be traced to a primary source, it is recorded in `spec/`
as blocked and is deliberately not implemented.

## Trademarks

TDMS, MELSEC, SIMATIC, Allen-Bradley, Modbus, XGT, Keysight, Fluke, Keithley,
Siglent, Vishay and other product names are trademarks of their respective
owners. They appear here only to identify the formats, protocols, modules and
instruments these tools work with. TestBench.tools is independent and is not
affiliated with, endorsed by or sponsored by any of them. The MIT license grants
no rights to any trademark.
