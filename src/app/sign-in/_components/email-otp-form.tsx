"use client"

import { useRouter } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const emailOtpSchema = z.object({
  email: z.email("Enter a valid email address.").trim(),
})

type EmailOtpFormValues = z.infer<typeof emailOtpSchema>

export function EmailOtpForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<EmailOtpFormValues>({
    resolver: zodResolver(emailOtpSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = async ({ email }: EmailOtpFormValues) => {
    const params = new URLSearchParams({ email })

    router.push(`/sign-in/verify?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@acme.com"
          className="h-10"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-destructive text-xs">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="h-10 font-medium"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? "Sending code..." : "Send one-time code"}
      </Button>
    </form>
  )
}
