# PROJECT BRIEF — TokFlow by Grow Nest (TikTok Shop Order Printer)

## What this is
A Next.js 15 web app for GROW NEST / Don Cabello (Spanish TikTok Shop seller, hair-care brand).
It turns TikTok Shop order-export CSVs into printable packing slips and a Correos ATENEA
bulk-shipping CSV. Everything runs client-side in the browser (localStorage, no backend DB).

- **Repo:** github.com/growwithgm/Grownest-x-tiktok (branch workflow: feature branch → PR → Vercel preview green → merge to main)
- **Live:** grownest-x-tiktok-chi.vercel.app (Vercel auto-deploys from `main`)
- **Stack:** Next.js 15.5.20, React 19, Tailwind + shadcn/ui, Papa Parse, jsPDF/html2canvas, pnpm (pinned `pnpm@10.33.0`), TypeScript
- **Current version:** v2.1.0 — v2.0 work is live; v2.1 (Supabase) is in PR awaiting env-var setup.

## Everything completed so far (chronological)

1. **ATENEA CSV export fix (v1.1)** — the `packing_slips_*.csv` import into Correos ATENEA was broken
   (columns shifted, quoted commas, UTF-8 BOM mojibake). Rebuilt as `lib/atenea-csv.ts`:
   columns resolved **by header name** (not position), fields sanitized (commas/control chars → space,
   smart punctuation transliterated, description capped at 140 chars), **never quoted**, phone `(+34)`+9 digits,
   ZIP padded to 5 digits, encoded **windows-1252, no BOM, LF** via a manual byte encoder.
   Hard invariant: exactly 9 commas per line or the download is blocked with the bad row shown.

2. **Next.js security update + dependency hygiene** — next 15.2.4 → 15.5.20 (CVE-2025-66478);
   removed a wrong npm package-lock.json, committed a real `pnpm-lock.yaml`, pinned `packageManager`,
   `pnpm.onlyBuiltDependencies=[core-js, sharp]`, removed unused recharts, vaul → 1.1.2 (zero peer warnings).

3. **Same-buyer order merging (v1.2)** — ATENEA CSV merges orders per **buyer account**
   (normalized Buyer Username; phone-digits fallback). Weights summed, **Reference = oldest order ID**,
   packing slip header lists ALL merged order IDs. **Address-conflict guard:** same buyer but different
   address (zip+street+house) → separate shipments + UI notice
   («buyer» — orders to N different addresses, kept as separate shipments).
   Toggle on Results page, default ON; OFF = strict per-order rows.

