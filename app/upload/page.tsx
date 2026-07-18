"use client"

import { useState, useEffect } from "react"
import { Upload as UploadComponent } from "@/components/upload"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { WorkflowStepper } from "@/components/layout/workflow-stepper"

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Check for pending CSV file from the home page
  useEffect(() => {
    const pendingCsvContent = localStorage.getItem("pendingCsvContent")
    const pendingCsvFile = localStorage.getItem("pendingCsvFile")

    if (pendingCsvContent && pendingCsvFile) {
      try {
        const fileInfo = JSON.parse(pendingCsvFile)
        console.log("Found pending CSV file:", fileInfo.name)

        // Store the CSV content for the map-columns page
        localStorage.setItem("csvContent", pendingCsvContent)

        // Extract headers
        const headers = pendingCsvContent
          .split("\n")[0]
          .split(",")
          .map((h) => h.trim())
        localStorage.setItem("csvHeaders", JSON.stringify(headers))

        // Clear the pending file from localStorage to avoid processing it again
        localStorage.removeItem("pendingCsvContent")
        localStorage.removeItem("pendingCsvFile")

        // Show success toast
        toast({
          title: "CSV file loaded",
          description: `Successfully loaded ${fileInfo.name}`,
        })

        // Redirect to map-columns page
        setIsRedirecting(true)
        setTimeout(() => {
          router.push("/map-columns")
        }, 1000)
      } catch (error) {
        console.error("Error processing pending CSV file:", error)
        toast({
          variant: "destructive",
          title: "Error loading CSV",
          description: "Failed to process the CSV file. Please try uploading again.",
        })
      }
    }
  }, [router, toast])

  return (
    <div className="px-4 sm:px-8 py-10 max-w-4xl mx-auto">
      <p className="kicker mb-4">Step 01 / 03</p>
      <h1 className="font-display text-4xl mb-3">Upload your orders</h1>
      <p className="text-muted-foreground max-w-lg mb-8">
        Export your orders from TikTok Shop as a CSV and drop the file below. Nothing leaves your browser.
      </p>

      <WorkflowStepper current={1} />

      {isRedirecting ? (
        <div className="tokflow-card text-center py-12">
          <p className="text-lg">CSV file loaded successfully!</p>
          <p className="text-muted-foreground">Redirecting to column mapping...</p>
        </div>
      ) : (
        <UploadComponent />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <div className="tokflow-card p-6">
          <p className="kicker mb-4">What we look for</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ Recipient name, phone &amp; address</li>
            <li>✓ SKU, product &amp; quantity</li>
            <li>✓ Parcel weight in kg</li>
          </ul>
        </div>
        <div className="tokflow-card p-6">
          <p className="kicker mb-4">Good to know</p>
          <p className="text-sm text-muted-foreground">
            Columns don't need to be in any particular order — you'll map them on the next step, and we'll remember it
            for next time. Orders from the same buyer are merged into one slip.
          </p>
        </div>
      </div>
    </div>
  )
}
