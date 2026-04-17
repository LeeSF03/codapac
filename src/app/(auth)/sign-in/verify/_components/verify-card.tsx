"use client"

import Link from "next/link"

import { parseAsString, useQueryState } from "nuqs"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { maskEmail } from "@/lib/email"

import { VerifyCardHeader } from "./verify-card-header"
import { VerifyHelpText } from "./verify-help-text"
import { VerifyOtpForm } from "./verify-otp-form"

const verifyEmailSchema = z.email("Enter a valid email address.").trim()

export function VerifyCard() {
  const [rawEmail] = useQueryState("email", parseAsString.withDefault(""))
  const parsedEmail = verifyEmailSchema.safeParse(rawEmail)

  if (!parsedEmail.success) {
    return (
      <Card className="border-border bg-card w-full max-w-md rounded-2xl p-7 shadow-lg">
        <VerifyCardHeader maskedEmail="" />
        <div className="grid gap-4">
          <p className="text-destructive text-sm">
            That verification link is missing a valid email. Go back and request
            a new code.
          </p>

          <Button asChild className="h-10 font-medium">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </div>
        <VerifyHelpText />
      </Card>
    )
  }

  const email = parsedEmail.data.toLowerCase()

  return (
    <Card className="border-border bg-card w-full max-w-md rounded-2xl p-7 shadow-lg">
      <VerifyCardHeader maskedEmail={maskEmail(email)} />
      <VerifyOtpForm email={email} />
      <VerifyHelpText />
    </Card>
  )
}
