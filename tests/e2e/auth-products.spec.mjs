// End-to-end: Supabase auth + shared product database. Requires a configured
// Supabase project plus TEST_SUPABASE_EMAIL / TEST_SUPABASE_PASSWORD — skipped
// with a warning otherwise.
import { test, expect } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ensureSignedIn, hasTestAccount } from "./helpers.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const sampleCsv = path.join(here, "..", "..", "samples", "Doncabello_SKU_Image_Import.csv")
const ordersCsv = path.join(here, "..", "fixtures", "tiktok-orders.csv")

if (!hasTestAccount) {
  console.warn(
    "[auth-products.spec] SKIPPED — set TEST_SUPABASE_EMAIL and TEST_SUPABASE_PASSWORD " +
      "(plus NEXT_PUBLIC_SUPABASE_* env vars) to run the auth + product DB flow.",
  )
}

test.skip(!hasTestAccount, "TEST_SUPABASE_EMAIL / TEST_SUPABASE_PASSWORD not set")

test("login → import product CSV → products listed → slips use DB images → sign out", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })

  // Unauthenticated hit is bounced to /login
  await page.goto("/")
  await page.waitForURL("**/login")
  await ensureSignedIn(page)

  // Import the sample product CSV into the shared database
  await page.goto("/sku-images")
  await page.setInputFiles('input[type="file"]', sampleCsv)
  await expect(page.getByText(/Import complete/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText("87", { exact: true })).toBeVisible({ timeout: 30_000 })

  // Upload orders — slips should pick image URLs from the DB-backed cache
  await page.goto("/upload")
  await page.setInputFiles('input[type="file"]', ordersCsv)
  await page.getByRole("button", { name: "Generate packing slips" }).click()
  await page.waitForURL("**/results", { timeout: 60_000 })
  const dbImage = page.locator('img[src*="cdn.shopify.com"]').first()
  await expect(dbImage).toBeAttached({ timeout: 30_000 })

  // Sign out returns to /login and the app stays gated
  await page.getByRole("button", { name: "Sign out" }).click()
  await page.waitForURL("**/login", { timeout: 30_000 })
  await page.goto("/results")
  await page.waitForURL("**/login")
})
