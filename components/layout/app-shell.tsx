"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutGrid,
  Upload,
  Printer,
  Truck,
  Filter,
  SlidersHorizontal,
  Trash2,
  Table2,
  ImageIcon,
  FileCode,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DeleteDataDialog } from "@/components/delete-data-dialog"

const NAV = [
  {
    label: "Workflow",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutGrid },
      { href: "/upload", label: "Upload Orders", icon: Upload },
      { href: "/map-columns", label: "Map columns", icon: Table2 },
      { href: "/results", label: "Results", icon: Printer },
    ],
  },
  {
    label: "Convert",
    items: [
      { href: "/ship-file", label: "Ship File", icon: Truck },
      { href: "/fbt-filter", label: "FBT Filter", icon: Filter },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: SlidersHorizontal },
      { href: "/templates", label: "Templates", icon: FileCode },
      { href: "/sku-images", label: "SKU images", icon: ImageIcon },
    ],
  },
]

function GrowNestMark({ className }: { className?: string }) {
  // Simplified bird-over-nest mark from the TokFlow design
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden>
      <path d="M4 17c2.5 2 13.5 2 16 0" strokeLinecap="round" />
      <circle cx="12" cy="10" r="3.4" />
      <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <aside className="print:hidden hidden lg:flex w-[248px] shrink-0 flex-col border-r border-border bg-[#0d0d10] min-h-screen sticky top-0 max-h-screen">
        <Link href="/" className="flex items-center gap-3 px-5 pt-5 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground">
            <GrowNestMark className="h-5 w-5" />
          </span>
          <span>
            <span className="font-display block text-lg leading-none">TokFlow</span>
            <span className="kicker block mt-1">By Grow Nest</span>
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map((section) => (
            <div key={section.label} className="mt-4">
              <div className="kicker px-3 mb-2">{section.label}</div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border px-5 py-4 space-y-3">
          <DeleteDataDialog
            trigger={
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Trash2 className="h-4 w-4" />
                Delete all data
              </button>
            }
          />
          <p className="font-mono-ui text-[11px] text-muted-foreground/70">
            v2.0 · monochrome <span className="ml-2">● synced</span>
          </p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="print:hidden sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/90 backdrop-blur px-4 sm:px-6 py-3">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
              <GrowNestMark className="h-4 w-4" />
            </span>
            <span className="font-display">TokFlow</span>
          </Link>
          <div className="hidden sm:block flex-1 max-w-md">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              Search orders, SKUs, templates…
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/upload">
              <Button className="rounded-full font-medium">
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </Link>
          </div>
        </header>

        {/* Mobile nav strip */}
        <nav className="print:hidden lg:hidden flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
          {NAV.flatMap((s) => s.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs",
                pathname === item.href ? "bg-secondary text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
