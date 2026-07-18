"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, FileText, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { analyzePdfStructure, validatePdfLayout, optimizePdfParams } from "@/lib/grok-service"
import type { PackingSlipData } from "@/lib/types"

interface PdfAnalyzerProps {
  packingSlipData: PackingSlipData[]
  onOptimize: (optimizedData: PackingSlipData[]) => void
  htmlContent?: string
  pdfParams?: any
}

export function PdfAnalyzer({ packingSlipData, onOptimize, htmlContent, pdfParams }: PdfAnalyzerProps) {
  const { toast } = useToast()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [layoutIssues, setLayoutIssues] = useState<string[]>([])
  const [improvements, setImprovements] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("structure")
  const [optimizationComplete, setOptimizationComplete] = useState(false)

  const handleAnalyzeStructure = async () => {
    if (!packingSlipData.length) {
      toast({
        variant: "destructive",
        title: "No data to analyze",
        description: "Please generate packing slips first.",
      })
      return
    }

    setIsAnalyzing(true)
    setSuggestions([])
    setOptimizationComplete(false)

    try {
      // Analyze the first packing slip as a representative sample
      const result = await analyzePdfStructure(packingSlipData[0])
      setSuggestions(result.suggestions)

      if (result.optimizedData) {
        // If we have optimized data for the sample, apply similar optimizations to all slips
        const optimizedSlips = packingSlipData.map((slip) => {
          // Apply structural optimizations while preserving the original data
          return {
            ...slip,
            // Apply any specific optimizations here if needed
          }
        })

        toast({
          title: "Analysis complete",
          description: "Optimization suggestions are available.",
        })

        // Store the optimized data for later use
        if (onOptimize) {
          onOptimize(optimizedSlips)
        }
      }
    } catch (error) {
      console.error("Error analyzing PDF structure:", error)
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: "Failed to analyze PDF structure. Please try again.",
      })
    } finally {
      setIsAnalyzing(false)
      setOptimizationComplete(true)
    }
  }

  const handleValidateLayout = async () => {
    if (!htmlContent) {
      toast({
        variant: "destructive",
        title: "No content to validate",
        description: "Please generate packing slips first.",
      })
      return
    }

    setIsAnalyzing(true)
    setLayoutIssues([])
    setOptimizationComplete(false)

    try {
      const result = await validatePdfLayout(htmlContent)
      setLayoutIssues(result.issues)

      if (result.isValid) {
        toast({
          title: "Validation complete",
          description: "No layout issues found.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Layout issues found",
          description: `${result.issues.length} issues detected.`,
        })
      }
    } catch (error) {
      console.error("Error validating PDF layout:", error)
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: "Failed to validate PDF layout. Please try again.",
      })
    } finally {
      setIsAnalyzing(false)
      setOptimizationComplete(true)
    }
  }

  const handleOptimizeParams = async () => {
    if (!pdfParams) {
      toast({
        variant: "destructive",
        title: "No parameters to optimize",
        description: "Please generate packing slips first.",
      })
      return
    }

    setIsAnalyzing(true)
    setImprovements([])
    setOptimizationComplete(false)

    try {
      const result = await optimizePdfParams(pdfParams)
      setImprovements(result.improvements)

      toast({
        title: "Optimization complete",
        description: "PDF parameter suggestions are available.",
      })
    } catch (error) {
      console.error("Error optimizing PDF parameters:", error)
      toast({
        variant: "destructive",
        title: "Optimization failed",
        description: "Failed to optimize PDF parameters. Please try again.",
      })
    } finally {
      setIsAnalyzing(false)
      setOptimizationComplete(true)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          AI PDF Analyzer
        </CardTitle>
        <CardDescription>
          Use Grok AI to analyze and optimize your PDF output for better quality and consistency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="structure">Data Structure</TabsTrigger>
            <TabsTrigger value="layout">Layout Validation</TabsTrigger>
            <TabsTrigger value="params">PDF Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="structure" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Analyze your packing slip data structure to identify potential improvements for PDF generation.
            </p>

            {suggestions.length > 0 && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Analysis Complete</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {isAnalyzing && activeTab === "structure" && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Analyzing data structure...</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="layout" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Validate the HTML layout that will be converted to PDF to identify potential rendering issues.
            </p>

            {layoutIssues.length > 0 && (
              <Alert className="mt-4" variant={layoutIssues.length > 0 ? "destructive" : "default"}>
                {layoutIssues.length > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                <AlertTitle>
                  {layoutIssues.length > 0 ? "Layout Issues Found" : "Layout Validation Complete"}
                </AlertTitle>
                <AlertDescription>
                  {layoutIssues.length > 0 ? (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {layoutIssues.map((issue, index) => (
                        <li key={index} className="text-sm">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "No layout issues found."
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isAnalyzing && activeTab === "layout" && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Validating layout...</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="params" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Optimize PDF generation parameters for better output quality and consistency.
            </p>

            {improvements.length > 0 && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Optimization Complete</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {improvements.map((improvement, index) => (
                      <li key={index} className="text-sm">
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {isAnalyzing && activeTab === "params" && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Optimizing parameters...</span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          {optimizationComplete && (
            <Badge variant="outline" className="bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1" />
              Analysis Complete
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSuggestions([])
              setLayoutIssues([])
              setImprovements([])
              setOptimizationComplete(false)
            }}
            disabled={isAnalyzing || (!suggestions.length && !layoutIssues.length && !improvements.length)}
          >
            Clear Results
          </Button>
          <Button
            onClick={() => {
              if (activeTab === "structure") {
                handleAnalyzeStructure()
              } else if (activeTab === "layout") {
                handleValidateLayout()
              } else if (activeTab === "params") {
                handleOptimizeParams()
              }
            }}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                {activeTab === "structure"
                  ? "Analyze Structure"
                  : activeTab === "layout"
                    ? "Validate Layout"
                    : "Optimize Parameters"}
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
