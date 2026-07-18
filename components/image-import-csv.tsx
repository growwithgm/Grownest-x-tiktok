"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import Papa from "papaparse"

interface ImageImportCSVProps {
  onImportComplete: (images: { productName: string; imageUrl: string }[]) => void
}

export function ImageImportCSV({ onImportComplete }: ImageImportCSVProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [productNameColumn, setProductNameColumn] = useState<string | null>(null)
  const [imageUrlColumn, setImageUrlColumn] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)
    setCsvHeaders([])
    setPreviewData([])

    if (!selectedFile) return

    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file")
      setFile(null)
      return
    }

    setFile(selectedFile)

    // Preview CSV headers and first few rows
    if (selectedFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (text) {
          try {
            const results = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              preview: 5, // Preview first 5 rows
            })

            if (results.data && results.data.length > 0) {
              const headers = Object.keys(results.data[0])
              setCsvHeaders(headers)

              // Auto-detect product name and image URL columns
              const productNameCandidates = headers.filter(
                (h) =>
                  h.toLowerCase().includes("product") ||
                  h.toLowerCase().includes("title") ||
                  h.toLowerCase().includes("name"),
              )

              const imageUrlCandidates = headers.filter(
                (h) =>
                  h.toLowerCase().includes("image") ||
                  h.toLowerCase().includes("url") ||
                  h.toLowerCase().includes("photo"),
              )

              if (productNameCandidates.length > 0) {
                setProductNameColumn(productNameCandidates[0])
              }

              if (imageUrlCandidates.length > 0) {
                setImageUrlColumn(imageUrlCandidates[0])
              }

              setPreviewData(results.data.slice(0, 5))
            }
          } catch (error) {
            console.error("Error parsing CSV:", error)
            setError("Failed to parse CSV file. Please check the file format.")
          }
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file || !productNameColumn || !imageUrlColumn) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Please select both Product Name and Image URL columns",
      })
      return
    }

    setIsProcessing(true)
    setProgress(10)

    try {
      const reader = new FileReader()

      reader.onload = (e) => {
        const csvContent = e.target?.result as string
        if (csvContent) {
          try {
            setProgress(30)

            const results = Papa.parse(csvContent, {
              header: true,
              skipEmptyLines: true,
            })

            setProgress(60)

            if (results.data && results.data.length > 0) {
              const imageData = results.data
                .map((row: any) => ({
                  productName: row[productNameColumn],
                  imageUrl: row[imageUrlColumn],
                }))
                .filter((item) => item.productName && item.imageUrl)

              setProgress(90)

              // Store the imported images
              const existingImages = JSON.parse(localStorage.getItem("productNameImages") || "[]")

              // Merge new images with existing ones, overwriting duplicates
              const mergedImages = [...existingImages]

              imageData.forEach((newImage) => {
                const existingIndex = mergedImages.findIndex((img) => img.productName === newImage.productName)

                if (existingIndex >= 0) {
                  mergedImages[existingIndex] = newImage
                } else {
                  mergedImages.push(newImage)
                }
              })

              localStorage.setItem("productNameImages", JSON.stringify(mergedImages))

              setProgress(100)

              toast({
                title: "Import successful",
                description: `Imported ${imageData.length} product images`,
              })

              onImportComplete(imageData)
            }
          } catch (error) {
            console.error("Error processing CSV:", error)
            setError("Failed to process CSV file. Please check the file format.")
          }
        }
      }

      reader.readAsText(file)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Import failed",
        description: "See error details below",
      })
    } finally {
      setTimeout(() => {
        setIsProcessing(false)
      }, 500)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="whitespace-pre-line">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
      )}

      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-background transition-colors">
        <input
          type="file"
          id="image-csv-upload"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
          disabled={isProcessing}
        />

        <label htmlFor="image-csv-upload" className="cursor-pointer flex flex-col items-center justify-center">
          <Upload className="h-12 w-12 text-muted-foreground/70 mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-1">
            {file ? file.name : "Click to upload product images CSV"}
          </p>
          <p className="text-sm text-muted-foreground">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
              : "CSV should contain product name and image URL columns"}
          </p>
        </label>
      </div>

      {file && csvHeaders.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Product Name Column</label>
              <select
                className="w-full rounded-md border border-border p-2"
                value={productNameColumn || ""}
                onChange={(e) => setProductNameColumn(e.target.value)}
              >
                <option value="">Select column</option>
                {csvHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Image URL Column</label>
              <select
                className="w-full rounded-md border border-border p-2"
                value={imageUrlColumn || ""}
                onChange={(e) => setImageUrlColumn(e.target.value)}
              >
                <option value="">Select column</option>
                {csvHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {previewData.length > 0 && (
            <div className="mt-4 p-4 bg-background rounded-lg border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Preview:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-background">
                    <tr>
                      {productNameColumn && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Product Name
                        </th>
                      )}
                      {imageUrlColumn && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Image URL
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        {productNameColumn && (
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                            {row[productNameColumn]}
                          </td>
                        )}
                        {imageUrlColumn && (
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground truncate max-w-xs">
                            {row[imageUrlColumn]}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {file && !isProcessing && (
        <div className="flex items-center justify-between bg-background p-4 rounded-lg">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-muted-foreground mr-2" />
            <span className="text-sm font-medium text-muted-foreground">{file.name}</span>
          </div>
          <Button variant="default" onClick={handleImport} disabled={!productNameColumn || !imageUrlColumn}>
            Import Product Images
          </Button>
        </div>
      )}

      {isProcessing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Processing file...</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          </div>
        </div>
      )}
    </div>
  )
}
