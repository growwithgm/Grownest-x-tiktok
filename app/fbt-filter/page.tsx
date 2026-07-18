"use client"

import { useMemo, useRef, useState } from "react"
import Papa from "papaparse"
import { Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { findFulfillmentColumn, filterRowsByColumnValue } from "@/lib/converters"

export default function FbtFilterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<string[][]>([])
  const [selectedValue, setSelectedValue] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const fulfillmentColumn = useMemo(() => (rows.length > 0 ? findFulfillmentColumn(rows[0]) : -1), [rows])

  const distinctValues = useMemo(() => {
    if (fulfillmentColumn === -1) return []
    const counts = new Map<string, number>()
    for (const row of rows.slice(1)) {
      const value = (row[fulfillmentColumn] ?? "").trim()
      if (value) counts.set(value, (counts.get(value) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rows, fulfillmentColumn])

  const removeCount = useMemo(() => {
    if (!selectedValue || fulfillmentColumn === -1) return 0
    return filterRowsByColumnValue(rows, fulfillmentColumn, selectedValue).removedCount
  }, [rows, fulfillmentColumn, selectedValue])

  const keepCount = rows.length > 1 ? rows.length - 1 - removeCount : 0

  const handleFile = (file: File) => {
    setError(null)
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data as string[][]
        if (parsed.length < 2) {
          setError("The CSV file is empty or has only a header row.")
          return
        }
        setRows(parsed)
        setFileName(file.name)
        const column = findFulfillmentColumn(parsed[0])
        if (column === -1) {
          setError('No fulfillment column found — expected a header like "Fulfillment Type".')
          return
        }
        // Preselect the TikTok-fulfilled value when present
        const values = new Set(parsed.slice(1).map((r) => (r[column] ?? "").trim()))
        const tiktok = [...values].find((v) => /tiktok/i.test(v))
        setSelectedValue(tiktok || "")
      },
      error: (parseError) => setError(`Failed to parse CSV: ${parseError.message}`),
    })
  }

  const handleDownload = () => {
    if (!selectedValue || fulfillmentColumn === -1) return
    const { kept } = filterRowsByColumnValue(rows, fulfillmentColumn, selectedValue)
    const csv = Papa.unparse(kept)
    const base = (fileName || "orders.csv").replace(/\.csv$/i, "")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${base}_cleaned.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const stepCircle = (n: number) => (
    <span className="font-mono-ui flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-[12px]">
      {n}
    </span>
  )

  return (
    <div className="px-4 sm:px-8 py-10 max-w-3xl mx-auto">
      <p className="kicker mb-4">Clean · Order export</p>
      <h1 className="font-display text-4xl mb-3">Fulfillment filter</h1>
      <p className="text-muted-foreground max-w-lg mb-10">
        Remove Fulfilled-by-TikTok rows — or any fulfillment type — from a Shop order export, then download the cleaned
        CSV.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="tokflow-card p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          {stepCircle(1)}
          <h2 className="font-medium">Upload your CSV</h2>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
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
          className="dropzone w-full py-8 px-4 flex items-center justify-center gap-3 text-sm text-muted-foreground hover:bg-secondary/40 transition-colors"
        >
          <Upload className="h-4 w-4" />
          {fileName ? (
            <span className="font-mono-ui">
              {fileName} · {rows.length - 1} rows loaded
            </span>
          ) : (
            <span>Drop your order export here, or click to browse</span>
          )}
        </button>
      </div>

      <div className="tokflow-card p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          {stepCircle(2)}
          <h2 className="font-medium">Choose the fulfillment type to remove</h2>
        </div>
        <Select value={selectedValue} onValueChange={setSelectedValue} disabled={distinctValues.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder={rows.length ? "Select a fulfillment type" : "Upload a CSV first"} />
          </SelectTrigger>
          <SelectContent>
            {distinctValues.map(([value, count]) => (
              <SelectItem key={value} value={value}>
                {value} · {count} rows
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedValue && rows.length > 1 && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-foreground"
                style={{ width: `${Math.round((removeCount / (rows.length - 1)) * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex gap-6 text-sm text-muted-foreground">
              <span>
                ■ Remove · <strong className="text-foreground">{removeCount}</strong> rows
              </span>
              <span>
                □ Keep · <strong className="text-foreground">{keepCount}</strong> rows
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="tokflow-card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          {stepCircle(3)}
          <div>
            <h2 className="font-medium mb-1">Clean &amp; download</h2>
            {selectedValue ? (
              <p className="text-sm text-muted-foreground">
                Removes <strong className="text-foreground">{removeCount}</strong> rows where Fulfillment Type is{" "}
                <span className="font-mono-ui">"{selectedValue}"</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Upload a CSV and pick a fulfillment type first.</p>
            )}
          </div>
        </div>
        <Button className="rounded-full" onClick={handleDownload} disabled={!selectedValue || removeCount === 0}>
          <Download className="mr-2 h-4 w-4" />
          Download cleaned CSV
        </Button>
      </div>
    </div>
  )
}
