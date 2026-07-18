// Shared e2e helpers. When TEST_SUPABASE_EMAIL / TEST_SUPABASE_PASSWORD are
// set, specs sign in through /login first (required once Supabase env vars
// are configured, because the middleware gates every route). Without them,
// the suite only works against an unconfigured build (no auth gating).
export const TEST_EMAIL = process.env.TEST_SUPABASE_EMAIL
export const TEST_PASSWORD = process.env.TEST_SUPABASE_PASSWORD
export const hasTestAccount = Boolean(TEST_EMAIL && TEST_PASSWORD)

export async function ensureSignedIn(page) {
  if (!hasTestAccount) return
  await page.goto("/login")
  // Already signed in → middleware bounces /login to /
  if (!page.url().includes("/login")) return
  await page.getByLabel("Email").fill(TEST_EMAIL)
  await page.getByLabel("Password").fill(TEST_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })
}
