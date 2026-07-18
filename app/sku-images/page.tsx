"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowLeft, Upload, Trash2, Search, Plus, AlertCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SkuImageImporter } from "@/components/sku-image-importer"

interface SkuImage {
  sku: string
  imageUrl: string
  type: "sku" | "sellerSku"
}

interface ProductNameImage {
  productName: string
  imageUrl: string
}

export default function SkuImagesPage() {
  const { toast } = useToast()
  const [skuImages, setSkuImages] = useState<SkuImage[]>([])
  const [productNameImages, setProductNameImages] = useState<ProductNameImage[]>([])
  const [newSku, setNewSku] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [skuType, setSkuType] = useState<"sku" | "sellerSku">("sellerSku")
  const [imageLoadError, setImageLoadError] = useState(false)
  const [activeTab, setActiveTab] = useState("sellerSku")

  useEffect(() => {
    // Load SKU images from localStorage
    const storedImages = localStorage.getItem("skuImages")
    if (storedImages) {
      try {
        const parsedImages = JSON.parse(storedImages)
        // Add type field if it doesn't exist (for backward compatibility)
        const updatedImages = parsedImages.map((img: any) => ({
          ...img,
          type: img.type || "sku", // Default to "sku" for older data
        }))
        setSkuImages(updatedImages)
      } catch (error) {
        console.error("Failed to parse stored images:", error)
        setSkuImages([])
      }
    }

    // Load product name images from localStorage
    const storedProductImages = localStorage.getItem("productNameImages")
    if (storedProductImages) {
      try {
        const parsedImages = JSON.parse(storedProductImages)
        setProductNameImages(parsedImages)
      } catch (error) {
        console.error("Failed to parse stored product images:", error)
        setProductNameImages([])
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImageLoadError(false)

      // Create a preview URL
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.onerror = () => {
        setImageLoadError(true)
        toast({
          variant: "destructive",
          title: "Image load error",
          description: "Failed to load the selected image. Please try another image.",
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddImage = async () => {
    if (!newSku.trim()) {
      toast({
        variant: "destructive",
        title: `${skuType === "sku" ? "SKU" : "Seller SKU"} required`,
        description: `Please enter a ${skuType === "sku" ? "SKU" : "Seller SKU"}`,
      })
      return
    }

    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Image required",
        description: "Please select an image",
      })
      return
    }

    if (imageLoadError) {
      toast({
        variant: "destructive",
        title: "Invalid image",
        description: "The selected image could not be loaded. Please select another image.",
      })
      return
    }

    // Check if SKU already exists
    const existingIndex = skuImages.findIndex((item) => item.sku === newSku && item.type === skuType)

    // Convert the file to base64 for storage
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result as string

      let updatedImages: SkuImage[]

      if (existingIndex >= 0) {
        // Update existing SKU
        updatedImages = [...skuImages]
        updatedImages[existingIndex] = {
          sku: newSku,
          imageUrl: base64String,
          type: skuType,
        }
      } else {
        // Add new SKU
        updatedImages = [
          ...skuImages,
          {
            sku: newSku,
            imageUrl: base64String,
            type: skuType,
          },
        ]
      }

      // Save to localStorage
      try {
        localStorage.setItem("skuImages", JSON.stringify(updatedImages))
        setSkuImages(updatedImages)

        // Reset form
        setNewSku("")
        setSelectedFile(null)
        setPreviewUrl(null)

        toast({
          title: "Image saved",
          description: `Image for ${skuType === "sku" ? "SKU" : "Seller SKU"} "${newSku}" has been saved`,
        })
      } catch (error) {
        console.error("Failed to save image to localStorage:", error)
        toast({
          variant: "destructive",
          title: "Save failed",
          description: "Failed to save the image. The image might be too large.",
        })
      }
    }

    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Image processing error",
        description: "Failed to process the image. Please try another image.",
      })
    }

    reader.readAsDataURL(selectedFile)
  }

  const handleDeleteImage = (sku: string, type: "sku" | "sellerSku") => {
    const updatedImages = skuImages.filter((item) => !(item.sku === sku && item.type === type))
    try {
      localStorage.setItem("skuImages", JSON.stringify(updatedImages))
      setSkuImages(updatedImages)

      toast({
        title: "Image deleted",
        description: `Image for ${type === "sku" ? "SKU" : "Seller SKU"} "${sku}" has been deleted`,
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

  const handleDeleteProductNameImage = (productName: string) => {
    const updatedImages = productNameImages.filter((item) => item.productName !== productName)
    try {
      localStorage.setItem("productNameImages", JSON.stringify(updatedImages))
      setProductNameImages(updatedImages)

      toast({
        title: "Image deleted",
        description: `Image for product "${productName}" has been deleted`,
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

  const handleImportComplete = (images: ProductNameImage[]) => {
    setProductNameImages(images)
  }

  const filteredImages = skuImages.filter(
    (item) => item.type === skuType && item.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredProductImages = productNameImages.filter((item) =>
    item.productName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
          <h1 className="font-display text-4xl mb-3">SKU images</h1>
          <p className="text-muted-foreground mb-6">
            Upload and manage images for your products. These images will be automatically used when generating packing
            slips.
          </p>

          {imageLoadError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                There was an error loading the selected image. Please try another image.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="sellerSku" onValueChange={(value) => setActiveTab(value)}>
            <TabsList className="mb-6">
              <TabsTrigger value="sellerSku">Seller SKU Images</TabsTrigger>
              <TabsTrigger value="sku">SKU Images</TabsTrigger>
              <TabsTrigger value="productName">Product Name Images</TabsTrigger>
              <TabsTrigger value="import">Import Images</TabsTrigger>
            </TabsList>

            <TabsContent value="sellerSku" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Add New Seller SKU Image</h2>

                  <div>
                    <label htmlFor="seller-sku" className="block text-sm font-medium text-muted-foreground mb-1">
                      Seller SKU
                    </label>
                    <Input
                      id="seller-sku"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      placeholder="Enter Seller SKU"
                    />
                  </div>

                  <div>
                    <label htmlFor="image" className="block text-sm font-medium text-muted-foreground mb-1">
                      Product Image
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label
                          htmlFor="seller-sku-image-upload"
                          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-background"
                        >
                          {previewUrl ? (
                            <div className="relative w-full h-full">
                              <SafeImage src={previewUrl} alt="Preview" className="w-full h-full p-2" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <Upload className="h-8 w-8 text-muted-foreground/70 mb-2" />
                              <span className="text-sm text-muted-foreground">Click to upload</span>
                            </div>
                          )}
                          <input
                            id="seller-sku-image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleAddImage} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {skuImages.some((item) => item.sku === newSku && item.type === "sellerSku")
                      ? "Update Image"
                      : "Add Image"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Saved Seller SKU Images</h2>

                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Seller SKUs..."
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
                                Seller SKU
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Image
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-gray-200">
                            {filteredImages.map((item) => (
                              <tr key={`${item.type}-${item.sku}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                  {item.sku}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="h-12 w-12 relative">
                                    <SafeImage src={item.imageUrl} alt={item.sku} className="h-12 w-12" />
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setNewSku(item.sku)
                                      setPreviewUrl(item.imageUrl)
                                      setSkuType("sellerSku")
                                    }}
                                    className="text-blue-600 hover:text-blue-900 mr-2"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteImage(item.sku, "sellerSku")}
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
                          {searchQuery ? "No matching Seller SKUs found" : "No Seller SKU images saved yet"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Total: {filteredImages.length} Seller SKU image{filteredImages.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sku" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Add New SKU Image</h2>

                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-muted-foreground mb-1">
                      SKU
                    </label>
                    <Input
                      id="sku"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      placeholder="Enter product SKU"
                    />
                  </div>

                  <div>
                    <label htmlFor="image" className="block text-sm font-medium text-muted-foreground mb-1">
                      Product Image
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label
                          htmlFor="sku-image-upload"
                          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-background"
                        >
                          {previewUrl ? (
                            <div className="relative w-full h-full">
                              <SafeImage src={previewUrl} alt="Preview" className="w-full h-full p-2" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <Upload className="h-8 w-8 text-muted-foreground/70 mb-2" />
                              <span className="text-sm text-muted-foreground">Click to upload</span>
                            </div>
                          )}
                          <input
                            id="sku-image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleAddImage} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {skuImages.some((item) => item.sku === newSku && item.type === "sku")
                      ? "Update Image"
                      : "Add Image"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Saved SKU Images</h2>

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
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-gray-200">
                            {filteredImages.map((item) => (
                              <tr key={`${item.type}-${item.sku}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                  {item.sku}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="h-12 w-12 relative">
                                    <SafeImage src={item.imageUrl} alt={item.sku} className="h-12 w-12" />
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setNewSku(item.sku)
                                      setPreviewUrl(item.imageUrl)
                                      setSkuType("sku")
                                    }}
                                    className="text-blue-600 hover:text-blue-900 mr-2"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteImage(item.sku, "sku")}
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
              </div>
            </TabsContent>

            <TabsContent value="productName" className="mt-0">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">Product Name Images</h2>
                  <Button variant="outline" onClick={() => setActiveTab("import")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Import from CSV
                  </Button>
                </div>

                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Products..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    {filteredProductImages.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-background">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Product Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Image
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-gray-200">
                          {filteredProductImages.map((item) => (
                            <tr key={item.productName}>
                              <td className="px-6 py-4 text-sm font-medium text-foreground max-w-xs truncate">
                                {item.productName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="h-12 w-12 relative">
                                  <SafeImage src={item.imageUrl} alt={item.productName} className="h-12 w-12" />
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteProductNameImage(item.productName)}
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
                        {searchQuery ? "No matching products found" : "No product images saved yet"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Total: {filteredProductImages.length} product image{filteredProductImages.length !== 1 ? "s" : ""}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="import" className="mt-0">
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Import Product Images from CSV</h2>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV or Excel file with product names and image URLs to bulk import product images.
                </p>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">CSV/Excel Format Example:</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                            Image URL
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-gray-200">
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">SKU001</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                            https://mydomain.com/images/sku001.jpg
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">SKU002</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                            https://cdn.example.com/img/sku002.png
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <SkuImageImporter />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
