"use client"

import { useEffect, useState } from "react"
import { Upload, Table2, Truck, Filter, ImageIcon, FileCode, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { autoProcessUpload } from "@/lib/auto-mapping"

export default function Home() {
  const router = useRouter()
  const [stats, setStats] = useState({ slips: 0, rows: 0, templates: 0 })

  useEffect(() => {
    try {
      const slips = JSON.parse(localStorage.getItem("packingSlips") || "[]")
      const rows = JSON.parse(localStorage.getItem("rawCsvData") || "[]")
      const templates = JSON.parse(localStorage.getItem("customTemplates") || "[]")
      setStats({
        slips: Array.isArray(slips) ? slips.length : 0,
        rows: Array.isArray(rows) && rows.length > 1 ? rows.length - 1 : 0,
        templates: Array.isArray(templates) ? templates.length : 0,
      })
    } catch {
      // fresh browser — zeros are fine
    }
  }, [])

  const handleUploadClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".csv"
    input.style.display = "none"

    input.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files[0]) {
        const file = target.files[0]
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target && event.target.result) {
            const content = event.target.result as string
            localStorage.setItem("csvContent", content)
            const headers = content
              .split("\n")[0]
              .split(",")
              .map((h) => h.trim())
            localStorage.setItem("csvHeaders", JSON.stringify(headers))
            autoProcessUpload(content, headers).then((route) => router.push(route))
          }
        }
        reader.readAsText(file)
      }
    })

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }

  const tools = [
    { href: "/ship-file", label: "Ship File converter", desc: "Amazon tracking .txt → TikTok Ship File", icon: Truck },
    { href: "/fbt-filter", label: "FBT Filter", desc: "Strip Fulfilled-by-TikTok rows from an export", icon: Filter },
    { href: "/map-columns", label: "Map columns", desc: "Match CSV headers to slip fields", icon: Table2 },
    { href: "/templates", label: "Custom templates", desc: "Design your own packing slips", icon: FileCode },
    { href: "/sku-images", label: "SKU images", desc: "Show product photos on every slip", icon: ImageIcon },
    { href: "/settings", label: "Settings", desc: "Branding, PDF & data defaults", icon: SlidersHorizontal },
  ]

  return (
    <div className="px-4 sm:px-8 py-10 max-w-6xl mx-auto">
      <p className="kicker mb-4">TokFlow by Grow Nest · Seller Suite</p>
      <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mb-4">
        Turn raw TikTok orders into <em className="text-muted-foreground">beautiful</em> packing slips.
      </h1>
      <p className="text-muted-foreground max-w-xl mb-10">
        Import a CSV, map your columns once, and generate print-ready slips with your own branding — fulfillment,
        refined.
      </p>

      <div className="tokflow-card p-8 sm:p-10 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-8">
        <div className="flex-1">
          <span className="font-mono-ui inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" /> Ready to print
          </span>
          <h2 className="font-display text-2xl mb-2">Start a new batch</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Drop your TikTok Shop export and we'll group orders by recipient, total weights, and lay out clean slips
            automatically.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-full" onClick={handleUploadClick}>
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
            <Link href="/map-columns">
              <Button variant="outline" className="rounded-full bg-transparent">
                Map columns
              </Button>
            </Link>
          </div>
        </div>
        <div className="hidden sm:block relative w-56 shrink-0" aria-hidden>
          <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-3 rounded-xl bg-secondary" />
          <div className="relative rounded-xl bg-[#FAFAFA] text-[#141417] p-4 shadow-xl">
            <p className="font-mono-ui text-[9px] tracking-[0.2em] text-right">
              PACKING
              <br />
              SLIP
            </p>
            <div className="mt-3 space-y-2">
              <div className="h-1.5 w-3/4 rounded bg-[#141417]/80" />
              <div className="h-1.5 w-1/2 rounded bg-[#141417]/30" />
              <div className="h-1.5 w-2/3 rounded bg-[#141417]/30" />
              <div className="h-1.5 w-1/2 rounded bg-[#141417]/30" />
            </div>
            <p className="font-mono-ui mt-4 text-[9px] text-right">2.40kg</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {[
          { label: "Slips in last batch", value: stats.slips, sub: "grouped by buyer" },
          { label: "Rows uploaded", value: stats.rows, sub: "in the current CSV" },
          { label: "Saved templates", value: stats.templates, sub: stats.templates > 0 ? "ready to use" : "none yet" },
        ].map((s) => (
          <div key={s.label} className="tokflow-card p-5">
            <p className="kicker mb-3">{s.label}</p>
            <p className="font-display text-3xl">{String(s.value).padStart(2, "0")}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between mb-4">
        <h3 className="font-display text-xl">Jump back in</h3>
        <span className="kicker">{String(tools.length).padStart(2, "0")} tools</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="tokflow-card p-5 hover:border-foreground/30 transition-colors block"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-4">
              <tool.icon className="h-5 w-5" />
            </span>
            <p className="font-medium mb-1">{tool.label}</p>
            <p className="text-sm text-muted-foreground">{tool.desc}</p>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">Grow Nest — where digital growth takes flight.</p>
        <p className="font-mono-ui text-[11px] text-muted-foreground/70">v2.0.0 · monochrome</p>
      </div>
    </div>
  )
}
