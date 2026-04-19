import type { Route } from "next"
import { redirect } from "next/navigation"

import { getAuthUser, hasUsername } from "@/lib/auth-server"

import { SignInSteps } from "../_components/sign-in-steps"
import { VerifyCard } from "./_components/verify-card"

export default async function VerifyPage() {
  const user = await getAuthUser()

  if (user) {
    redirect(
      hasUsername(user)
        ? ("/project" as Route)
        : ("/sign-in/username" as Route),
    )
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-6">
      <SignInSteps current="verify" />
      <VerifyCard />
    </main>
  )
}
