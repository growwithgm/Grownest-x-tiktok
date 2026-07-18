import { jsPDF } from "jspdf"
import type { PackingSlipData } from "./types"
import html2canvas from "html2canvas"

// Process template with data
export function processTemplate(template: string, data: PackingSlipData): string {
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

// Generate PDF from HTML template
export async function generatePdfFromTemplate(packingSlips: PackingSlipData[], templateName?: string): Promise<void> {
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
      throw new Error("No template found. Please create a template or set a default template.")
    }

    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Process each packing slip
    for (let i = 0; i < packingSlips.length; i++) {
      if (i > 0) {
        doc.addPage()
      }

      const slip = packingSlips[i]

      // Process the template with data
      const processedHtml = processTemplate(template.html, slip)

      // Create a more isolated HTML structure with inline styles
      const fullHtml = `
        <div class="packing-slip-container" style="width: 210mm; padding: 10mm; box-sizing: border-box; background-color: white; font-family: Arial, sans-serif;">
          <style>
            ${template.css}
            /* Reset styles to avoid conflicts */
            .packing-slip-container * {
              box-sizing: border-box;
            }
            /* Fix for image loading */
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
          ${processedHtml}
        </div>
      `

      // Create a temporary iframe to render the HTML in isolation
      const iframe = document.createElement("iframe")
      iframe.style.width = "210mm"
      iframe.style.height = "297mm"
      iframe.style.position = "absolute"
      iframe.style.left = "-9999px"
      iframe.style.top = "0"
      iframe.style.border = "none"
      document.body.appendChild(iframe)

      try {
        // Wait for iframe to load
        await new Promise<void>((resolve) => {
          iframe.onload = () => resolve()

          // Set iframe content
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          if (iframeDoc) {
            iframeDoc.open()
            iframeDoc.write(fullHtml)
            iframeDoc.close()
          }
        })

        // Get the iframe document and container
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) throw new Error("Could not access iframe document")

        const container = iframeDoc.querySelector(".packing-slip-container") as HTMLElement
        if (!container) throw new Error("Could not find template container in iframe")

        // Pre-load all images to ensure they're ready before rendering
        const images = Array.from(container.querySelectorAll("img"))

        // Wait for all images to load or fail
        if (images.length > 0) {
          await Promise.all(
            images.map(
              (img) =>
                new Promise<void>((resolve) => {
                  // Handle successful load
                  img.onload = () => resolve()

                  // Handle load errors by replacing with placeholder
                  img.onerror = () => {
                    // Replace with a data URL placeholder
                    img.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E"
                    resolve()
                  }

                  // Force reload to trigger onload/onerror
                  const currentSrc = img.src
                  if (currentSrc) {
                    // For external URLs, try to use a proxy or convert to data URL if possible
                    if (currentSrc.startsWith("http") && !currentSrc.startsWith(window.location.origin)) {
                      // For TikTok Shop logo or other known images, use a data URL placeholder
                      if (currentSrc.includes("tts_logo.png")) {
                        img.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40' fill='none'%3E%3Crect width='120' height='40' fill='%23FE2C55'/%3E%3Ctext x='60' y='25' font-family='Arial' font-size='14' text-anchor='middle' fill='white'%3ETikTok Shop%3C/text%3E%3C/svg%3E"
                        resolve()
                        return
                      }

                      // For other external images, use a placeholder
                      img.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E"
                      resolve()
                    } else {
                      // For data URLs or same-origin URLs, just reload
                      img.src = currentSrc
                    }
                  } else {
                    resolve() // No src, nothing to load
                  }
                }),
            ),
          )
        }

        // Render the HTML to canvas with improved settings
        const canvas = await html2canvas(container, {
          scale: 2, // Higher scale for better quality
          logging: false, // Disable logging
          useCORS: true, // Allow loading cross-origin images
          allowTaint: true, // Allow tainted canvas
          backgroundColor: "#ffffff",
          imageTimeout: 0, // No timeout for image loading
          onclone: (clonedDoc) => {
            // Additional processing on the cloned document if needed
            const clonedImages = clonedDoc.querySelectorAll("img")
            clonedImages.forEach((img) => {
              img.crossOrigin = "anonymous"
            })
          },
        })

        // Add the canvas as an image to the PDF
        const imgData = canvas.toDataURL("image/jpeg", 0.95)
        const imgWidth = doc.internal.pageSize.getWidth()
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        doc.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight)
      } catch (renderError) {
        console.error("Error rendering template:", renderError)

        // Add error message to PDF instead of failing completely
        doc.setFontSize(16)
        doc.text("Error rendering template", 20, 20)
        doc.setFontSize(12)
        doc.text(`Error: ${renderError instanceof Error ? renderError.message : "Unknown error"}`, 20, 30)
        doc.text("Please check your template for errors and try again.", 20, 40)
      } finally {
        // Clean up
        document.body.removeChild(iframe)
      }
    }

    // Save the PDF
    doc.save("tiktok-shop-packing-slips.pdf")
  } catch (error) {
    console.error("Error generating PDF from template:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    alert(`There was an error generating the PDF: ${errorMessage}. Please try again.`)
  }
}
