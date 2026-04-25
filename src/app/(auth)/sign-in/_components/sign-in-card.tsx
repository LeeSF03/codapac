import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { EmailOtpForm } from "./email-otp-form"
import { GoogleSignInButton } from "./google-sign-in-button"

export function SignInCard() {
  return (
    <Card className="w-full max-w-md rounded-2xl border-border bg-card/90 p-7 shadow-xl ring-1 ring-foreground/5 backdrop-blur-md">
      <h2 className="text-2xl font-semibold tracking-tight">
        Sign in to codapac
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        We&apos;ll email you a one-time code - no password needed.
      </p>

      <div className="mt-5 grid gap-2">
        <GoogleSignInButton />
      </div>

      <div className="my-4 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-[11px] tracking-[0.18em] uppercase">
          or with email
        </span>
        <Separator className="flex-1" />
      </div>

      <EmailOtpForm />

      <p className="text-muted-foreground mt-4 text-center text-[11px]">
        By signing in you agree to our{" "}
        <a href="/terms" className="underline-offset-4 hover:underline">
          Terms{" "}
        </a>
        and{" "}
        <a href="/privacy" className="underline-offset-4 hover:underline">
          Privacy
        </a>
        .
      </p>
    </Card>
  )
}
