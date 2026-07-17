// End-to-end: upload a TikTok Shop order export, map columns, generate the
// ATENEA packing_slips CSV, and byte-validate the downloaded file.
import { test, expect } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.join(here, "..", "fixtures", "tiktok-orders.csv")
const shots = path.join(here, "..", "..", "test-results")

test("ATENEA CSV export produces unquoted, cp1252, 10-column output", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })

  // Upload
  await page.goto("/upload")
  await page.setInputFiles('input[type="file"]', fixture)
  await page.getByRole("button", { name: "Continue to Column Mapping" }).click()
  await page.waitForURL("**/map-columns")

  // Map columns (TikTok auto-detection) and process
  await page.getByRole("button", { name: "Auto-Detect Columns" }).click()
  await page.getByRole("button", { name: "Process CSV with Mapping" }).click()
  await page.waitForURL("**/results", { timeout: 60_000 })
  await expect(page.getByText("Generated Packing Slips")).toBeVisible()

  // Screenshots at desktop and mobile widths
  await page.screenshot({ path: path.join(shots, "results-1280.png"), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: path.join(shots, "results-390.png"), fullPage: true })
  await page.setViewportSize({ width: 1280, height: 800 })

  // Download the ATENEA CSV
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^packing_slips_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/)

  const bytes = fs.readFileSync(await download.path())

  // D4: windows-1252 bytes, no UTF-8 BOM, LF-only line endings
  expect([...bytes.subarray(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf])
  expect(bytes.subarray(0, 14).toString("latin1")).toBe("Recipient name")
  expect(bytes.includes(0x0d)).toBe(false)
  // "Verónica" must be single-byte ó (0xF3), "Peña" single-byte ñ (0xF1)
  expect(bytes.includes(Buffer.from("Ver\xf3nica", "latin1"))).toBe(true)
  expect(bytes.includes(Buffer.from("Pe\xf1a", "latin1"))).toBe(true)

  const text = bytes.toString("latin1")

  // D3: no quotes anywhere
  expect(text.includes('"')).toBe(false)

  // Hard invariant: every line has exactly 9 commas (10 columns)
  const lines = text.trimEnd().split("\n")
  for (const line of lines) {
    expect(line.split(",").length - 1, `bad comma count: ${line}`).toBe(9)
  }

  // Header + 3 grouped recipients (Reina's two order rows merge into one)
  expect(lines).toHaveLength(4)
  const rows = lines.slice(1).map((l) => l.split(","))
  const byName = Object.fromEntries(rows.map((r) => [r[0], r]))

  // D1/D2: col4 = street, col5 = ZIP, col8 = real address line 2
  const veronica = byName["Ver\xf3nica Mazo cabeza"]
  expect(veronica[3]).toBe("Satsuma 10")
  expect(veronica[4]).toBe("41006")
  expect(veronica[7]).toBe("2\xb0c")
  expect(veronica[9]).toBe("1.53")
  expect(veronica[8].length).toBeLessThanOrEqual(140)
  expect(veronica[8].endsWith("...")).toBe(true)

  const reina = byName["Reina luz Maldonado"]
  expect(reina[3]).toBe("Plaza Santiago")
  expect(reina[4]).toBe("09400")
  expect(reina[7]).toBe("8 4B")
  expect(reina[9]).toBe("3.00") // 1.50 + 1.50 summed across her two rows
  expect(reina[1]).toBe("(+34)642549408")

  const maria = byName["Mar\xeda Pe\xf1a"]
  expect(maria[4]).toBe("07760") // leading zero restored
  expect(maria[7]).toBe(maria[3]) // no line 2 in input → duplicate of address 1
  expect(maria[1]).toBe("(+34)612345678")
})
