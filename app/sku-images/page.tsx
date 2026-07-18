"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Papa from "papaparse"
import { Search, Trash2, Upload, Loader2, CloudUpload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"
import {
  buildUpsertPayload,
  clearLegacyImages,
  fetchAllProducts,
  readLegacyImages,
  upsertProducts,
  writeProductsCache,
  type ProductImage,
} from "@/lib/products"

interface ProductRow extends ProductImage {
  updatedAt: string | null
}

export default function SkuImagesPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const configured = isSupabaseConfigured()

  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState("")
  const [legacyCount, setLegacyCount] = useState(0)

  const loadProducts = useCallback(async () => {
    if (!configured) return
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const pageSize = 1000
      const rows: ProductRow[] = []
      for (let from = 0; ; from += pageSize) {
        const { data, error: fetchError } = await supabase
          .from("products")
          .select("sku, image_url, updated_at")
          .order("sku")
          .range(from, from + pageSize - 1)
        if (fetchError) throw new Error(fetchError.message)
        for (const row of data ?? []) {
          rows.push({ sku: row.sku, imageUrl: row.image_url, updatedAt: row.updated_at })
        }
        if (!data || data.length < pageSize) break
      }
      setProducts(rows)
      writeProductsCache(rows.map(({ sku, imageUrl }) => ({ sku, imageUrl })))
      setLegacyCount(rows.length === 0 ? readLegacyImages().length : 0)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load products.")
    } finally {
      setLoading(false)
    }
  }, [configured])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.sku.toLowerCase().includes(q))
  }, [products, search])

  const importRows = async (rows: Array<{ sku: string; imageUrl: string }>, clearLegacyAfter = false) => {
    setImporting(true)
    setError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const payload = buildUpsertPayload(rows)
      if (payload.valid.length === 0) {
        setError("No valid rows found — the file needs SKU and http(s) IMAGE URL columns.")
        return
      }
      const counts = await upsertProducts(supabase, payload)
      if (clearLegacyAfter) clearLegacyImages()
      toast({
        title: "Import complete",
        description: `${counts.imported} imported · ${counts.updated} updated · ${counts.skipped} skipped (invalid)`,
      })
      await loadProducts()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed.")
    } finally {
      setImporting(false)
    }
  }

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = result.meta.fields ?? []
        const skuHeader = headers.find((h) => /sku/i.test(h))
        const urlHeader = headers.find((h) => /image|url|link|photo/i.test(h))
        if (!skuHeader || !urlHeader) {
          setError('Could not find the SKU and IMAGE URL columns — expected headers like "SKU,IMAGE URL".')
          return
        }
        importRows(
          (result.data as Array<Record<string, string>>).map((row) => ({
            sku: row[skuHeader] ?? "",
            imageUrl: row[urlHeader] ?? "",
          })),
        )
      },
      error: (parseError) => setError(`Failed to parse file: ${parseError.message}`),
    })
  }

  const handleDelete = async (sku: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: deleteError } = await supabase.from("products").delete().eq("sku", sku)
      if (deleteError) throw new Error(deleteError.message)
      toast({ title: "Deleted", description: sku })
      await loadProducts()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed.")
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete ALL ${products.length} products from the database? This cannot be undone.`)) return
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: deleteError } = await supabase.from("products").delete().neq("sku", "")
      if (deleteError) throw new Error(deleteError.message)
      toast({ title: "All products deleted" })
      await loadProducts()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed.")
    }
  }

  if (!configured) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto">
        <p className="kicker mb-4">System</p>
        <h1 className="font-display text-4xl mb-3">SKU images</h1>
        <div className="tokflow-card p-8 text-center">
          <p className="font-display text-xl mb-2">Supabase not configured</p>
          <p className="text-sm text-muted-foreground">
            The product database needs <span className="font-mono-ui">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
            <span className="font-mono-ui">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>. See SETUP.md. Slips fall back to the
            last locally cached copy.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto">
      <p className="kicker mb-4">System · Shared database</p>
      <h1 className="font-display text-4xl mb-3">SKU images</h1>
      <p className="text-muted-foreground max-w-xl mb-8">
        Upload a CSV with SKU and Image URL columns — products are stored in the shared database and matched to your
        orders' Seller SKUs on every packing slip.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {legacyCount > 0 && (
        <div className="tokflow-card p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-medium mb-1">Local SKU images found</p>
            <p className="text-sm text-muted-foreground">
              This browser has {legacyCount} SKU images from the old local storage. Upload them once to the shared
              database so the whole team gets them.
            </p>
          </div>
          <Button
            className="rounded-full"
            disabled={importing}
            onClick={() => importRows(readLegacyImages(), true)}
          >
            <CloudUpload className="mr-2 h-4 w-4" />
            Upload local data to database
          </Button>
        </div>
      )}

      <div className="tokflow-card p-6 mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.xlsx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          type="button"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) handleFile(file)
          }}
          className="dropzone w-full py-10 px-4 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground hover:bg-secondary/40 transition-colors"
        >
          {importing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          <span className="font-display text-xl text-foreground">
            {importing ? "Importing…" : "Drop your SKU images CSV here"}
          </span>
          <span>
            Columns: <span className="font-mono-ui">SKU</span> · <span className="font-mono-ui">IMAGE URL</span> —
            existing SKUs are updated
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-xl">
          Products <span className="font-mono-ui text-sm text-muted-foreground">{products.length}</span>
        </h2>
        {products.length > 0 && (
          <Button
            variant="outline"
            className="rounded-full bg-transparent text-red-400 border-red-900/60 hover:bg-red-950/40"
            onClick={handleDeleteAll}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete all
          </Button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search SKUs…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="tokflow-card p-10 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading products…
        </div>
      ) : filtered.length === 0 ? (
        <div className="tokflow-card p-10 text-center text-muted-foreground">
          {products.length === 0 ? "No products yet — import a CSV above." : "No SKUs match your search."}
        </div>
      ) : (
        <div className="tokflow-card overflow-hidden">
          <div className="grid grid-cols-[1fr_64px_1fr_40px] gap-3 border-b border-border px-5 py-3">
            <span className="kicker">SKU</span>
            <span className="kicker">Image</span>
            <span className="kicker">Image URL</span>
            <span />
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {filtered.map((product) => (
              <div
                key={product.sku}
                className="grid grid-cols-[1fr_64px_1fr_40px] gap-3 items-center border-b border-border/50 px-5 py-2.5 text-sm"
              >
                <span className="truncate" title={product.sku}>
                  {product.sku}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl || "/placeholder.svg"}
                  alt=""
                  className="h-10 w-10 rounded border border-border object-cover bg-white"
                  loading="lazy"
                />
                <span className="font-mono-ui text-xs text-muted-foreground truncate" title={product.imageUrl}>
                  {product.imageUrl}
                </span>
                <button
                  onClick={() => handleDelete(product.sku)}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                  aria-label={`Delete ${product.sku}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
