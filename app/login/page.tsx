"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const configured = isSupabaseConfigured()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configured) return
    setError(null)
    setSubmitting(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message === "Invalid login credentials" ? "Wrong email or password." : signInError.message)
        return
      }
      const next = searchParams.get("next")
      router.push(next && next.startsWith("/") ? next : "/")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="kicker mb-3">By Grow Nest · Seller Suite</p>
          <h1 className="font-display text-5xl">TokFlow</h1>
        </div>

        <div className="tokflow-card p-6 sm:p-8">
          {!configured ? (
            <div className="text-center py-4">
              <p className="font-display text-xl mb-2">Supabase not configured</p>
              <p className="text-sm text-muted-foreground">
                Set <span className="font-mono-ui">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
                <span className="font-mono-ui">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to enable sign-in. See SETUP.md.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@grownest.es"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 border border-red-900/60 bg-red-950/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full rounded-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-1">
                Forgot your password? Ask the admin to reset it in Supabase.
              </p>
            </form>
          )}
        </div>

        <p className="font-mono-ui text-[11px] text-muted-foreground/70 text-center mt-6">
          v2.1.0 · monochrome · team access only
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
