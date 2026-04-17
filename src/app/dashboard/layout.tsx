import { redirect } from "next/navigation"

import { isAuthenticated } from "@/lib/auth-server"
import { hasFakeSession } from "@/lib/fake-auth-server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authed = (await isAuthenticated()) || (await hasFakeSession())
  if (!authed) {
    redirect("/sign-in")
  }
  return <>{children}</>
}
