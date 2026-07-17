# Grow Nest – Order Printer (TikTok Shop)

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

## Development

```bash
npm install --legacy-peer-deps
npm run dev           # http://localhost:3000
npm test              # Node unit tests for the ATENEA CSV generator (no deps)
npx playwright test   # end-to-end: upload → map → results → download → byte-validate
```

Unit tests live in `tests/atenea-csv.test.mjs` (run directly by Node ≥ 22.18
via built-in TypeScript type stripping). The e2e spec
(`tests/e2e/atenea-export.spec.mjs`) uses the fixture
`tests/fixtures/tiktok-orders.csv`; set `PLAYWRIGHT_CHROMIUM_PATH` to a
Chromium binary if the pinned Playwright browser build is not installed.
