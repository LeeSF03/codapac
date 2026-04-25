"use client"

import { useState, useTransition } from "react"

import { Route } from "next"
import { useRouter } from "next/navigation"

import { Google } from "@thesvg/react"

import { Button } from "@/components/ui/button"

import { authClient } from "@/lib/auth-client"

export function GoogleSignInButton() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSignIn = () => {
    setError(null)
    startTransition(async () => {
      const result = await authClient.signIn.social({
        callbackURL: "/",
        errorCallbackURL: "/sign-in",
        provider: "google",
      })

      if (result.error) {
        setError(
          result.error.message ??
            "An error occurred while signing in with Google. Please try again."
        )
        return
      }

      if (result.data?.url) {
        router.push(result.data.url as Route)
      }
    })
  }

  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        variant="outline"
        className="h-10 justify-center gap-2 font-medium"
        onClick={handleSignIn}
        disabled={isPending}
      >
        <Google />
        {isPending ? "Opening Google..." : "Continue with Google"}
      </Button>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  )
}
