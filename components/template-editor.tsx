"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Info, Save, Code, Eye, Copy, AlertTriangle } from "lucide-react"
import type { PackingSlipData } from "@/lib/types"

interface TemplateEditorProps {
  sampleData?: PackingSlipData
  onSave?: (template: { name: string; html: string; css: string }) => void
  initialTemplate?: { name: string; html: string; css: string }
}

export function TemplateEditor({ sampleData, onSave, initialTemplate }: TemplateEditorProps) {
  const { toast } = useToast()
  const [templateName, setTemplateName] = useState(initialTemplate?.name || "My Custom Template")
  const [htmlCode, setHtmlCode] = useState(initialTemplate?.html || getDefaultHtmlTemplate())
  const [cssCode, setCssCode] = useState(initialTemplate?.css || getDefaultCssTemplate())
  const [previewHtml, setPreviewHtml] = useState("")
  const [activeTab, setActiveTab] = useState("html")
  const [error, setError] = useState<string | null>(null)

  // Generate preview when HTML or CSS changes
  useEffect(() => {
    try {
      // Process the template with sample data
      const processedHtml = processTemplate(htmlCode, sampleData || getSampleData())

      // Combine HTML and CSS for preview
      const fullHtml = `
        <style>${cssCode}</style>
        ${processedHtml}
      `
      setPreviewHtml(fullHtml)
      setError(null)
    } catch (err) {
      console.error("Template processing error:", err)
      setError(`Template error: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }, [htmlCode, cssCode, sampleData])

  const handleSave = () => {
    if (!templateName.trim()) {
      toast({
        variant: "destructive",
        title: "Template name required",
        description: "Please enter a name for your template",
      })
      return
    }

    try {
      // Validate template
      processTemplate(htmlCode, sampleData || getSampleData())

      // Save template
      if (onSave) {
        onSave({
          name: templateName,
          html: htmlCode,
          css: cssCode,
        })
      }

      // Save to localStorage
      const savedTemplates = JSON.parse(localStorage.getItem("customTemplates") || "[]")
      const existingIndex = savedTemplates.findIndex((t: any) => t.name === templateName)

      if (existingIndex >= 0) {
        savedTemplates[existingIndex] = { name: templateName, html: htmlCode, css: cssCode }
      } else {
        savedTemplates.push({ name: templateName, html: htmlCode, css: cssCode })
      }

      localStorage.setItem("customTemplates", JSON.stringify(savedTemplates))

      toast({
        title: "Template saved",
        description: `Template "${templateName}" has been saved successfully`,
      })
    } catch (err) {
      console.error("Template save error:", err)
      toast({
        variant: "destructive",
        title: "Template error",
        description: err instanceof Error ? err.message : "Unknown error occurred while saving template",
      })
    }
  }

  const copyVariablesToClipboard = () => {
    const variables = [
      "{{order_number}}",
      "{{date}}",
      "{{customer_name}}",
      "{{customer_phone}}",
      "{{customer_address}}",
      "{{customer_username}}",
      "{{total_items}}",
      "{{total_products}}",
      "{{total_orders}}",
      "{{items}}",
      "{{item_name}}",
      "{{item_sku}}",
      "{{item_seller_sku}}",
      "{{item_quantity}}",
      "{{item_order_id}}",
      "{{item_image_url}}",
    ].join("\n")

    navigator.clipboard.writeText(variables)
    toast({
      title: "Variables copied",
      description: "Template variables have been copied to clipboard",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="template-name" className="mb-2 block">
            Template Name
          </Label>
          <Input
            id="template-name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyVariablesToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Variables
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Template Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Template Variables</AlertTitle>
        <AlertDescription>
          <p className="mb-2">Use these variables in your template to display dynamic data:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <code>{"{{order_number}}"}</code> - Order number
            </div>
            <div>
              <code>{"{{date}}"}</code> - Current date
            </div>
            <div>
              <code>{"{{customer_name}}"}</code> - Customer name
            </div>
            <div>
              <code>{"{{customer_phone}}"}</code> - Customer phone
            </div>
            <div>
              <code>{"{{customer_address}}"}</code> - Customer address
            </div>
            <div>
              <code>{"{{customer_username}}"}</code> - Customer username
            </div>
            <div>
              <code>{"{{total_items}}"}</code> - Total item quantity
            </div>
            <div>
              <code>{"{{total_products}}"}</code> - Number of products
            </div>
            <div>
              <code>{"{{total_orders}}"}</code> - Number of orders
            </div>
          </div>
          <p className="mt-2 mb-1">For item loops, use:</p>
          <pre className="bg-secondary p-2 rounded text-sm overflow-x-auto">
            {`{{#items}}
  <tr>
    <td>{{item_name}}</td>
    <td>{{item_sku}}</td>
    <td>{{item_seller_sku}}</td>
    <td>{{item_quantity}}</td>
    <td>{{item_order_id}}</td>
    <td><img src="{{item_image_url}}" alt="Product" /></td>
  </tr>
{{/items}}`}
          </pre>
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="html">
            <Code className="h-4 w-4 mr-2" />
            HTML
          </TabsTrigger>
          <TabsTrigger value="css">
            <Code className="h-4 w-4 mr-2" />
            CSS
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="html" className="border rounded-md p-4">
          <textarea
            value={htmlCode}
            onChange={(e) => setHtmlCode(e.target.value)}
            className="w-full h-[500px] font-mono text-sm p-4 border rounded"
            spellCheck={false}
          />
        </TabsContent>

        <TabsContent value="css" className="border rounded-md p-4">
          <textarea
            value={cssCode}
            onChange={(e) => setCssCode(e.target.value)}
            className="w-full h-[500px] font-mono text-sm p-4 border rounded"
            spellCheck={false}
          />
        </TabsContent>

        <TabsContent value="preview" className="border rounded-md p-4">
          <div className="bg-card border rounded-lg p-4 h-[500px] overflow-auto">
            <iframe
              srcDoc={previewHtml}
              title="Template Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper function to process template with data
function processTemplate(template: string, data: PackingSlipData): string {
  let processed = template

  // Process simple variables
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Calculate totals
  const totalItems = data.items.reduce((total, item) => total + item.quantity, 0)
  const totalProducts = data.items.length
  const uniqueOrderIds = new Set(data.items.map((item) => item.orderId))
  const totalOrders = uniqueOrderIds.size

  // Replace simple variables
  processed = processed
    .replace(/{{order_number}}/g, data.orderNumber)
    .replace(/{{date}}/g, currentDate)
    .replace(/{{customer_name}}/g, data.customer.name)
    .replace(/{{customer_phone}}/g, data.customer.phone)
    .replace(/{{customer_address}}/g, data.customer.address)
    .replace(/{{customer_username}}/g, data.customer.username)
    .replace(/{{total_items}}/g, totalItems.toString())
    .replace(/{{total_products}}/g, totalProducts.toString())
    .replace(/{{total_orders}}/g, totalOrders.toString())

  // Process items loop
  const itemsRegex = /{{#items}}([\s\S]*?){{\/items}}/g
  processed = processed.replace(itemsRegex, (match, itemTemplate) => {
    return data.items
      .map((item, index) => {
        const itemHtml = itemTemplate
          .replace(/{{item_name}}/g, item.name)
          .replace(/{{item_sku}}/g, item.sku || "")
          .replace(/{{item_seller_sku}}/g, item.sellerSku || "")
          .replace(/{{item_quantity}}/g, item.quantity.toString())
          .replace(/{{item_order_id}}/g, item.orderId || "")
          .replace(/{{item_image_url}}/g, item.imageUrl || "")
          .replace(/{{item_index}}/g, (index + 1).toString()) // Add item index

        return itemHtml
      })
      .join("")
  })

  return processed
}

// Default HTML template
function getDefaultHtmlTemplate(): string {
  return `<div class="packing-slip">
  <div class="header">
    <div class="header-left">
      <h1>PACKING SLIP</h1>
      <p class="order-number">ORDER #{{order_number}}</p>
      <p class="date">DATE: {{date}}</p>
    </div>
    <div class="header-right">
      <p class="customer-name">{{customer_name}}</p>
      <p class="customer-address">{{customer_address}}</p>
      <p class="customer-phone">{{customer_phone}}</p>
    </div>
  </div>

  <div class="order-summary">
    <span>Order quantity: {{total_orders}}</span>
    <span>Product quantity: {{total_products}}</span>
    <span>Item quantity: {{total_items}}</span>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>No.</th>
        <th>Product Image</th>
        <th>Product name</th>
        <th>SKU</th>
        <th>Seller SKU</th>
        <th>Qty</th>
        <th>Order ID</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td class="item-number">{{item_index}}</td>
        <td class="item-image">
          <img src="{{item_image_url}}" alt="Product" />
        </td>
        <td class="item-name">{{item_name}}</td>
        <td class="item-sku">{{item_sku}}</td>
        <td class="item-seller-sku">{{item_seller_sku}}</td>
        <td class="item-quantity">{{item_quantity}}</td>
        <td class="item-order-id">{{item_order_id}}</td>
      </tr>
      {{/items}}
    </tbody>
  </table>

  <div class="footer">
    <img src="https://cdn.shopify.com/s/files/1/0556/0359/3529/files/tts_logo.png?v=1746866929" alt="TikTok Shop" class="logo" />
  </div>
</div>`
}

// Default CSS template
function getDefaultCssTemplate(): string {
  return `/* Packing Slip Styles */
.packing-slip {
  font-family: Arial, sans-serif;
  max-width: 210mm;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-left h1 {
  font-size: 24px;
  margin: 0 0 10px 0;
}

.header-right {
  text-align: right;
}

.order-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  font-size: 14px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.items-table th, .items-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.items-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.item-image img {
  max-width: 50px;
  max-height: 50px;
  object-fit: contain;
}

.footer {
  margin-top: 30px;
  border-top: 1px solid #ddd;
  padding-top: 15px;
}

.logo {
  max-width: 120px;
}

/* Print-specific styles */
@media print {
  .packing-slip {
    padding: 0;
  }
  
  .items-table th, .items-table td {
    padding: 5px;
  }
  
  .page-break-after {
    page-break-after: always;
  }
}`
}

// Sample data for preview
function getSampleData(): PackingSlipData {
  return {
    orderNumber: "TK12345678",
    customer: {
      name: "John Doe",
      address: "123 Main St, Apt 4B, New York, NY 10001",
      phone: "+1 (555) 123-4567",
      username: "johndoe123",
    },
    items: [
      {
        name: "Premium Wireless Headphones",
        sku: "WH-PRO-100",
        sellerSku: "SELLER-WH100",
        quantity: 1,
        orderId: "ORD-001",
        imageUrl: "https://cdn.shopify.com/s/files/1/0556/0359/3529/files/tts_logo.png?v=1746866929",
      },
      {
        name: "Smartphone Stand with Wireless Charger",
        sku: "SS-WC-200",
        sellerSku: "SELLER-SS200",
        quantity: 2,
        orderId: "ORD-002",
        imageUrl: "https://cdn.shopify.com/s/files/1/0556/0359/3529/files/tts_logo.png?v=1746866929",
      },
    ],
  }
}
