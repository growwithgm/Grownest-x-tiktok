// Product (SKU → image URL) data layer: Supabase `products` table with a
// localStorage cache so slip generation and printing never hard-block on the
// network. SKUs are opaque text keys (Seller SKU display names — may contain
// commas, slashes, spaces).
import type { SupabaseClient } from "@supabase/supabase-js"

export interface ProductImage {
  sku: string
  imageUrl: string
}

export const PRODUCTS_CACHE_KEY = "products_cache"
const LEGACY_KEY = "skuImages"
export const UPSERT_CHUNK_SIZE = 500

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested, no Supabase / DOM dependencies)
// ---------------------------------------------------------------------------

export interface UpsertPayloadResult {
  valid: Array<{ sku: string; image_url: string }>
  skipped: number
}

// Validate + normalize CSV rows into upsert records: both fields required,
// URL must be http(s), duplicates deduped by SKU keeping the LAST occurrence.
export function buildUpsertPayload(rows: Array<{ sku?: unknown; imageUrl?: unknown }>): UpsertPayloadResult {
  const bySku = new Map<string, string>()
  let skipped = 0
  for (const row of rows) {
    const sku = String(row.sku ?? "").trim()
    const imageUrl = String(row.imageUrl ?? "").trim()
    if (!sku || !/^https?:\/\//i.test(imageUrl)) {
      skipped++
      continue
    }
    bySku.set(sku, imageUrl)
  }
  return {
    valid: [...bySku.entries()].map(([sku, image_url]) => ({ sku, image_url })),
    skipped,
  }
}

export function chunk<T>(items: T[], size: number = UPSERT_CHUNK_SIZE): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export interface ProductsCachePayload {
  items: ProductImage[]
  fetched_at: string
}

export type ProductsSource = "network" | "cache" | "none"

// Decide what product data to use: fresh network data when available,
// otherwise the last cached copy (flagged so the UI can show an
// "offline copy" chip), otherwise nothing.
export function resolveProducts(
  fetched: ProductImage[] | null,
  cache: ProductsCachePayload | null,
): { items: ProductImage[]; source: ProductsSource } {
  if (fetched) return { items: fetched, source: "network" }
  if (cache && Array.isArray(cache.items)) return { items: cache.items, source: "cache" }
  return { items: [], source: "none" }
}

// ---------------------------------------------------------------------------
// Supabase-backed operations (browser)
// ---------------------------------------------------------------------------

export async function fetchAllProducts(supabase: SupabaseClient): Promise<ProductImage[]> {
  const pageSize = 1000
  const items: ProductImage[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("sku, image_url")
      .order("sku")
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      items.push({ sku: row.sku, imageUrl: row.image_url })
    }
    if (!data || data.length < pageSize) break
  }
  return items
}

export interface UpsertCounts {
  imported: number
  updated: number
  skipped: number
}

export async function upsertProducts(
  supabase: SupabaseClient,
  payload: UpsertPayloadResult,
): Promise<UpsertCounts> {
  // Count how many SKUs already exist so we can report imported vs updated
  const existing = new Set<string>()
  for (const part of chunk(payload.valid.map((p) => p.sku))) {
    const { data, error } = await supabase.from("products").select("sku").in("sku", part)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) existing.add(row.sku)
  }

  for (const part of chunk(payload.valid)) {
    const { error } = await supabase
      .from("products")
      .upsert(
        part.map((p) => ({ ...p, updated_at: new Date().toISOString() })),
        { onConflict: "sku" },
      )
    if (error) throw new Error(error.message)
  }

  const updated = payload.valid.filter((p) => existing.has(p.sku)).length
  return { imported: payload.valid.length - updated, updated, skipped: payload.skipped }
}

// ---------------------------------------------------------------------------
// Cache (localStorage) — slips must render even when the network is down
// ---------------------------------------------------------------------------

export function readProductsCache(): ProductsCachePayload | null {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.items)) return parsed
    return null
  } catch {
    return null
  }
}

export function writeProductsCache(items: ProductImage[]): void {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ items, fetched_at: new Date().toISOString() }))
  } catch (error) {
    console.error("Failed to write products cache:", error)
  }
}

// Fetch from Supabase and refresh the cache; on failure fall back to the
// cached copy. Never throws.
export async function loadProductsWithCache(
  supabase: SupabaseClient | null,
): Promise<{ items: ProductImage[]; source: ProductsSource }> {
  let fetched: ProductImage[] | null = null
  if (supabase) {
    try {
      fetched = await fetchAllProducts(supabase)
      writeProductsCache(fetched)
    } catch (error) {
      console.error("Failed to fetch products, falling back to cache:", error)
    }
  }
  return resolveProducts(fetched, readProductsCache())
}

// SKU → imageUrl map used by the slip processor. Reads the Supabase-backed
// cache first, then the legacy localStorage import as a fallback.
export function readProductImagesMap(): Record<string, string> {
  const map: Record<string, string> = {}
  const cache = readProductsCache()
  if (cache && cache.items.length > 0) {
    for (const item of cache.items) map[item.sku] = item.imageUrl
    return map
  }
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]")
    if (Array.isArray(legacy)) {
      for (const item of legacy) {
        if (item?.sku && item?.imageUrl) map[item.sku] = item.imageUrl
      }
    }
  } catch {
    // ignore corrupt legacy data
  }
  return map
}

// Legacy migration helpers: local skuImages → products table (one-time)
export function readLegacyImages(): ProductImage[] {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]")
    if (!Array.isArray(legacy)) return []
    return legacy.filter((i) => i?.sku && i?.imageUrl).map((i) => ({ sku: i.sku, imageUrl: i.imageUrl }))
  } catch {
    return []
  }
}

export function clearLegacyImages(): void {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // ignore
  }
}
