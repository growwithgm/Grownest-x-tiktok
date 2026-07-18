# TokFlow by Grow Nest (TikTok Shop Order Printer)

**v2.0 "monochrome"** — full redesign to the TokFlow design language: dark
near-black UI (#09090B) with off-white ink, Newsreader serif display
headings, Geist body and Geist Mono accents, a persistent sidebar
(Workflow · Convert · System) and a three-step workflow (Upload → Map
columns → Generate). Printed packing slips remain ink-on-white.

The redesign also adds two client-side Convert tools:

- **Ship File converter** — turn an Amazon tracking `.txt` export
  (tab-separated `order-id`, `carrier-name`, `tracking-number`) into a TikTok
  Shop Ship File `.xlsx` (Order ID / Carrier / Tracking ID; carrier names
  normalized to TikTok's dropdown, e.g. correos → Correos, gls → GLS Spain).
  The `.xlsx` is produced by a dependency-free writer (`lib/xlsx-lite.ts`).
- **FBT Filter** — remove Fulfilled-by-TikTok rows (or any fulfillment type)
  from a Shop order export and download the cleaned CSV.

Next.js warehouse tool for GROW NEST / Don Cabello fulfillment. It takes a
**TikTok Shop order export CSV** (columns like `Order ID`, `Product Name`,
`Recipient`, `Phone #`, `Zipcode`, `Street Name` / `Detail Address`,
`House Name or Number`, `Weight (Kg)`, …), groups rows per customer, and
produces:

- **Printable packing slips** (print view + three PDF generators, incl. custom templates)
- **`packing_slips_YYYY-MM-DD_HH-MM.csv`** — a 10-column shipment manifest
  imported into **Correos ATENEA** (bulk admission) through a saved template

All processing happens in the browser; uploaded data lives in `localStorage`.

## ATENEA CSV format (v1.1.0)

`Recipient name, Recipient Phone, Recipient e-mail, Recipient address,
Recipient ZIP code, Recipient country, Reference, Recip. additional address,
Package Description, Weight (Kg)`

ATENEA's saved template has **no text qualifier** and reads
**ISO-8859-15**, so the file is generated as:

- comma-separated, **never quoted** — commas inside fields are replaced by spaces
- **windows-1252** bytes (ISO-8859-15-compatible for Spanish), **no BOM**, LF line endings
- ZIP always 5 digits (leading zeros restored), phone `(+34)` + 9 digits,
  weight `X.XX`, description sanitized/transliterated and capped at 140 chars
- `Recip. additional address` = address line 2 (`House Name or Number`),
  or a duplicate of the address when the input has no line 2
- hard invariant: **exactly 9 commas per line** — a violating row blocks the
  download and is shown in an error instead of silently exporting a bad file

## What broke (fixed 2026-07-17, v1.1.0)

The exporter in `app/results/page.tsx` addressed the input by **hard-coded
column numbers** (ZIP = col 46, address = col 47, additional = col 48). A
TikTok Shop export layout change shifted those positions, so the generated
file had the ZIP in the address column, an empty ZIP column, and the real
street in the additional-address column — ATENEA rejected every row
("Recipient's population is empty" / "postal code does not exist"). On top of
that the old exporter RFC-quoted fields containing commas (ATENEA parses
quotes literally and the embedded commas shifted all columns) and emitted
UTF-8 with BOM (read as ISO-8859-15 → "VerÃ³nica" mojibake on labels).

The fix (`lib/atenea-csv.ts`):

- columns are resolved **by header name** (saved column-mapping first, then
  known TikTok header candidates, legacy indices only as last resort)
- unquoted output with full field sanitization and the 9-comma invariant
- manual windows-1252 encoder (browsers' `TextEncoder` is UTF-8-only), no BOM

Other outputs (PDF generators, print view, SKU image import) are untouched.

## Same-buyer order merging (v1.2.0)

The ATENEA CSV **merges by buyer account; different addresses ship
separately**. Orders are grouped by normalized Buyer Username (trimmed,
TikTok's trailing tab stripped, lowercased; empty usernames fall back to the
phone's digits). Each merged shipment sums the weights, uses the **oldest
order's ID as Reference**, and the packing slip lists every merged order ID.
Within one buyer, orders whose shipping address (zip + street + house)
differs are kept as separate shipments — one parcel carries one address — and
the app shows a notice («buyer» — orders to N different addresses, kept as
separate shipments). A toggle on the results page (default **ON**) controls
merging; switched OFF the CSV emits strict per-order rows.

## Architecture: Supabase vs localStorage (v2.1.0)

The app is login-protected via **Supabase Auth** (email/password, self-signup
disabled — accounts are created by the admin in the dashboard). `middleware.ts`
requires a session on every route except `/login`. Product data (SKU → image
URL) lives in the shared Supabase **`products`** table
(`supabase/migrations/0001_products.sql`, RLS: any authenticated user has full
access; the service-role key is never used).

| Data | Where |
|---|---|
| Auth session | Supabase (cookies via @supabase/ssr) |
| Products / SKU images | Supabase `products` table + localStorage `products_cache` fallback |
| Templates, settings, column mappings, uploaded orders, generated slips | localStorage (unchanged) |

Slips read product images from the cache so printing never blocks on the
network; Results shows an "offline copy" chip when the last fetch failed.
Without `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` the app
degrades gracefully ("not configured" states, no crash). Setup checklist:
**SETUP.md**. E2E now uses `TEST_SUPABASE_EMAIL` / `TEST_SUPABASE_PASSWORD`
(auth specs skip if absent).

## Dependencies (v1.1.1, 2026-07-17)

- **next 15.5.20** — security upgrade from 15.2.4 (CVE-2025-66478, deprecated
  on npm). Latest patched 15.x; the 16.x major is deliberately not taken here.
- **pnpm is the package manager** (pinned via `packageManager`; lockfile is
  `pnpm-lock.yaml`). An npm `package-lock.json` briefly committed in `e140d44`
  made Vercel resolve the vulnerable Next.js pin — it has been removed; don't
  commit npm/yarn lockfiles.
- `pnpm.onlyBuiltDependencies` approves the `sharp` and `core-js` postinstall
  scripts that pnpm v10 blocks by default (sharp needs its native binaries for
  `next/image`).
- **recharts removed** — it was only referenced by the unused shadcn
  boilerplate `components/ui/chart.tsx` (deleted); no chart is rendered anywhere.
- **vaul 1.1.2** (was 0.9.x) — clears the only React 19 peer-dependency
  warning; its sole consumer is the unused shadcn drawer component.
- No peer-dependency warnings remain on a clean `pnpm install`.

## Development

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm test             # Node unit tests for the ATENEA CSV generator (no deps)
pnpm exec playwright test   # end-to-end: upload → map → results → download → byte-validate
```

Unit tests live in `tests/atenea-csv.test.mjs` (run directly by Node ≥ 22.18
via built-in TypeScript type stripping). The e2e spec
(`tests/e2e/atenea-export.spec.mjs`) uses the fixture
`tests/fixtures/tiktok-orders.csv`; set `PLAYWRIGHT_CHROMIUM_PATH` to a
Chromium binary if the pinned Playwright browser build is not installed.
