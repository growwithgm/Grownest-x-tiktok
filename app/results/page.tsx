"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Printer, Download, Zap, AlertTriangle, RefreshCw, FileText, Settings, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PackingSlip } from "@/components/packing-slip"
import { TemplateRenderer } from "@/components/template-renderer"
import { PdfAnalyzer } from "@/components/pdf-analyzer"
import type { PackingSlipData } from "@/lib/types"
import Link from "next/link"
import { generatePackingSlipPDF } from "@/lib/pdf-generator"
import { generateEnhancedPDF } from "@/lib/enhanced-pdf-generator"
import { generatePdfFromTemplate } from "@/lib/html-to-pdf"
import { buildAteneaCsv, buildShipments, encodeCp1252, resolveAteneaColumns, type OrderRow } from "@/lib/atenea-csv"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Helper function to parse weight values consistently
function parseWeight(weightValue: string | number | null | undefined): number {
  if (!weightValue) return 0

  let weightStr = String(weightValue).trim()
  if (!weightStr) return 0

  // Remove "kg" suffix (case insensitive)
  weightStr = weightStr.replace(/\s*kg\s*$/i, "")

  // Replace comma with dot for decimal parsing (European format)
  weightStr = weightStr.replace(",", ".")

  // Parse as float
  const parsed = Number.parseFloat(weightStr)
  return isNaN(parsed) ? 0 : Math.max(0, parsed) // Ensure non-negative
}

