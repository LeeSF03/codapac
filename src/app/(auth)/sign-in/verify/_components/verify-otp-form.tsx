"use client"

import { useEffect, useRef, useState } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { ArrowLeft } from "lucide-react"

import { Cooldown } from "@/components/cooldown"
import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

import { VerifyStatusMessage } from "./verify-status-message"

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 30

export function VerifyOtpForm() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittedRef = useRef(false)
  const verificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current)
      }
    }
  }, [])

  const clearPendingVerification = () => {
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current)
      verificationTimeoutRef.current = null
    }

    submittedRef.current = false
  }

  const resetCode = () => {
    clearPendingVerification()
    setCode("")
    setError(null)
    setVerifying(false)
  }

  const handleCodeChange = (value: string) => {
    setCode(value)
    if (error) setError(null)
    if (value.length !== CODE_LENGTH || submittedRef.current) return

    submittedRef.current = true
    setVerifying(true)
    setError(null)
    verificationTimeoutRef.current = setTimeout(() => {
      // UI stub - replace with real verify call
      if (value === "000000") {
        setError("That code didn't match. Try again or resend.")
        setVerifying(false)
        setCode("")
        submittedRef.current = false
        verificationTimeoutRef.current = null
        return
      }

      router.push("/sign-in/username")
    }, 700)
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-center py-2">
        <InputOTP
          maxLength={CODE_LENGTH}
          value={code}
          onChange={handleCodeChange}
          disabled={verifying}
          aria-invalid={Boolean(error)}
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

      <VerifyStatusMessage error={error} verifying={verifying} />

      <div className="flex items-center justify-between text-[13px]">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-2 h-8"
        >
          <Link href="/sign-in">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden />
            Change email
          </Link>
        </Button>

        <Cooldown cooldownSeconds={RESEND_COOLDOWN_SECONDS}>
          {({ isCoolingDown, remainingSeconds, startCooldown }) => (
            <button
              type="button"
              onClick={() => {
                resetCode()
                startCooldown()
              }}
              disabled={isCoolingDown}
              className="text-primary disabled:text-muted-foreground font-medium underline-offset-4 hover:underline disabled:no-underline"
            >
              {isCoolingDown ? `Resend in ${remainingSeconds}s` : "Resend code"}
            </button>
          )}
        </Cooldown>
      </div>
    </div>
  )
}
