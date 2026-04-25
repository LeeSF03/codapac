"use client"

import { useTransition } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Cooldown } from "@/components/cooldown"
import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

import { authClient } from "@/lib/auth-client"

import { VerifyStatusMessage } from "./verify-status-message"

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 30
const verifyOtpSchema = z.object({
  code: z
    .string()
    .length(CODE_LENGTH, `Enter the ${CODE_LENGTH}-digit code.`)
    .regex(/^\d+$/, "Enter the 6-digit code."),
})

type VerifyOtpFormProps = {
  email: string
}

export function VerifyOtpForm({ email }: VerifyOtpFormProps) {
  const router = useRouter()
  const [verifying, startVerifyingTransition] = useTransition()
  const [resending, startResendingTransition] = useTransition()
  const {
    control,
    clearErrors,
    formState: { errors },
    handleSubmit,
    resetField,
    setError,
  } = useForm<z.infer<typeof verifyOtpSchema>>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      code: "",
    },
  })
  const error = errors.code?.message ?? null

  const requestCode = async () => {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })

    if (result.error) {
      setError("code", {
        message:
          result.error.message ?? "We couldn't send the code. Try again.",
      })
    }

    return Boolean(result.data?.success)
  }

  const verifyCode = ({ code }: z.infer<typeof verifyOtpSchema>) => {
    startVerifyingTransition(async () => {
      resetField("code")
      clearErrors("code")

      const result = await authClient.signIn.emailOtp({
        email,
        name: email.split("@")[0] ?? "",
        otp: code,
      })

      if (result.error) {
        setError("code", {
          message:
            result.error.message ?? "We couldn't verify that code. Try again.",
        })
        resetField("code", { defaultValue: "", keepError: true })
        return
      }

      const session = await authClient.getSession()
      const username = session.data?.user.username

      router.replace(username ? "/project" : "/sign-in/username")
    })
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-center py-2">
        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <InputOTP
              maxLength={CODE_LENGTH}
              value={field.value}
              onChange={(value) => {
                field.onChange(value)
                clearErrors("code")
                if (value.length === CODE_LENGTH && !verifying) {
                  void handleSubmit(verifyCode)()
                }
              }}
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
          )}
        />
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
                startResendingTransition(async () => {
                  const sent = await requestCode()
                  if (sent) startCooldown()
                })
              }}
              disabled={isCoolingDown || resending || verifying}
              className="text-primary disabled:text-muted-foreground font-medium underline-offset-4 hover:underline disabled:no-underline"
            >
              {resending
                ? "Sending..."
                : isCoolingDown
                  ? `Resend in ${remainingSeconds}s`
                  : "Resend code"}
            </button>
          )}
        </Cooldown>
      </div>
    </div>
  )
}
