"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Save, HelpCircle, Loader2, FileText, AlertTriangle, Info, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { WorkflowStepper } from "@/components/layout/workflow-stepper"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { processCSVWithMapping } from "@/lib/csv-processor"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export default function MapColumnsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvContent, setCsvContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [savedMappings, setSavedMappings] = useState<Record<string, string[]>>({})
  const [mappingName, setMappingName] = useState<string>("default")
  const [saveAsDefault, setSaveAsDefault] = useState(true)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [csvSample, setCsvSample] = useState<string>("")
  const [activeTab, setActiveTab] = useState("mapping")
  const [showUsernameHelp, setShowUsernameHelp] = useState(true)
  const [isTikTokShopCSV, setIsTikTokShopCSV] = useState(false)

  // Define required fields
  const requiredFields = [
    {
      id: "buyerUsername",
      label: "Buyer Username",
      description: "Username of the buyer - CRITICAL for order grouping",
    },
    { id: "orderId", label: "Order ID", description: "Unique identifier for the order" },
    { id: "productName", label: "Product Name", description: "Name of the product" },
    { id: "sku", label: "SKU", description: "Stock Keeping Unit" },
    { id: "sellerSku", label: "Seller SKU", description: "Seller's Stock Keeping Unit" },
    { id: "quantity", label: "Quantity", description: "Number of items ordered" },
    { id: "recipientName", label: "Recipient Name", description: "Name of the recipient" },
    { id: "phoneNumber", label: "Phone Number", description: "Contact phone number" },
    { id: "addressLine1", label: "Address Line 1", description: "First line of shipping address" },
    { id: "addressLine2", label: "Address Line 2", description: "Second line of shipping address" },
    { id: "city", label: "City", description: "City for shipping address" },
    { id: "state", label: "State", description: "State/Province for shipping address" },
    { id: "postalCode", label: "Postal Code", description: "ZIP/Postal code for shipping address" },
    { id: "weight", label: "Weight (Kg)", description: "Weight of the package in kilograms" },
  ]

  // Initialize mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    requiredFields.reduce((acc, field) => ({ ...acc, [field.id]: "none" }), {}),
  )

  useEffect(() => {
    // Load CSV headers and content from localStorage
    const storedHeaders = localStorage.getItem("csvHeaders")
    const storedContent = localStorage.getItem("csvContent")
    const storedMappings = localStorage.getItem("columnMappings")

    if (storedHeaders) {
      try {
        const headers = JSON.parse(storedHeaders)
        setCsvHeaders(headers)

        // Check if this is a TikTok Shop CSV
        const isTikTok = headers.some(
          (h) => h === "Buyer Username" || h === "Order ID" || (h === "Recipient" && headers.includes("Phone #")),
        )
        setIsTikTokShopCSV(isTikTok)
      } catch (error) {
        console.error("Failed to parse CSV headers:", error)
        setProcessingError("Failed to parse CSV headers. Please try uploading the file again.")
        return
      }
    } else {
      // Don't redirect, just show a message
      setProcessingError("No CSV data found. Please upload a CSV file first.")
      return
    }

    if (storedContent) {
      setCsvContent(storedContent)

      // Create a sample of the CSV content for debugging
      try {
        const lines = storedContent.split("\n").slice(0, 5).join("\n")
        setCsvSample(lines)
      } catch (error) {
        console.error("Failed to create CSV sample:", error)
      }
    } else {
      setProcessingError("No CSV data found. Please upload a CSV file first.")
      return
    }

    if (storedMappings) {
      try {
        const mappings = JSON.parse(storedMappings)
        setSavedMappings(mappings)

        // If there's a default mapping, use it
        if (mappings.default) {
          const defaultMapping: Record<string, string> = {}
          requiredFields.forEach((field, index) => {
            defaultMapping[field.id] = mappings.default[index] || "none"
          })
          setColumnMapping(defaultMapping)
        }
      } catch (error) {
        console.error("Failed to parse column mappings:", error)
      }
    }
  }, [])

  const handleMappingChange = (fieldId: string, columnName: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [fieldId]: columnName,
    }))
  }

  const handleSaveMapping = () => {
    // Convert mapping object to array to save space
    const mappingArray = requiredFields.map((field) =>
      columnMapping[field.id] === "none" ? "" : columnMapping[field.id],
    )

    // Save to localStorage
    const updatedMappings = {
      ...savedMappings,
      [mappingName]: mappingArray,
    }

    localStorage.setItem("columnMappings", JSON.stringify(updatedMappings))
    setSavedMappings(updatedMappings)

    toast({
      title: "Mapping saved",
      description: `Column mapping "${mappingName}" has been saved`,
    })
  }

  const handleLoadMapping = (name: string) => {
    if (savedMappings[name]) {
      const loadedMapping: Record<string, string> = {}
      requiredFields.forEach((field, index) => {
        loadedMapping[field.id] = savedMappings[name][index] || "none"
      })
      setColumnMapping(loadedMapping)
      setMappingName(name)

      toast({
        title: "Mapping loaded",
        description: `Column mapping "${name}" has been loaded`,
      })
    }
  }

  const handleProcessCSV = async () => {
    // Reset error state
    setProcessingError(null)

    // Check if all required fields are mapped
    const unmappedFields = requiredFields.filter(
      (field) =>
        columnMapping[field.id] === "none" &&
        // These fields are required
        [
          "buyerUsername",
          "orderId",
          "productName",
          "sku",
          "sellerSku",
          "quantity",
          "recipientName",
          "phoneNumber",
          "weight",
        ].includes(field.id),
    )

    if (unmappedFields.length > 0) {
      toast({
        variant: "destructive",
        title: "Incomplete mapping",
        description: `Please map these required fields: ${unmappedFields.map((f) => f.label).join(", ")}`,
      })
      return
    }

    setIsLoading(true)

    try {
      // Save mapping as default if option is selected
      if (saveAsDefault) {
        const mappingArray = requiredFields.map((field) =>
          columnMapping[field.id] === "none" ? "" : columnMapping[field.id],
        )
        const updatedMappings = {
          ...savedMappings,
          default: mappingArray,
        }
        localStorage.setItem("columnMappings", JSON.stringify(updatedMappings))
      }

      console.log("Processing CSV with mapping:", columnMapping)
      console.log("CSV content length:", csvContent.length)
      console.log("CSV first 100 chars:", csvContent.substring(0, 100))

      // Process the CSV with the custom mapping
      const result = await processCSVWithMapping(csvContent, columnMapping)

      if (result.success && result.data.length > 0) {
        console.log("CSV processing successful. Generated packing slips:", result.data.length)
        localStorage.setItem("packingSlips", JSON.stringify(result.data))

        toast({
          title: "Processing complete",
          description: `Generated ${result.data.length} packing slips`,
        })

        // Redirect to results page
        router.push("/results")
      } else {
        throw new Error(result.error || "Failed to process CSV. No valid orders found.")
      }
    } catch (error) {
      console.error("CSV processing error:", error)
      setProcessingError(error instanceof Error ? error.message : "An unknown error occurred")
      toast({
        variant: "destructive",
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-detect column mappings based on header names
  const autoDetectMappings = () => {
    const newMapping = { ...columnMapping }

    // TikTok Shop specific mappings
    if (isTikTokShopCSV) {
      // Direct mappings for TikTok Shop CSV
      const tikTokMappings: Record<string, string[]> = {
        orderId: ["Order ID"],
        productName: ["Product Name"],
        sku: ["SKU ID"],
        sellerSku: ["Seller SKU"],
        quantity: ["Quantity"],
        buyerUsername: ["Buyer Username"],
        recipientName: ["Recipient"],
        phoneNumber: ["Phone #"],
        addressLine1: ["Street Name"],
        addressLine2: ["House Name or Number"],
        city: ["City"],
        state: ["Province", "Autonomous Community"],
        postalCode: ["Zipcode"],
        weight: ["Weight (Kg)", "Weight", "Package Weight"],
      }

      // Apply TikTok Shop mappings
      for (const [fieldId, headers] of Object.entries(tikTokMappings)) {
        for (const header of headers) {
          if (csvHeaders.includes(header)) {
            newMapping[fieldId] = header
            break
          }
        }
      }

      // Check for shipping information column for address
      const shippingInfoHeader = csvHeaders.find((h) => h === "Shipping Information")
      if (shippingInfoHeader && !newMapping.addressLine1) {
        // If we have shipping info but no address line, we'll use it later in processing
        console.log("Found Shipping Information column for address data")
      }

      setColumnMapping(newMapping)

      toast({
        title: "TikTok Shop CSV Detected",
        description: "Column mappings have been automatically configured for TikTok Shop format",
      })

      return
    }

    // Generic mappings for other CSV formats
    const headerMap: Record<string, string[]> = {
      orderId: ["order id", "orderid", "order number", "order #", "order no", "order_id", "id"],
      productName: [
        "product name",
        "product",
        "item name",
        "title",
        "product title",
        "product_name",
        "item_name",
        "name",
      ],
      sku: ["sku", "product id", "item id", "product code", "product_id", "item_id", "product_code"],
      sellerSku: ["seller sku", "seller id", "merchant sku", "your sku", "seller_sku", "merchant_sku", "your_sku"],
      quantity: ["quantity", "qty", "amount", "count", "item count", "item_count"],
      buyerUsername: [
        "buyer username",
        "buyer",
        "customer username",
        "username",
        "buyer_username",
        "customer_username",
        "user",
        "customer id",
        "customer_id",
        "buyer id",
        "buyer_id",
        "email",
        "customer email",
        "buyer email",
        "customer_email",
        "buyer_email",
      ],
      recipientName: [
        "recipient name",
        "recipient",
        "customer name",
        "name",
        "buyer name",
        "recipient_name",
        "customer_name",
        "buyer_name",
        "ship to name",
        "shipping name",
      ],
      phoneNumber: ["phone number", "phone", "tel", "telephone", "contact number", "phone_number", "contact_number"],
      addressLine1: [
        "address line 1",
        "address1",
        "address line",
        "street address",
        "address_line_1",
        "address_1",
        "street_address",
        "address",
        "shipping address",
      ],
      addressLine2: [
        "address line 2",
        "address2",
        "apartment",
        "suite",
        "unit",
        "address_line_2",
        "address_2",
        "apt",
        "suite_number",
      ],
      city: ["city", "town", "municipality"],
      state: ["state", "province", "region", "county"],
      postalCode: ["postal code", "zip", "zip code", "postcode", "postal_code", "zip_code"],
      weight: ["weight", "weight (kg)", "weight kg", "package weight", "item weight", "total weight"],
    }

    // For each field, try to find a matching header
    for (const [fieldId, searchTerms] of Object.entries(headerMap)) {
      // Skip if already mapped (and not "none")
      if (newMapping[fieldId] !== "none") continue

      // Try to find a match
      for (const header of csvHeaders) {
        const headerLower = header.toLowerCase()
        if (searchTerms.some((term) => headerLower.includes(term) || term.includes(headerLower))) {
          newMapping[fieldId] = header
          break
        }
      }
    }

    setColumnMapping(newMapping)
    toast({
      title: "Auto-detection complete",
      description: "Column mappings have been automatically detected where possible",
    })
  }

  return (
    <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <p className="kicker mb-4">Step 02 / 03</p>
          <h2 className="font-display text-4xl mb-3">Map your columns</h2>
          <p className="text-muted-foreground">Match CSV headers to slip fields — we'll remember it for next time.</p>
        </div>
        <Button variant="outline" className="rounded-full bg-transparent" onClick={autoDetectMappings}>
          Auto-Detect Columns
        </Button>
      </div>
      <WorkflowStepper current={2} />

      {processingError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{processingError}</AlertDescription>
          <div className="mt-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                Go to Upload Page
              </Button>
            </Link>
          </div>
        </Alert>
      )}

      {isTikTokShopCSV && !processingError && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">TikTok Shop CSV Detected</AlertTitle>
          <AlertDescription className="text-green-700">
            <p>
              We've detected that you're using a TikTok Shop CSV format. Click "Auto-Detect Columns" to automatically
              map the columns correctly.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-green-700 border-green-300 hover:bg-green-100 bg-transparent"
              onClick={autoDetectMappings}
            >
              Auto-Detect Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showUsernameHelp && !processingError && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Important: Buyer Username Field</AlertTitle>
          <AlertDescription className="text-blue-700">
            <p className="mb-2">
              The <strong>Buyer Username</strong> field is critical for grouping orders by customer. If your CSV doesn't
              have a specific username column:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Map it to any column that uniquely identifies the customer (email, customer ID, etc.)</li>
              <li>If no such column exists, the system will try to generate usernames from other fields</li>
              <li>For best results, map as many fields as possible, especially Order ID and Recipient Name</li>
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-blue-700 border-blue-300 hover:bg-blue-100 bg-transparent"
              onClick={() => setShowUsernameHelp(false)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!processingError && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="mapping">Column Mapping</TabsTrigger>
                <TabsTrigger value="weight">Weight Column</TabsTrigger>
                <TabsTrigger value="debug">CSV Debug</TabsTrigger>
              </TabsList>

              <TabsContent value="mapping" className="mt-6">
                {/* Buyer Username field - highlighted separately */}
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label htmlFor="buyerUsername" className="text-sm font-medium text-blue-800">
                        Buyer Username <span className="text-red-500">*</span>
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 ml-1 text-blue-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Username of the buyer - CRITICAL for order grouping</p>
                            <p className="text-red-500 mt-1">Required field</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={columnMapping.buyerUsername}
                      onValueChange={(value) => handleMappingChange("buyerUsername", value)}
                    >
                      <SelectTrigger id="buyerUsername" className="border-blue-300 focus:ring-blue-500">
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Select a column --</SelectItem>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {requiredFields
                    .filter((field) => field.id !== "buyerUsername") // Skip buyerUsername as it's handled separately
                    .map((field) => (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center">
                          <label htmlFor={field.id} className="text-sm font-medium text-muted-foreground">
                            {field.label}
                            {[
                              "orderId",
                              "productName",
                              "sku",
                              "sellerSku",
                              "quantity",
                              "recipientName",
                              "phoneNumber",
                              "weight",
                            ].includes(field.id) && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground/70" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{field.description}</p>
                                {[
                                  "orderId",
                                  "productName",
                                  "sku",
                                  "sellerSku",
                                  "quantity",
                                  "recipientName",
                                  "phoneNumber",
                                  "weight",
                                ].includes(field.id) && <p className="text-red-500 mt-1">Required field</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Select
                          value={columnMapping[field.id]}
                          onValueChange={(value) => handleMappingChange(field.id, value)}
                        >
                          <SelectTrigger id={field.id}>
                            <SelectValue placeholder="Select a column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Select a column --</SelectItem>
                            {csvHeaders.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 bg-background rounded-lg border border-border">
                  <div className="flex-1">
                    <label htmlFor="mapping-name" className="block text-sm font-medium text-muted-foreground mb-2">
                      Mapping Name
                    </label>
                    <div className="flex gap-2">
                      <Select value={mappingName} onValueChange={setMappingName}>
                        <SelectTrigger id="mapping-name">
                          <SelectValue placeholder="Select a mapping" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          {Object.keys(savedMappings)
                            .filter((name) => name !== "default")
                            .map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => handleLoadMapping(mappingName)}>
                        Load
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Save Current Mapping</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={mappingName}
                        onChange={(e) => setMappingName(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Mapping name"
                      />
                      <Button variant="outline" onClick={handleSaveMapping}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-6">
                  <Switch id="save-default" checked={saveAsDefault} onCheckedChange={setSaveAsDefault} />
                  <Label htmlFor="save-default">Save this mapping as default for future uploads</Label>
                </div>
              </TabsContent>

              <TabsContent value="weight" className="mt-6">
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Weight Column Configuration</AlertTitle>
                    <AlertDescription>
                      Configure the Weight (Kg) column for CSV export functionality. This is required for generating
                      shipping reports.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <label htmlFor="weightColumn" className="text-sm font-medium text-blue-800">
                          Weight (Kg) Column <span className="text-red-500">*</span>
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 ml-1 text-blue-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Select the column that contains weight data in kilograms</p>
                              <p className="text-blue-600 mt-1">Default: Column 50</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={columnMapping.weight || "50"}
                        onValueChange={(value) => handleMappingChange("weight", value)}
                      >
                        <SelectTrigger id="weightColumn" className="border-blue-300 focus:ring-blue-500">
                          <SelectValue placeholder="Select weight column (default: 50)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">Column 50 (Default)</SelectItem>
                          {csvHeaders.map((header, index) => (
                            <SelectItem key={header} value={(index + 1).toString()}>
                              Column {index + 1}: {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-background p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Weight Column Information</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Weight values should be in kilograms (Kg)</li>
                      <li>• Column 50 is the standard location for weight data</li>
                      <li>• Empty or non-numeric values will be treated as 0</li>
                      <li>• This column is required for CSV export functionality</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="debug" className="mt-6">
                <div className="space-y-4">
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertTitle>CSV Debug Information</AlertTitle>
                    <AlertDescription>
                      This section shows information about your CSV file to help troubleshoot any issues.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Available CSV Headers ({csvHeaders.length})</h3>
                    <div className="bg-background p-3 rounded border text-xs font-mono overflow-x-auto">
                      {csvHeaders.join(", ")}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">CSV Sample (First 5 lines)</h3>
                    <div className="bg-background p-3 rounded border text-xs font-mono overflow-x-auto whitespace-pre">
                      {csvSample || "No sample available"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Current Column Mapping</h3>
                    <div className="bg-background p-3 rounded border text-xs font-mono overflow-x-auto">
                      {Object.entries(columnMapping).map(([field, column]) => (
                        <div key={field}>
                          <span className="font-semibold">{field}:</span> {column === "none" ? "(not mapped)" : column}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">CSV Format Requirements</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      <p className="mb-2">For the CSV processing to work correctly:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>The CSV must have a header row with column names</li>
                        <li>The "Buyer Username" field is required and must be mapped</li>
                        <li>Each order must have a valid Buyer Username to be processed</li>
                        <li>Make sure your CSV is properly formatted with commas as separators</li>
                        <li>If your CSV uses a different delimiter, convert it to comma-separated format</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-end border-t p-6">
            <Button onClick={handleProcessCSV} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process CSV with Mapping"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
