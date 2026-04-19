import { redirect } from "next/navigation"

import { getAuthUser, hasUsername } from "@/lib/auth-server"

import { SignInSteps } from "../_components/sign-in-steps"
import { UsernameCard } from "./_components/username-card"

export default async function UsernamePage() {
  const user = await getAuthUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (hasUsername(user)) {
    redirect("/dashboard")
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-6">
      <SignInSteps current="username" />
      <UsernameCard />
    </main>
  )
}
