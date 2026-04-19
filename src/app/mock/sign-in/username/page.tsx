"use client"

import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { CodapacLogo } from "@/components/codapac-logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MIN = 3
const MAX = 20
const USERNAME_RE = /^[a-z0-9_]+$/
const RESERVED = new Set(["admin", "root", "codapac", "support", "api", "help", "priya", "enzo", "quinn"])

type Status =
  | { kind: "idle" }
  | { kind: "invalid"; reason: string }
  | { kind: "checking" }
  | { kind: "taken" }
  | { kind: "available" }

export default function UsernamePage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const validation = useMemo(() => validate(username), [username])

  const [status, setStatus] = useState<Status>({ kind: "idle" })

  useEffect(() => {
    if (validation.kind !== "ok") {
      setStatus(
        username.length === 0
          ? { kind: "idle" }
          : { kind: "invalid", reason: validation.reason },
      )
      return
    }
    setStatus({ kind: "checking" })
    const t = setTimeout(() => {
      // UI stub — replace with real availability query
      if (RESERVED.has(username.toLowerCase())) {
        setStatus({ kind: "taken" })
      } else {
        setStatus({ kind: "available" })
      }
    }, 450)
    return () => clearTimeout(t)
  }, [username, validation])

  const canSubmit = status.kind === "available" && !submitting

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setTimeout(() => {
      router.push("/project" as Route)
    }, 500)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Floating top bar */}
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 pt-5">
        <Link
          href="/sign-in/verify"
          className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-px hover:border-foreground/30 hover:shadow-md"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </Link>

        <div className="hidden items-center gap-2 sm:inline-flex">
          <Step done>Email</Step>
          <Line />
          <Step done>Verify</Step>
          <Line />
          <Step active>Username</Step>
        </div>

        <CodapacLogo size="sm" />
      </div>

      <main className="flex flex-1 items-center justify-center overflow-hidden px-6 py-6">
        <Card className="w-full max-w-md rounded-2xl border-border bg-card p-7 shadow-lg">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold tracking-tight">Pick a username</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This is how your agents and teammates will tag you in the board and chat.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  @
                </span>
                <Input
                  id="username"
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  placeholder="ada"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  maxLength={MAX}
                  className="h-10 pl-7 pr-10 font-mono text-[13.5px]"
                  aria-invalid={status.kind === "invalid" || status.kind === "taken"}
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <StatusIcon status={status} />
                </span>
              </div>
              <StatusLine status={status} length={username.length} />
            </div>

            <ul className="grid gap-1 text-[12px] text-muted-foreground">
              <Rule ok={username.length >= MIN}>At least {MIN} characters</Rule>
              <Rule ok={username.length <= MAX && username.length > 0}>
                Up to {MAX} characters
              </Rule>
              <Rule ok={username.length === 0 || USERNAME_RE.test(username)}>
                Lowercase letters, numbers, and underscores only
              </Rule>
            </ul>

            <Button
              type="submit"
              className="mt-2 h-10 font-medium"
              disabled={!canSubmit}
            >
              {submitting ? "Finishing up…" : "Continue to board"}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              You can change this later in{" "}
              <span className="font-medium text-foreground">Settings → Profile</span>.
            </p>
          </form>
        </Card>
      </main>
    </div>
  )
}

function validate(value: string): { kind: "ok" } | { kind: "bad"; reason: string } {
  if (value.length === 0) return { kind: "bad", reason: "" }
  if (value.length < MIN) return { kind: "bad", reason: `Must be at least ${MIN} characters.` }
  if (value.length > MAX) return { kind: "bad", reason: `Must be at most ${MAX} characters.` }
  if (!USERNAME_RE.test(value))
    return { kind: "bad", reason: "Use lowercase letters, numbers, and underscores only." }
  return { kind: "ok" }
}

function StatusIcon({ status }: { status: Status }) {
  if (status.kind === "checking") {
    return (
      <svg className="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  if (status.kind === "available") {
    return (
      <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    )
  }
  if (status.kind === "taken" || status.kind === "invalid") {
    return (
      <svg className="h-4 w-4 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    )
  }
  return null
}

function StatusLine({ status, length }: { status: Status; length: number }) {
  const content = (() => {
    switch (status.kind) {
      case "available":
        return <span className="text-emerald-600">@username is available</span>
      case "taken":
        return <span className="text-destructive">That username is taken.</span>
      case "invalid":
        return status.reason ? <span className="text-destructive">{status.reason}</span> : null
      case "checking":
        return <span className="text-muted-foreground">Checking availability…</span>
      case "idle":
      default:
        return (
          <span className="text-muted-foreground">
            {length === 0 ? "Start typing to check availability." : null}
          </span>
        )
    }
  })()

  return <p className="min-h-[1rem] text-[12px]">{content}</p>
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`grid h-3.5 w-3.5 place-items-center rounded-full ${
          ok ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
        }`}
      >
        {ok ? (
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <span className="h-1 w-1 rounded-full bg-current" />
        )}
      </span>
      <span className={ok ? "text-foreground/80" : undefined}>{children}</span>
    </li>
  )
}

function Step({ children, active, done }: { children: React.ReactNode; active?: boolean; done?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
          : done
            ? "text-emerald-600"
            : "text-muted-foreground"
      }`}
    >
      {done && (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {children}
    </span>
  )
}

function Line() {
  return <span className="h-px w-4 bg-border" />
}
