// Node built-in tests for the product (SKU image) data layer (no dependencies).
import { test } from "node:test"
import assert from "node:assert/strict"

import { buildUpsertPayload, chunk, resolveProducts, UPSERT_CHUNK_SIZE } from "../lib/products.ts"

test("buildUpsertPayload: validates, trims, and dedupes by SKU keeping the last row", () => {
  const { valid, skipped } = buildUpsertPayload([
    { sku: "Curl Activator Cream 500 ml", imageUrl: "https://cdn.shopify.com/a.jpg" },
    { sku: "  Pack Bombar 3 pec  ", imageUrl: " https://cdn.shopify.com/b.png " },
    { sku: "Curl Activator Cream 500 ml", imageUrl: "https://cdn.shopify.com/NEW.jpg" }, // dupe → keeps this one
    { sku: "", imageUrl: "https://cdn.shopify.com/c.jpg" }, // missing sku
    { sku: "No URL", imageUrl: "" }, // missing url
    { sku: "Bad URL", imageUrl: "ftp://nope.com/x.jpg" }, // non-http(s)
  ])
  assert.equal(valid.length, 2)
  assert.equal(skipped, 3)
  const cream = valid.find((p) => p.sku === "Curl Activator Cream 500 ml")
  assert.equal(cream.image_url, "https://cdn.shopify.com/NEW.jpg")
  assert.ok(valid.find((p) => p.sku === "Pack Bombar 3 pec"))
})

test("buildUpsertPayload: SKUs with commas/slashes/spaces are opaque keys", () => {
  const { valid, skipped } = buildUpsertPayload([
    { sku: "Pack Cebolla - 500 ml - 2 pec", imageUrl: "https://x.com/1.jpg" },
    { sku: "FR Pack Anti caida - Red- 2 pec", imageUrl: "http://x.com/2.jpg" },
  ])
  assert.equal(skipped, 0)
  assert.deepEqual(
    valid.map((p) => p.sku),
    ["Pack Cebolla - 500 ml - 2 pec", "FR Pack Anti caida - Red- 2 pec"],
  )
})

test("chunk splits into 500-row batches by default", () => {
  const rows = Array.from({ length: 1201 }, (_, i) => i)
  const parts = chunk(rows)
  assert.equal(UPSERT_CHUNK_SIZE, 500)
  assert.deepEqual(
    parts.map((p) => p.length),
    [500, 500, 201],
  )
  assert.deepEqual(chunk([], 500), [])
})

test("resolveProducts: network wins, cache is the offline fallback, else empty", () => {
  const net = [{ sku: "A", imageUrl: "https://x/a.jpg" }]
  const cache = { items: [{ sku: "B", imageUrl: "https://x/b.jpg" }], fetched_at: "2026-07-18T00:00:00Z" }

  assert.deepEqual(resolveProducts(net, cache), { items: net, source: "network" })
  assert.deepEqual(resolveProducts(null, cache), { items: cache.items, source: "cache" })
  assert.deepEqual(resolveProducts(null, null), { items: [], source: "none" })
  // corrupt cache shape → none
  assert.deepEqual(resolveProducts(null, { items: "nope", fetched_at: "" }), { items: [], source: "none" })
})