4. **TokFlow v2.0 full redesign** — from an uploaded design file: dark monochrome theme (#09090B/#FAFAFA),
   Newsreader serif display headings, Geist body + Geist Mono accents, sidebar app shell
   (Workflow / Convert / System), white pill buttons. Printed slips remain ink-on-white.

5. **Two new Convert tools** —
   - **Ship File converter** (/ship-file): Amazon tracking `.txt` → TikTok Shop Ship File `.xlsx`
     (Order ID / Carrier / Tracking ID), carrier names normalized (correos→Correos, gls→GLS Spain, etc.),
     xlsx built by a dependency-free writer (`lib/xlsx-lite.ts`).
   - **FBT Filter** (/fbt-filter): remove any fulfillment type (e.g. Fulfilled-by-TikTok rows) from an
     order export, download cleaned CSV.

6. **Built-in packing slip templates** — 4 templates seeded automatically; **"TikTok Shop Pro"
   (client's own HTML/CSS design) is the DEFAULT**. Others: Grow Nest Classic (ivory serif),
   Minimal Mono (typewriter), Compact A5 (half-page + QR slot). Template engine supports
   `{{total_weight}}` / `{{item_weight}}` plus all prior variables.

7. **Auto column mapping** — uploading a CSV skips the Map Columns screen entirely: headers auto-resolve
   (Buyer Username, Order ID, Recipient, Phone #, Street Name, House Name or Number, Zipcode, Weight(kg)…),
   slips generate immediately, user lands on Results. Manual Map Columns screen remains as fallback
   (only if headers can't be resolved) and lives under Settings.

8. **SKU images simplified** — page now has ONE source: CSV import (`SKU, IMAGE URL` columns,
   matching Doncabello_SKU_Image_Import.csv; keys = Seller SKU names). Manual tabs removed.
   Images show on slips automatically.

9. **UI simplification (latest)** — removed: Download PDF button, AI PDF Analyzer button,
   the 01/02/03 workflow stepper. PDFs are made via **Print All → browser Save as PDF**
   (uses the selected template). Sidebar final: Workflow (Dashboard, Upload Orders, Results) ·
   Convert (Ship File, FBT Filter) · System (Settings only — Map columns/Templates/SKU images
   are cards inside Settings).

## Key files
- `lib/atenea-csv.ts` — ATENEA CSV engine (sanitizers, cp1252 encoder, merge/buildShipments, column resolution)
- `lib/auto-mapping.ts` — automatic header→field mapping + one-shot upload pipeline
- `lib/builtin-templates.ts` — 4 built-in slip templates + localStorage seeding (default: TikTok Shop Pro)
- `lib/converters.ts` + `lib/xlsx-lite.ts` — Ship File / FBT Filter logic + zero-dep xlsx writer
- `lib/csv-processor.ts` — order rows → packing slip data (groups per buyer+address, all order IDs on slip)
- `app/results/page.tsx` — Results page (merge toggle, notices, CSV download)
- `components/layout/app-shell.tsx` — sidebar/topbar shell
- `components/template-renderer.tsx` + `lib/html-to-pdf.ts` — template rendering (screen + print)

## Testing (all green)
- **36-ish unit tests** (`pnpm test`, Node built-in runner, zero deps): ATENEA formatting/encoding,
  merging, auto-mapping (tested against the real 61-column To_Ship export), converters, xlsx writer.
- **Playwright e2e** (`pnpm exec playwright test`): upload fixture → auto-map → Results → download CSV →
  byte-validates windows-1252/no-BOM/9-commas/merge/guard-notice → merge-toggle-OFF per-order check.
- Local build needs `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` if Google Fonts is blocked; Vercel builds fine.

## Data formats (important)
- **Input:** TikTok Shop "To_Ship" order export CSV (61 columns; key headers listed above; values may carry stray tabs — trimmed).
- **ATENEA output:** 10 columns exactly — Recipient name, Phone, e-mail, address, ZIP, country("España"),
  Reference, additional address (line 2 or duplicate of line 1), description(≤140), Weight "X.XX".
  Unquoted, comma-free fields, windows-1252, no BOM, LF.
- **SKU images CSV:** `SKU, IMAGE URL` (SKU = Seller SKU names like "Curl Activator Cream 500 ml").

## Conventions / gotchas
- Work branch: `claude/atenea-csv-packing-slips-5gilkk` — restart from origin/main after each merged PR.
- Never quote/BOM the ATENEA CSV; never break the 9-comma invariant; slip printing must stay black-on-white.
- All state is localStorage — "Delete all data" in sidebar wipes it.
- PRs #2–#9 all merged; production is up to date with everything described here.

## v2.1 — Supabase (login + shared product database)
- **Auth:** email/password via Supabase (`@supabase/ssr` cookie sessions). `middleware.ts`
  gates every route except /login; no signup flow (admin creates users in the dashboard).
  Sidebar shows the signed-in email + Sign out. Unconfigured env → graceful pass-through
  ("Supabase not configured" states, no crash).
- **Products table:** `supabase/migrations/0001_products.sql` (sku unique, image_url,
  updated_at; RLS full access for authenticated). SKU images page = CSV import →
  validated, deduped-by-SKU, chunked (500) UPSERTs with imported/updated/skipped counts;
  searchable list, per-row delete, Delete All; one-time "upload local data" banner for
  legacy localStorage images.
- **Slips & offline:** product images cached in localStorage (`products_cache`), refreshed
  on upload and on Results load; printing never blocks on the network — an "offline copy"
  chip shows when the cache is used. Everything else (templates, settings, mappings,
  orders) stays in localStorage.
- **Tests/docs:** unit tests for payload builder/chunking/cache resolver; e2e login helper
  (TEST_SUPABASE_EMAIL/PASSWORD; auth spec skips without them); SETUP.md human checklist;
  .env.local.example. Version v2.1.0.

## Possible next steps (not started)
- Ship File converter: real TikTok template .xlsx passthrough (hidden sheets/dropdown preservation)
- Settings: business profile fields (name/return address on slips), real QR codes on Compact A5
- Search bar in topbar is decorative (no search backend yet)
