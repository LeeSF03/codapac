"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const previewChat = [
  { name: "Priya", time: "11:42", text: "Parsed issue #128 — dropping a card on the board.", tint: "bg-amber-500" },
  { name: "Enzo", time: "11:45", text: "Picking it up. Branching feat/search-reset-cache.", tint: "bg-sky-500" },
  { name: "Quinn", time: "11:54", text: "Playwright green. Raising PR #412.", tint: "bg-emerald-500" },
]

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValid || sending) return
    setSending(true)
    const params = new URLSearchParams({ email })
    router.push(`/sign-in/verify?${params.toString()}`)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="shrink-0 bg-neutral-950 text-white">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
                C
              </div>
              <span className="text-[15px] font-bold tracking-tight">codapac</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <Button asChild variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white">
                <Link href="/">Home</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white">
                <a href="/#product">Product</a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white">
                <a href="/#agents">Agents</a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-white/80 hover:bg-white/10 hover:text-white">
                <a href="/#docs">Docs</a>
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="shadow-sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 items-center gap-8 overflow-hidden px-6 py-6 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        {/* Left: headline + big preview */}
        <section className="hidden h-full min-h-0 flex-col justify-center gap-5 lg:flex">
          <div>
            <h1 className="max-w-xl text-[40px] font-semibold leading-[1.05] tracking-tight">
              Your autonomous engineering team,{" "}
              <span className="text-muted-foreground">waiting on a sign in.</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Drop a GitHub issue and watch three agents plan, write and ship —
              from one board and one chat.
            </p>
          </div>

          <Card className="overflow-hidden rounded-3xl border-border bg-muted p-0 shadow-lg">
            {/* Board */}
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  acme/web · sprint 24
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  live
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { t: "To Do", dot: "bg-amber-500", items: ["SSO toggle", "Outlook spacing"] },
                  { t: "In Progress", dot: "bg-sky-500", items: ["Search reset cache"] },
                  { t: "Done", dot: "bg-emerald-500", items: ["Chart legend", "Skip button"] },
                ].map((col) => (
                  <div
                    key={col.t}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2.5"
                  >
                    <div className="flex items-center gap-1.5 px-0.5">
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <span className="text-[12px] font-semibold">{col.t}</span>
                      <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                        {col.items.length}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {col.items.map((i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] font-medium leading-snug shadow-xs"
                        >
                          {i}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="border-t border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[13px] font-semibold">Sprint chat</span>
                <span className="text-[11px] text-muted-foreground">#issue-128</span>
              </div>
              <div className="space-y-2.5">
                {previewChat.map((m, i) => (
                  <div key={i} className="flex gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0 text-[10px]">
                      <AvatarFallback className={`${m.tint} font-bold text-white`}>
                        {m.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 rounded-xl rounded-tl-sm border border-border bg-muted/60 px-3 py-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[12px] font-semibold">{m.name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{m.time}</span>
                      </div>
                      <p className="text-[12.5px] leading-snug text-foreground/90">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Right: sign-in card */}
        <section className="flex h-full items-center justify-center overflow-hidden">
          <Card className="w-full max-w-md rounded-2xl border-border bg-card p-7 shadow-lg">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in to codapac</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll email you a one-time code — no password needed.
            </p>

            <div className="mt-5 grid gap-2">
              <Button type="button" variant="outline" className="h-10 justify-center gap-2 font-medium">
                <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" />
                  <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a23.93 23.93 0 0 0 0 21.56l7.98-6.19Z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
                </svg>
                Continue with Google
              </Button>
            </div>

            <div className="my-4 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                or with email
              </span>
              <Separator className="flex-1" />
            </div>

            <form onSubmit={handleSendOtp} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                  required
                />
              </div>

              <Button type="submit" className="h-10 font-medium" disabled={!emailValid || sending}>
                {sending ? "Sending code…" : "Send one-time code"}
              </Button>
            </form>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              By signing in you agree to our{" "}
              <a href="/terms" className="underline-offset-4 hover:underline">Terms</a>{" "}
              and{" "}
              <a href="/privacy" className="underline-offset-4 hover:underline">Privacy</a>.
            </p>
          </Card>
        </section>
      </main>
    </div>
  )
}
