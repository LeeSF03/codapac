"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

const CODE_LENGTH = 6
const RESEND_SECONDS = 30

function VerifyCard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""

  const [code, setCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (code.length !== CODE_LENGTH || submittedRef.current) return
    submittedRef.current = true
    setVerifying(true)
    setError(null)
    const t = setTimeout(() => {
      // UI stub — replace with real verify call
      if (code === "000000") {
        setError("That code didn't match. Try again or resend.")
        setVerifying(false)
        setCode("")
        submittedRef.current = false
        return
      }
      router.push("/sign-in/username")
    }, 700)
    return () => clearTimeout(t)
  }, [code, router])

  const maskedEmail = useMemo(() => maskEmail(email), [email])

  const handleResend = () => {
    if (cooldown > 0) return
    setCooldown(RESEND_SECONDS)
    setCode("")
    setError(null)
    submittedRef.current = false
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border-border bg-card p-7 shadow-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Check your inbox</h2>
          <p className="text-[13px] text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{maskedEmail || "your email"}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex justify-center py-2">
          <InputOTP
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(v) => {
              setCode(v)
              if (error) setError(null)
            }}
            disabled={verifying}
            aria-invalid={!!error}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="size-12 text-base" />
              <InputOTPSlot index={1} className="size-12 text-base" />
              <InputOTPSlot index={2} className="size-12 text-base" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} className="size-12 text-base" />
              <InputOTPSlot index={4} className="size-12 text-base" />
              <InputOTPSlot index={5} className="size-12 text-base" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="min-h-[1.25rem] text-center text-[12px]">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : verifying ? (
            <span className="text-muted-foreground">Verifying…</span>
          ) : (
            <span className="text-muted-foreground">Codes expire after 10 minutes.</span>
          )}
        </div>

        <div className="flex items-center justify-between text-[13px]">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
            <Link href="/sign-in">
              <svg viewBox="0 0 24 24" className="mr-1 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 18-6-6 6-6" />
              </svg>
              Change email
            </Link>
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="font-medium text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Still nothing? Check spam or{" "}
        <a href="/support" className="underline-offset-4 hover:underline">
          contact support
        </a>
        .
      </p>
    </Card>
  )
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0] ?? ""}•••@${domain}`
  return `${local.slice(0, 2)}${"•".repeat(Math.max(3, local.length - 2))}@${domain}`
}

export default function VerifyPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="shrink-0 bg-neutral-950 text-white">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
              C
            </div>
            <span className="text-[15px] font-bold tracking-tight">codapac</span>
          </Link>
          <div className="flex items-center gap-3 text-[12px] text-white/70">
            <span className="hidden items-center gap-2 sm:inline-flex">
              <Step active>Email</Step>
              <Line />
              <Step active>Verify</Step>
              <Line />
              <Step>Username</Step>
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center overflow-hidden px-6 py-6">
        <Suspense fallback={null}>
          <VerifyCard />
        </Suspense>
      </main>
    </div>
  )
}

function Step({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        active ? "bg-white/15 text-white" : "text-white/50"
      }`}
    >
      {children}
    </span>
  )
}

function Line() {
  return <span className="h-px w-4 bg-white/20" />
}
