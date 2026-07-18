"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, AlertCircle, Loader2, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import Papa from "papaparse"

interface SkuImage {
  sku: string
  imageUrl: string
}

export function SkuImageImporter() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [skuImages, setSkuImages] = useState<SkuImage[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [skuColumn, setSkuColumn] = useState<string | null>(null)
  const [imageUrlColumn, setImageUrlColumn] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)
    setCsvHeaders([])
    setPreviewData([])

    if (!selectedFile) return

    if (
      selectedFile.type !== "text/csv" &&
      !selectedFile.name.endsWith(".csv") &&
      !selectedFile.type.includes("excel") &&
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls")
    ) {
      setError("Please upload a valid CSV or Excel file")
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

              // Auto-detect SKU and image URL columns
              const skuCandidates = headers.filter(
                (h) => h.toLowerCase().includes("sku") || h.toLowerCase().includes("code"),
              )

              const imageUrlCandidates = headers.filter(
                (h) =>
                  h.toLowerCase().includes("image") ||
                  h.toLowerCase().includes("url") ||
                  h.toLowerCase().includes("link") ||
                  h.toLowerCase().includes("photo"),
              )

              if (skuCandidates.length > 0) {
                setSkuColumn(skuCandidates[0])
              }

              if (imageUrlCandidates.length > 0) {
                setImageUrlColumn(imageUrlCandidates[0])
              }

              setPreviewData(results.data.slice(0, 5))
            }
          } catch (error) {
            console.error("Error parsing CSV:", error)
            setError("Failed to parse file. Please check the file format.")
          }
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file || !skuColumn || !imageUrlColumn) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Please select both SKU and Image URL columns",
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
                  sku: row[skuColumn],
                  imageUrl: row[imageUrlColumn],
                }))
                .filter((item) => item.sku && item.imageUrl)

              setProgress(90)

              // Store the imported images
              localStorage.setItem("skuImages", JSON.stringify(imageData))
              setSkuImages(imageData)

              setProgress(100)

              toast({
                title: "Import successful",
                description: `Imported ${imageData.length} SKU images`,
              })

              // Load the images after import
              loadStoredImages()
            }
          } catch (error) {
            console.error("Error processing file:", error)
            setError("Failed to process file. Please check the file format.")
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

  const loadStoredImages = () => {
    try {
      const storedImages = localStorage.getItem("skuImages")
      if (storedImages) {
        const parsedImages = JSON.parse(storedImages)
        setSkuImages(parsedImages)
      }
    } catch (error) {
      console.error("Failed to load stored SKU images:", error)
      setSkuImages([])
    }
  }

  // Load stored images on component mount
  useState(() => {
    loadStoredImages()
  })

  const handleDeleteImage = (sku: string) => {
    const updatedImages = skuImages.filter((item) => item.sku !== sku)
    try {
      localStorage.setItem("skuImages", JSON.stringify(updatedImages))
      setSkuImages(updatedImages)

      toast({
        title: "Image deleted",
        description: `Image for SKU "${sku}" has been deleted`,
      })
    } catch (error) {
      console.error("Failed to update localStorage after deletion:", error)
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete the image. Please try again.",
      })
    }
  }

  const handleDeleteAllImages = () => {
    try {
      localStorage.removeItem("skuImages")
      setSkuImages([])

      toast({
        title: "All images deleted",
        description: "All SKU images have been deleted",
      })
    } catch (error) {
      console.error("Failed to delete all images:", error)
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete all images. Please try again.",
      })
    }
  }

  const filteredImages = skuImages.filter((item) => item.sku.toLowerCase().includes(searchQuery.toLowerCase()))

  // Safe image component that handles errors
  const SafeImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const [error, setError] = useState(false)

    return error ? (
      <div className={`flex items-center justify-center bg-secondary ${className || "h-12 w-12"}`}>
        <AlertCircle className="h-4 w-4 text-muted-foreground/70" />
      </div>
    ) : (
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        className={`object-contain ${className || "h-12 w-12"}`}
        onError={() => setError(true)}
      />
    )
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
          id="sku-csv-upload"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
          disabled={isProcessing}
        />

        <label htmlFor="sku-csv-upload" className="cursor-pointer flex flex-col items-center justify-center">
          <Upload className="h-12 w-12 text-muted-foreground/70 mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-1">
            {file ? file.name : "Click to upload SKU images CSV/Excel file"}
          </p>
          <p className="text-sm text-muted-foreground">
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "File should contain SKU and Image URL columns"}
          </p>
        </label>
      </div>

      {file && csvHeaders.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">SKU Column</label>
              <select
                className="w-full rounded-md border border-border p-2"
                value={skuColumn || ""}
                onChange={(e) => setSkuColumn(e.target.value)}
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
                      {skuColumn && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          SKU
                        </th>
                      )}
                      {imageUrlColumn && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Image URL
                        </th>
                      )}
                      {imageUrlColumn && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Preview
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        {skuColumn && (
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{row[skuColumn]}</td>
                        )}
                        {imageUrlColumn && (
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground truncate max-w-xs">
                            {row[imageUrlColumn]}
                          </td>
                        )}
                        {imageUrlColumn && (
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="h-8 w-8">
                              <SafeImage
                                src={row[imageUrlColumn]}
                                alt={row[skuColumn] || "Preview"}
                                className="h-8 w-8"
                              />
                            </div>
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
          <Button variant="default" onClick={handleImport} disabled={!skuColumn || !imageUrlColumn}>
            Import SKU Images
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

      {/* Imported SKU Images List */}
      {skuImages.length > 0 && (
        <div className="space-y-4 mt-8">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Imported SKU Images</h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleDeleteAllImages} className="text-red-600">
                Delete All
              </Button>
            </div>
          </div>

          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKUs..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {filteredImages.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Image URL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {filteredImages.map((item) => (
                      <tr key={item.sku}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{item.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-12 w-12 relative">
                            <SafeImage src={item.imageUrl} alt={item.sku} className="h-12 w-12" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground truncate max-w-xs">
                          {item.imageUrl}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteImage(item.sku)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  {searchQuery ? "No matching SKUs found" : "No SKU images saved yet"}
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Total: {filteredImages.length} SKU image{filteredImages.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  )
}
