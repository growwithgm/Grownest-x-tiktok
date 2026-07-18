"use client"

import { SkuImageImporter } from "@/components/sku-image-importer"

export default function SkuImagesPage() {
  return (
    <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto">
      <p className="kicker mb-4">System</p>
      <h1 className="font-display text-4xl mb-3">SKU images</h1>
      <p className="text-muted-foreground max-w-xl mb-8">
        Upload a CSV with SKU and Image URL columns — the images are matched to your orders' Seller SKUs and shown
        automatically on every packing slip.
      </p>

      <div className="tokflow-card p-6">
        <SkuImageImporter />
      </div>
    </div>
  )
}
