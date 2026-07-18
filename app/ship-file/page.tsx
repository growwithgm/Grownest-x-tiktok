"use client"

import { useMemo, useRef, useState } from "react"
import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { parseAmazonTrackingTxt, DEFAULT_CARRIER, type TrackingRow } from "@/lib/converters"
import { buildXlsx } from "@/lib/xlsx-lite"

export default function ShipFilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<TrackingRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const carriers = useMemo(() => [...new Set(rows.map((r) => r.carrier))], [rows])

  const handleFile = (file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = String(event.target?.result || "")
      const parsed = parseAmazonTrackingTxt(text)
      if (parsed.length === 0) {
        setError("No tracking rows found — expected tab-separated order-id, carrier-name, tracking-number.")
        return
      }
      setRows(parsed)
      setFileName(file.name)
    }
    reader.onerror = () => setError("Failed to read the file. Please try again.")
    reader.readAsText(file)
  }

  const outputName = () => {
    const now = new Date()
    const stamp =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "_" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0")
    return `TikTok_Ship_File_${stamp}.xlsx`
  }

  const handleDownload = () => {
    if (rows.length === 0) return
    const grid = [["Order ID", "Carrier", "Tracking ID"], ...rows.map((r) => [r.orderId, r.carrier, r.trackingId])]
    const bytes = buildXlsx("Ship File", grid)
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = outputName()
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="px-4 sm:px-8 py-10 max-w-4xl mx-auto">
      <p className="kicker mb-4">Convert · Amazon → TikTok Shop</p>
      <h1 className="font-display text-4xl mb-3">Ship File converter</h1>
      <p className="text-muted-foreground max-w-xl mb-10">
        Turn an Amazon tracking <span className="font-mono-ui">.txt</span> export into a TikTok Shop Ship File{" "}
        <span className="font-mono-ui">.xlsx</span> — Order ID, carrier &amp; tracking, ready to upload.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.tsv,text/plain"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        className="dropzone w-full p-6 mb-6 flex items-center gap-4 text-left hover:bg-secondary/40 transition-colors"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <FileText className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block font-display text-lg">Drop your Amazon tracking .txt</span>
          <span className="block text-sm text-muted-foreground">
            Tab-separated · we read <span className="font-mono-ui">order-id</span>,{" "}
            <span className="font-mono-ui">carrier-name</span>, <span className="font-mono-ui">tracking-number</span>
          </span>
        </span>
        {fileName && <span className="font-mono-ui text-xs text-muted-foreground">● {fileName}</span>}
      </button>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { value: String(rows.length), label: "Orders matched" },
          { value: String(carriers.length).padStart(2, "0"), label: "Carriers mapped" },
          { value: DEFAULT_CARRIER, label: "Default carrier" },
          { value: "A·B·C", label: "Columns written" },
        ].map((stat) => (
          <div key={stat.label} className="tokflow-card p-5">
            <p className="font-display text-2xl mb-2">{stat.value}</p>
            <p className="kicker">{stat.label}</p>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="tokflow-card overflow-hidden mb-6">
          <div className="grid grid-cols-3 border-b border-border px-5 py-3">
            <span className="kicker">Order ID</span>
            <span className="kicker">Provider</span>
            <span className="kicker">Tracking ID</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {rows.slice(0, 50).map((row) => (
              <div key={`${row.orderId}-${row.trackingId}`} className="grid grid-cols-3 border-b border-border/50 px-5 py-3 text-sm">
                <span className="font-mono-ui truncate">{row.orderId}</span>
                <span>{row.carrier}</span>
                <span className="font-mono-ui text-muted-foreground truncate">{row.trackingId}</span>
              </div>
            ))}
          </div>
          {rows.length > 50 && (
            <p className="px-5 py-3 text-xs text-muted-foreground">…and {rows.length - 50} more rows</p>
          )}
        </div>
      )}

      <div className="tokflow-card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="kicker mb-2">Output</p>
          <p className="font-mono-ui text-sm">{rows.length > 0 ? outputName() : "Upload a tracking file first"}</p>
        </div>
        <Button className="rounded-full" onClick={handleDownload} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Convert &amp; download
        </Button>
      </div>
    </div>
  )
}
