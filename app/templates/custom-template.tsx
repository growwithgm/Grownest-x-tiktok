"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function CustomTemplatePage() {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Save the user's custom template
    const htmlTemplate = `<div class="packing-slip">
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

    const cssTemplate = `/* Packing Slip Styles */
.packing-slip {
  font-family: Arial, sans-serif;
  max-width: 210mm; /* Standard A4 width */
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc; /* Added a border for visual separation */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* Align items to the top in case content height differs */
  margin-bottom: 20px;
}

.header-left h1 {
  font-size: 24px;
  margin: 0 0 5px 0; /* Reduced bottom margin */
}

.header-left p {
  margin: 0;
  font-size: 14px;
  color: #555;
}

.header-right {
  text-align: right;
}

.header-right p {
  margin: 0 0 5px 0; /* Reduced bottom margin */
  font-size: 14px;
}

.order-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  font-size: 14px;
  color: #333;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  font-size: 12px; /* Slightly smaller font for table content */
}

.items-table th,
.items-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.items-table th {
  background-color: #f2f2f2;
  font-weight: bold;
  text-transform: uppercase; /* Added uppercase for better readability of headers */
}

.items-table td.item-number {
  width: 3%; /* Adjust width for the number column */
  text-align: center;
}

.items-table td.item-image {
  width: 8%; /* Adjust width for the image column */
  text-align: center;
}

.item-image img {
  max-width: 40px; /* Slightly smaller image */
  max-height: 40px;
  object-fit: contain;
  vertical-align: middle; /* Align image vertically in the cell */
}

.items-table td.item-name {
  width: 30%; /* Allocate more space for the product name */
}

.items-table td.item-sku,
.items-table td.item-seller-sku,
.items-table td.item-quantity,
.items-table td.item-order-id {
  width: 12%; /* Adjust widths for other columns */
  text-align: center;
}

.footer {
  margin-top: 30px;
  padding-top: 15px;
  text-align: center; /* Center the logo in the footer */
}

.logo {
  max-width: 100px; /* Slightly smaller logo */
  vertical-align: middle; /* Align logo vertically */
}

/* Print-specific styles */
@media print {
  .packing-slip {
    padding: 0;
    border: none; /* Remove border for printing */
  }

  .items-table th,
  .items-table td {
    padding: 5px;
    font-size: 10px; /* Further reduce font size for printing if needed */
  }

  .page-break-after {
    page-break-after: always;
  }
}`

    // Save the template to localStorage
    const templateName = "User Custom Template"
    const savedTemplates = JSON.parse(localStorage.getItem("customTemplates") || "[]")
    const existingIndex = savedTemplates.findIndex((t: any) => t.name === templateName)

    if (existingIndex >= 0) {
      savedTemplates[existingIndex] = { name: templateName, html: htmlTemplate, css: cssTemplate }
    } else {
      savedTemplates.push({ name: templateName, html: htmlTemplate, css: cssTemplate })
    }

    localStorage.setItem("customTemplates", JSON.stringify(savedTemplates))

    // Set as default template
    localStorage.setItem("defaultTemplate", templateName)

    toast({
      title: "Template saved",
      description: `Your custom template has been saved and set as default`,
    })

    // Redirect to templates page
    router.push("/templates")
  }, [router, toast])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-border rounded-full border-t-foreground"></div>
    </div>
  )
}
