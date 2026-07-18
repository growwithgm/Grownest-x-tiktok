# TokFlow v2.1 — Supabase setup (human checklist)

The app code is done; these dashboard/ops steps must be performed by a person.

## 1. Supabase project (once)
- [ ] Project exists at https://supabase.com/dashboard (already created).
- [ ] **Disable self-signup:** Authentication → Sign In / Up → disable "Allow new users to sign up".
      The app has NO register flow — accounts are created by the admin only.
- [ ] **Create team users:** Authentication → Users → "Add user" → email + password
      (choose "Auto Confirm User"). One per team member.
- [ ] **Run the products migration:** SQL Editor → paste the contents of
      `supabase/migrations/0001_products.sql` → Run.
      Alternative (CLI): `supabase link --project-ref <ref>` then `supabase db push`.

## 2. Environment variables
From Dashboard → Project Settings → API:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key |

**Never use the service-role key anywhere in this app.**

- [ ] **Local:** copy `.env.local.example` → `.env.local`, fill both values.
- [ ] **Vercel:** Project → Settings → Environment Variables → add both for
      **Production AND Preview** → then **Redeploy** (env vars only apply to new builds).

Until the env vars are present, the app runs in "not configured" mode:
no login gate, SKU images page shows a friendly notice, slips fall back to the
locally cached product images. It never crashes.

## 3. Test account for e2e (optional but recommended)
- [ ] Create one extra Supabase user for testing (e.g. `e2e@grownest.es`).
- [ ] Set locally (and/or in CI): `TEST_SUPABASE_EMAIL`, `TEST_SUPABASE_PASSWORD`
      (see `.env.local.example`). With these set, `pnpm exec playwright test` runs the
      full login → product import → slips → sign-out flow; without them the auth spec
      skips with a warning.

## 4. First data load
- [ ] Sign in to the app → Settings → SKU images → drop
      `samples/Doncabello_SKU_Image_Import.csv` (87 products) → verify the list fills.
- [ ] If a browser still has old local SKU images, the page shows an
      "Upload local data to database" banner — click once, done.

## 5. Verify
- [ ] Logged-out visit to any page redirects to /login.
- [ ] Login works; sidebar shows your email + Sign out.
- [ ] Upload an orders CSV → slips show product images from the database.
- [ ] Pull the network cable and reload Results → slips still render, with an
      "offline copy of product images" chip.
