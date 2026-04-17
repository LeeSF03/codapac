import { redirect } from "next/navigation"

import { getCurrentAuthUser, hasUsername } from "@/lib/auth-server"

import { SignInSteps } from "../_components/sign-in-steps"
import { UsernameCard } from "./_components/username-card"

export default async function UsernamePage() {
  const user = await getCurrentAuthUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (hasUsername(user)) {
    redirect("/")
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-6">
      <SignInSteps current="username" />
      <UsernameCard />
    </main>
  )
}
