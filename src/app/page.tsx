import type { Route } from "next"
import { redirect } from "next/navigation"

import { getAuthUser, hasUsername } from "@/lib/auth-server"

import { LandingPage } from "./_components/landing-page"

export default async function Home() {
  const user = await getAuthUser()

  if (user) {
    redirect(
      hasUsername(user)
        ? ("/project" as Route)
        : ("/sign-in/username" as Route),
    )
  }

  return <LandingPage />
}