export default function ResultsPage() {
  const [packingSlips, setPackingSlips] = useState<PackingSlipData[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showAnalyzer, setShowAnalyzer] = useState(false)
  const [useAI, setUseAI] = useState(false)
  const [optimizedSlips, setOptimizedSlips] = useState<PackingSlipData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<{ name: string }[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [useCustomTemplate, setUseCustomTemplate] = useState(false)
  const [pdfSettings, setPdfSettings] = useState<{
    useCustomTemplate: boolean
    templateName: string | null
    pdfGenerator: "standard" | "enhanced" | "template"
  }>({
    useCustomTemplate: false,
    templateName: null,
    pdfGenerator: "standard",
  })
  const [showPdfSettings, setShowPdfSettings] = useState(false)
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mergeSameBuyer, setMergeSameBuyer] = useState(true)
  const [mergeNotices, setMergeNotices] = useState<string[]>([])

  useEffect(() => {
    try {
      // Load packing slips
      const storedData = localStorage.getItem("packingSlips")
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            setPackingSlips(parsedData)
            console.log(`Loaded ${parsedData.length} packing slips from localStorage`)
          } else {
            console.error("Packing slips data is empty or not an array:", parsedData)
            setError("No valid packing slips found in the data. The CSV may not have been processed correctly.")
          }
        } catch (parseError) {
          console.error("Failed to parse packing slips data:", parseError)
          setError("Failed to parse packing slips data. Please try processing the CSV again.")
        }
      } else {
        console.error("No packing slips data found in localStorage")
        setError("No packing slips data found. Please upload and process a CSV file.")
      }

      // Load templates
      const storedTemplates = localStorage.getItem("customTemplates")
      if (storedTemplates) {
        try {
          const parsedTemplates = JSON.parse(storedTemplates)
          setTemplates(parsedTemplates)

          // Check if there's a default template
          const defaultTemplate = localStorage.getItem("defaultTemplate")
          if (defaultTemplate) {
            setSelectedTemplate(defaultTemplate)
            setUseCustomTemplate(true)
            setPdfSettings((prev) => ({
              ...prev,
              templateName: defaultTemplate,
            }))
          }
        } catch (error) {
          console.error("Failed to parse templates:", error)
        }
      }

      // Load PDF settings
      const storedPdfSettings = localStorage.getItem("pdfSettings")
      if (storedPdfSettings) {
        try {
          const parsedSettings = JSON.parse(storedPdfSettings)
          setPdfSettings(parsedSettings)
        } catch (error) {
          console.error("Failed to parse PDF settings:", error)
        }
      }

      // Load merge preference (default ON)
      setMergeSameBuyer(localStorage.getItem("mergeSameBuyerOrders") !== "false")

      // Load raw CSV data
      const rawCsvData = localStorage.getItem("rawCsvData")
      if (rawCsvData) {
        try {
          const parsedCsvData = JSON.parse(rawCsvData)
          setCsvRows(parsedCsvData)
        } catch (error) {
          console.error("Failed to parse raw CSV data:", error)
        }
      }
    } catch (error) {
      console.error("Failed to load packing slips:", error)
      setError(`Failed to load packing slips: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (packingSlips.length > 0) {
      try {
        setGenerating(true)
        setError(null)

        switch (pdfSettings.pdfGenerator) {
          case "enhanced":
            // Use the AI-enhanced PDF generator
            await generateEnhancedPDF(optimizedSlips || packingSlips, useAI)
            break
          case "template":
            // Use the template-based PDF generator
            await generatePdfFromTemplate(packingSlips, pdfSettings.templateName || undefined)
            break
          case "standard":
          default:
            // Use the regular PDF generator
            await generatePackingSlipPDF(packingSlips)
            break
        }
      } catch (error) {
        console.error("PDF generation error:", error)
        setError(
          `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}. Please try a different PDF generator or template.`,
        )
      } finally {
        setGenerating(false)
      }
    }
  }

  const handleOptimizedData = (data: PackingSlipData[]) => {
    setOptimizedSlips(data)
  }

  const handleRetryFromLocalStorage = () => {
    setLoading(true)
    setError(null)

    try {
      const storedData = localStorage.getItem("packingSlips")
      if (storedData) {
        const parsedData = JSON.parse(storedData)
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setPackingSlips(parsedData)
        } else {
          setError("No valid packing slips found in the data. The CSV may not have been processed correctly.")
        }
      } else {
        setError("No packing slips data found. Please upload and process a CSV file.")
      }
    } catch (error) {
      console.error("Failed to load packing slips:", error)
      setError(`Failed to load packing slips: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePdfSettings = (settings: typeof pdfSettings) => {
    setPdfSettings(settings)
    localStorage.setItem("pdfSettings", JSON.stringify(settings))
    setShowPdfSettings(false)
  }

  const handleMergeToggle = (checked: boolean) => {
    setMergeSameBuyer(checked)
    localStorage.setItem("mergeSameBuyerOrders", String(checked))
  }

  const handleDownloadCSV = () => {
    try {
      // Get the raw CSV data from localStorage
      const rawCsvData = localStorage.getItem("rawCsvData")
      if (!rawCsvData) {
        setError("No raw CSV data found. Please re-upload your CSV file.")
        return
      }

      // Resolve input columns by header name (stable across TikTok Shop export
      // layout changes), honoring any saved column mapping first.
      const headers: string[] = csvRows.length > 0 ? csvRows[0] : []
      let mappingArray: string[] | undefined
      const storedMappings = localStorage.getItem("columnMappings")
      if (storedMappings) {
        try {
          const mappings = JSON.parse(storedMappings)
          if (Array.isArray(mappings.default)) {
            mappingArray = mappings.default
          }
        } catch (error) {
          console.error("Failed to parse column mappings:", error)
        }
      }

      const cols = resolveAteneaColumns(headers, mappingArray)

      // Legacy behavior: a numeric weight mapping value means a 1-based column number
      if (mappingArray) {
        const weightMapping = mappingArray[13] // Weight is index 13 in requiredFields
        if (weightMapping && weightMapping !== "none" && !isNaN(Number.parseInt(weightMapping))) {
          cols.weight = Number.parseInt(weightMapping) - 1
        }
      }
      const weightColumnIndex = cols.weight

      // Check if we have enough columns for the weight column
      if (csvRows.length > 0 && csvRows[0].length <= weightColumnIndex) {
        setError(
          `⚠️ Error: Unable to process your data.\nThe Weight column (${weightColumnIndex + 1}) does not exist in your CSV.\nYour CSV has ${csvRows[0].length} columns. Please check your column mapping.`,
        )
        return
      }

      // Collect one OrderRow per input row
      const orders: OrderRow[] = []

      csvRows.forEach((row: string[], index: number) => {
        if (index === 0) return // Skip header row

        let recipientName = (row[cols.name] || "").trim()
        if (!recipientName && row[cols.nameFallback]) {
          recipientName = row[cols.nameFallback].trim()
        }

        // Skip rows with blank recipient names
        if (!recipientName) {
          console.log(`Skipping row ${index + 1}: No recipient name found`)
          return
        }

        orders.push({
          orderId: (row[cols.reference] || "").trim(),
          username: (row[cols.username] || "").trim(),
          name: recipientName,
          phone: (row[cols.phone] || "").trim(),
          email: (row[cols.email] || "").trim(),
          country: (row[cols.country] || "").trim(),
          zip: (row[cols.zip] || "").trim(),
          address1: (row[cols.address1] || "").trim(),
          address2: (row[cols.address2] || "").trim(),
          description: (row[cols.description] || "").trim(),
          weightKg: parseWeight(row[weightColumnIndex] || "0"),
        })
      })

      // Merge into shipments:
      // toggle ON  → merged per buyer account (per distinct shipping address),
      //              Reference = oldest order's ID, weights summed;
      // toggle OFF → strict per-order rows.
      const { shipments, notices } = buildShipments(orders, mergeSameBuyer)
      setMergeNotices(notices)
      const records = shipments

      // ATENEA's saved template has no text qualifier and reads ISO-8859-15:
      // fields must be unquoted and comma-free, encoded as windows-1252 without
      // BOM. buildAteneaCsv enforces exactly 9 commas per line and blocks the
      // download on any violation.
      const result = buildAteneaCsv(records)
      if (!result.ok) {
        setError(`\u26A0\uFE0F CSV export blocked \u2014 invalid row(s):\n${result.errors.join("\n")}`)
        return
      }

      // Create and download file
      const now = new Date()
      const timestamp =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0") +
        "_" +
        String(now.getHours()).padStart(2, "0") +
        "-" +
        String(now.getMinutes()).padStart(2, "0")

      const filename = `packing_slips_${timestamp}.csv`

      const blob = new Blob([encodeCp1252(result.csv)], { type: "text/csv;charset=windows-1252" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error("CSV export error:", error)
      setError(`CSV export failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-border rounded-full border-t-foreground"></div>
      </div>
    )
  }

  if (error || packingSlips.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">No Packing Slips Found</h1>

        {error && (
          <Alert variant="destructive" className="mb-6 max-w-xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}

        <p className="text-muted-foreground mb-8 text-center max-w-xl">
          {!error && "Please upload a CSV file to generate packing slips."}
          <br />
          Make sure your CSV file contains all required fields and is properly formatted.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={handleRetryFromLocalStorage}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Loading Data
          </Button>

          <Link href="/map-columns">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Column Mapping
            </Button>
          </Link>

          <Link href="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Upload
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="print:bg-white">
      <div className="px-4 sm:px-8 py-10 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <div>
            <p className="kicker mb-3">Step 03 / 03</p>
            <h1 className="font-display text-4xl">Generated packing slips</h1>
            <p className="text-muted-foreground mt-2">
              {packingSlips.length} slip{packingSlips.length !== 1 ? "s" : ""} · merged by buyer ·{" "}
              {packingSlips.reduce((sum, s) => sum + (s.totalWeight || 0), 0).toFixed(2)} kg total{" "}
              <span className="font-mono-ui text-[11px] text-muted-foreground/70 ml-2">v2.0.0 · ATENEA export</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full bg-transparent" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print All
            </Button>
            <Dialog open={showPdfSettings} onOpenChange={setShowPdfSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full bg-transparent">
                  <Settings className="mr-2 h-4 w-4" />
                  PDF Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>PDF Generation Settings</DialogTitle>
                  <DialogDescription>Configure how your PDFs are generated</DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="generator" className="mt-4">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="generator">PDF Generator</TabsTrigger>
                    <TabsTrigger value="template">Template</TabsTrigger>
                  </TabsList>
                  <TabsContent value="generator" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select PDF Generator</Label>
                        <Select
                          value={pdfSettings.pdfGenerator}
                          onValueChange={(value: "standard" | "enhanced" | "template") =>
                            setPdfSettings((prev) => ({ ...prev, pdfGenerator: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select PDF generator" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard PDF Generator</SelectItem>
                            <SelectItem value="enhanced">Enhanced PDF Generator</SelectItem>
                            <SelectItem value="template">Custom Template Generator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {pdfSettings.pdfGenerator === "enhanced" && (
                        <div className="flex items-center space-x-2">
                          <Switch id="use-ai-pdf" checked={useAI} onCheckedChange={setUseAI} />
                          <Label htmlFor="use-ai-pdf">Use AI optimization</Label>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="template" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="use-custom-template-pdf"
                          checked={pdfSettings.useCustomTemplate}
                          onCheckedChange={(checked) =>
                            setPdfSettings((prev) => ({ ...prev, useCustomTemplate: checked }))
                          }
                        />
                        <Label htmlFor="use-custom-template-pdf">Use custom template for PDF</Label>
                      </div>
                      {pdfSettings.useCustomTemplate && (
                        <div className="space-y-2">
                          <Label>Select Template</Label>
                          <Select
                            value={pdfSettings.templateName || ""}
                            onValueChange={(value) => setPdfSettings((prev) => ({ ...prev, templateName: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((template) => (
                                <SelectItem key={template.name} value={template.name}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => setShowPdfSettings(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleSavePdfSettings(pdfSettings)}>Save Settings</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="rounded-full bg-transparent" onClick={handleDownloadCSV}>
              <FileDown className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button className="rounded-full" onClick={handleDownloadPDF} disabled={generating}>
              <Download className="mr-2 h-4 w-4" />
              {generating ? "Generating PDF..." : "Download PDF"}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8 print:hidden">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2">
                <Switch id="merge-same-buyer" checked={mergeSameBuyer} onCheckedChange={handleMergeToggle} />
                <Label htmlFor="merge-same-buyer">
                  Merge same-buyer orders into one shipment (ATENEA CSV)
                </Label>
              </div>
              {mergeNotices.length > 0 && (
                <Alert className="mt-3 border-border bg-secondary text-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Shipments kept separate</AlertTitle>
                  <AlertDescription>
                    {mergeNotices.map((notice) => (
                      <div key={notice}>{notice}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex gap-2">
              <Link href="/templates">
                <Button variant="outline" className="flex items-center bg-transparent">
                  <FileText className="mr-2 h-4 w-4" />
                  Manage Templates
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setShowAnalyzer(!showAnalyzer)} className="flex items-center">
                <Zap className="mr-2 h-4 w-4 text-amber-500" />
                {showAnalyzer ? "Hide AI Analyzer" : "AI PDF Analyzer"}
              </Button>
            </div>
          </div>

          {templates.length > 0 && (
            <div className="mt-6 p-4 bg-background rounded-lg border border-border">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Switch id="use-custom-template" checked={useCustomTemplate} onCheckedChange={setUseCustomTemplate} />
                  <Label htmlFor="use-custom-template">Use custom template for preview</Label>
                </div>

                {useCustomTemplate && (
                  <div className="flex-1">
                    <Select value={selectedTemplate || undefined} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.name} value={template.name}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  <strong>Note:</strong> The template selected above is for preview only. To use a custom template for
                  PDF generation, click the "PDF Settings" button and configure your PDF template settings.
                </p>
              </div>
            </div>
          )}

          {showAnalyzer && (
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Switch id="use-ai" checked={useAI} onCheckedChange={setUseAI} />
                <Label htmlFor="use-ai">Use AI-optimized PDF generation</Label>
              </div>
              <PdfAnalyzer
                packingSlipData={packingSlips}
                onOptimize={handleOptimizedData}
                htmlContent={document.querySelector(".page-break-after")?.innerHTML}
                pdfParams={{
                  margins: { top: 15, right: 15, bottom: 15, left: 15 },
                  fonts: {
                    header: { size: 18, style: "bold" },
                    normal: { size: 10, style: "normal" },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-8">
          {packingSlips.map((slip, index) => (
            <div key={index} className="page-break-after">
              {useCustomTemplate && selectedTemplate ? (
                <TemplateRenderer data={slip} templateName={selectedTemplate} />
              ) : (
                <PackingSlip data={slip} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
