import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  use: {
    baseURL: "http://127.0.0.1:3111",
    // Use the environment's pre-installed Chromium when the pinned Playwright
    // browser build is unavailable (e.g. sandboxed CI containers).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: "npm run start -- -p 3111",
    url: "http://127.0.0.1:3111",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
