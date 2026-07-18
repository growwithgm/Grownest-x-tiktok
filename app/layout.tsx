import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AppShell } from "@/components/layout/app-shell"

export const metadata: Metadata = {
  title: "TokFlow by Grow Nest",
  description: "Turn raw TikTok orders into beautiful packing slips",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Newsreader loads at runtime so builds stay hermetic; Georgia is the fallback */}
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <AppShell>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
