"use client"

import { parseAsString, useQueryState } from "nuqs"

import { Card } from "@/components/ui/card"

import { maskEmail } from "@/lib/email"

import { VerifyCardHeader } from "./verify-card-header"
import { VerifyHelpText } from "./verify-help-text"
import { VerifyOtpForm } from "./verify-otp-form"

export function VerifyCard() {
  const [email] = useQueryState("email", parseAsString.withDefault(""))

  return (
    <Card className="border-border bg-card w-full max-w-md rounded-2xl p-7 shadow-lg">
      <VerifyCardHeader maskedEmail={maskEmail(email)} />
      <VerifyOtpForm />
      <VerifyHelpText />
    </Card>
  )
}
