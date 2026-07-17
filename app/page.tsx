"use client"

import { useState } from "react"
import { Upload, FileText, Settings, ImageIcon, FileCode, Printer, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DeleteDataDialog } from "@/components/delete-data-dialog"

export default function Home() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const router = useRouter()

  // Function to handle file upload
  const handleUploadClick = () => {
    // Create a temporary input element
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".csv"
    input.style.display = "none"

    // Add event listener for file selection
    input.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files[0]) {
        const file = target.files[0]

        // Create a FileReader to read the file content
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target && event.target.result) {
            // Store CSV content in localStorage
            localStorage.setItem("csvContent", event.target.result as string)

            // Extract and store headers
            const content = event.target.result as string
            const headers = content
              .split("\n")[0]
              .split(",")
              .map((h) => h.trim())
            localStorage.setItem("csvHeaders", JSON.stringify(headers))

            // Navigate to the map-columns page
            router.push("/map-columns")
          }
        }
        reader.readAsText(file)
      }
    })

    // Trigger the file dialog
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }

  const cards = [
    {
      id: "upload",
      title: "Upload Orders",
      description: "Upload your TikTok Shop orders CSV file to generate packing slips",
      icon: <Upload className="h-8 w-8 mb-4 text-pink-500" />,
      action: handleUploadClick,
      primary: true,
    },
    {
      id: "map-columns",
      title: "Map Columns",
      description: "Configure how your CSV columns map to order data fields",
      icon: <FileText className="h-8 w-8 mb-4 text-blue-500" />,
      href: "/map-columns",
    },
    {
      id: "sku-images",
      title: "SKU Images",
      description: "Upload a CSV with SKU and image URL mappings",
      icon: <ImageIcon className="h-8 w-8 mb-4 text-green-500" />,
      href: "/sku-images",
    },
    {
      id: "templates",
      title: "Custom Templates",
      description: "Create and edit custom packing slip templates",
      icon: <FileCode className="h-8 w-8 mb-4 text-purple-500" />,
      href: "/templates",
    },
    {
      id: "settings",
      title: "Settings",
      description: "Configure application settings and preferences",
      icon: <Settings className="h-8 w-8 mb-4 text-gray-500" />,
      href: "/settings",
    },
    {
      id: "results",
      title: "View Results",
      description: "View and print your generated packing slips",
      icon: <Printer className="h-8 w-8 mb-4 text-orange-500" />,
      href: "/results",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Grow Nest – Order Printer</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Generate professional packing slips for TikTok Shop orders with smart automation custom templates and powerful branding tools to simplify fulfillment process
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {cards.map((card) =>
            card.href ? (
              // Use Link for navigation cards
              <Link href={card.href} key={card.id} className="block">
                <div
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full transition-all duration-200 ${
                    hoveredCard === card.id
                      ? "transform -translate-y-1 shadow-md border-gray-300"
                      : "hover:shadow-md hover:border-gray-300"
                  } ${card.primary ? "ring-2 ring-pink-500 ring-opacity-50" : ""}`}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="flex flex-col items-center text-center">
                    {card.icon}
                    <h2 className="text-xl font-semibold mb-2">{card.title}</h2>
                    <p className="text-gray-600">{card.description}</p>
                  </div>
                </div>
              </Link>
            ) : (
              // Use Button for action cards (like upload)
              <div key={card.id} className="block">
                <Button
                  variant="ghost"
                  className={`w-full h-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 ${
                    hoveredCard === card.id
                      ? "transform -translate-y-1 shadow-md border-gray-300"
                      : "hover:shadow-md hover:border-gray-300"
                  } ${card.primary ? "ring-2 ring-pink-500 ring-opacity-50" : ""}`}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={card.action}
                >
                  <div className="flex flex-col items-center text-center">
                    {card.icon}
                    <h2 className="text-xl font-semibold mb-2">{card.title}</h2>
                    <p className="text-gray-600 break-words whitespace-normal leading-relaxed text-center text-base">
                      {card.description}
                    </p>
                  </div>
                </Button>
              </div>
            ),
          )}
        </div>

        <div className="mt-12 flex justify-center">
          <DeleteDataDialog
            trigger={
              <Button
                variant="outline"
                className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent"
              >
                <Trash2 className="h-4 w-4" />
                Delete All Data
              </Button>
            }
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">Grow Nest Order Printer – Where Digital Growth Takes Flight 🚀 Simplify your fulfillment elevate your brand</p>
          <p className="text-gray-400 text-xs mt-2">v1.1.0 · ATENEA CSV export fix (2026-07-17)</p>
        </div>
      </div>
    </div>
  )
}
