import { redirect } from "next/navigation"

import { isAuthenticated } from "@/lib/auth-server"

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!(await isAuthenticated())) {
    redirect("/sign-in")
  }
  return <>{children}</>
}
