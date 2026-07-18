"use client"

import Link from "next/link"
import { LogoManager } from "@/components/logo-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  return (
    <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto">
      <p className="kicker mb-4">System</p>
      <h1 className="font-display text-4xl mb-3">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Branding, columns, SKU images, templates &amp; document defaults — all in one place.
      </p>

      <Tabs defaultValue="logo">
        <TabsList className="mb-6">
          <TabsTrigger value="logo">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="logo">
          <div className="tokflow-card p-6">
            <h2 className="font-display text-xl mb-1">Business profile</h2>
            <p className="text-sm text-muted-foreground mb-6">Your mark appears in the header of every packing slip.</p>
            <LogoManager />
          </div>
        </TabsContent>

        <TabsContent value="appearance">
          <div className="tokflow-card p-6 space-y-4">
            <h2 className="font-display text-xl">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Customize the appearance of your packing slips. More options coming soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { href: "/map-columns", label: "Column mapping", desc: "Match CSV headers to slip fields" },
          { href: "/sku-images", label: "SKU images", desc: "Product photos shown on slips" },
          { href: "/templates", label: "Templates", desc: "Custom packing slip layouts" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="tokflow-card p-5 hover:border-foreground/30 transition-colors">
            <p className="font-medium mb-1">{item.label}</p>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
