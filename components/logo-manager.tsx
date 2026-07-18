"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Upload, Trash2, AlertCircle, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LogoManager() {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [savedLogo, setSavedLogo] = useState<string | null>(null)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [logoWidth, setLogoWidth] = useState(353)
  const [logoHeight, setLogoHeight] = useState(65)

  useEffect(() => {
    // Load saved logo from localStorage
    const storedLogo = localStorage.getItem("customLogo")
    if (storedLogo) {
      setSavedLogo(storedLogo)
    }

    // Load saved dimensions from localStorage
    const storedDimensions = localStorage.getItem("logoDimensions")
    if (storedDimensions) {
      try {
        const dimensions = JSON.parse(storedDimensions)
        if (dimensions.width) setLogoWidth(dimensions.width)
        if (dimensions.height) setLogoHeight(dimensions.height)
      } catch (error) {
        console.error("Failed to parse logo dimensions:", error)
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

  const handleSaveLogo = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Image required",
        description: "Please select a logo image",
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

    // Convert the file to base64 for storage
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result as string

      // Save to localStorage
      try {
        localStorage.setItem("customLogo", base64String)
        localStorage.setItem("logoDimensions", JSON.stringify({ width: logoWidth, height: logoHeight }))
        setSavedLogo(base64String)

        // Reset form
        setSelectedFile(null)
        setPreviewUrl(null)

        toast({
          title: "Logo saved",
          description: "Custom logo has been saved and will be used in all PDFs",
        })
      } catch (error) {
        console.error("Failed to save logo to localStorage:", error)
        toast({
          variant: "destructive",
          title: "Save failed",
          description: "Failed to save the logo. The image might be too large.",
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

  const handleRemoveLogo = () => {
    localStorage.removeItem("customLogo")
    setSavedLogo(null)
    setPreviewUrl(null)
    setSelectedFile(null)

    toast({
      title: "Logo removed",
      description: "Custom logo has been removed. Default logo will be used.",
    })
  }

  // Safe image component that handles errors
  const SafeImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const [error, setError] = useState(false)

    return error ? (
      <div className={`flex items-center justify-center bg-secondary ${className || "h-16 w-full"}`}>
        <AlertCircle className="h-4 w-4 text-muted-foreground/70" />
      </div>
    ) : (
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        className={`object-contain ${className || "h-16 w-full"}`}
        onError={() => setError(true)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {imageLoadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>There was an error loading the selected image. Please try another image.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Custom Logo</h2>
        <p className="text-sm text-muted-foreground">
          Upload a custom logo to be displayed on your packing slips. Recommended size: 353 x 65 pixels.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="logo-width" className="block text-sm font-medium text-muted-foreground mb-1">
              Logo Width (px)
            </Label>
            <Input
              id="logo-width"
              type="number"
              value={logoWidth}
              onChange={(e) => setLogoWidth(Number(e.target.value))}
              min={50}
              max={500}
            />
          </div>
          <div>
            <Label htmlFor="logo-height" className="block text-sm font-medium text-muted-foreground mb-1">
              Logo Height (px)
            </Label>
            <Input
              id="logo-height"
              type="number"
              value={logoHeight}
              onChange={(e) => setLogoHeight(Number(e.target.value))}
              min={20}
              max={200}
            />
          </div>
        </div>

        <div>
          <label htmlFor="logo" className="block text-sm font-medium text-muted-foreground mb-1">
            Logo Image
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label
                htmlFor="logo-upload"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-background"
              >
                {previewUrl ? (
                  <div className="relative w-full h-full p-4">
                    <SafeImage src={previewUrl} alt="Preview" className="w-full h-full" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground/70 mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload logo</span>
                  </div>
                )}
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleRemoveLogo} disabled={!savedLogo && !previewUrl}>
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Logo
          </Button>
          <Button onClick={handleSaveLogo} disabled={!previewUrl}>
            <Save className="h-4 w-4 mr-2" />
            Save Logo
          </Button>
        </div>

        {savedLogo && !previewUrl && (
          <div className="mt-4 p-4 bg-background rounded-lg border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Current Logo:</h3>
            <div className="h-16 bg-card p-2 rounded border border-border">
              <SafeImage src={savedLogo} alt="Current Logo" className="h-full w-auto mx-auto" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
