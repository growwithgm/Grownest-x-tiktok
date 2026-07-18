"use client"

import { useState, useEffect, useRef } from "react"
import type { PackingSlipData } from "@/lib/types"

interface TemplateRendererProps {
  data: PackingSlipData
  templateName?: string
}

export function TemplateRenderer({ data, templateName }: TemplateRendererProps) {
  const [renderedHtml, setRenderedHtml] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      // Get the template
      let template: { html: string; css: string } | null = null

      // If templateName is provided, try to find that specific template
      if (templateName) {
        const templates = JSON.parse(localStorage.getItem("customTemplates") || "[]")
        template = templates.find((t: any) => t.name === templateName)
      }

      // If no template name provided or template not found, try to get default template
      if (!template) {
        const defaultTemplateName = localStorage.getItem("defaultTemplate")
        if (defaultTemplateName) {
          const templates = JSON.parse(localStorage.getItem("customTemplates") || "[]")
          template = templates.find((t: any) => t.name === defaultTemplateName)
        }
      }

      // If still no template, use built-in template
      if (!template) {
        setRenderedHtml("")
        return
      }

      // Process the template
      const processedHtml = processTemplate(template.html, data)
      const fullHtml = `<style>${template.css}</style>${processedHtml}`
      setRenderedHtml(fullHtml)
      setError(null)
    } catch (err) {
      console.error("Template rendering error:", err)
      setError(`Failed to render template: ${err instanceof Error ? err.message : "Unknown error"}`)
      setRenderedHtml("")
    }
  }, [data, templateName])

  // Handle image loading errors
  useEffect(() => {
    if (!containerRef.current || !renderedHtml) return

    const images = containerRef.current.querySelectorAll("img")
    images.forEach((img) => {
      img.onerror = () => {
        // Replace with a placeholder image on error
        img.src =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E"
      }
    })
  }, [renderedHtml])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Template Error</h3>
        <p>{error}</p>
      </div>
    )
  }

  if (!renderedHtml) {
    return null // Return null to use the default packing slip component
  }

  return (
    <div
      ref={containerRef}
      className="custom-template bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden print:shadow-none print:border-none print:rounded-none print:w-[210mm] print:mx-auto"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
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
  const uniqueOrderIds = new Set(data.items.map((item) => item.orderId || "").filter(Boolean))
  const totalOrders = uniqueOrderIds.size || 1 // Ensure at least 1 if no order IDs are present

  // Replace simple variables
  processed = processed
    .replace(/{{order_number}}/g, data.orderNumber)
    .replace(/{{date}}/g, currentDate)
    .replace(/{{customer_name}}/g, data.customer.name)
    .replace(/{{customer_phone}}/g, data.customer.phone)
    .replace(/{{customer_address}}/g, data.customer.address)
    .replace(/{{customer_username}}/g, data.customer.username || "")
    .replace(/{{total_items}}/g, totalItems.toString())
    .replace(/{{total_products}}/g, totalProducts.toString())
    .replace(/{{total_orders}}/g, totalOrders.toString())
    .replace(/{{total_weight}}/g, (data.totalWeight || 0).toFixed(2))

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
          .replace(/{{item_weight}}/g, (item.weight || 0).toFixed(2))
          .replace(/{{item_index}}/g, (index + 1).toString())

        return itemHtml
      })
      .join("")
  })

  return processed
}
