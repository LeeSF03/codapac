import type { Metadata, Route } from "next"
import { redirect } from "next/navigation"

import { getAuthUser, hasUsername } from "@/lib/auth-server"

import { SignInCard } from "./_components/sign-in-card"
import { BotConstellation, ContourBackdrop } from "./_components/sign-in-stage"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function SignInPage() {
  const user = await getAuthUser()

  if (user) {
    redirect(
      hasUsername(user) ? ("/project" as Route) : ("/sign-in/username" as Route)
    )
  }

  return (
    <>
      <ContourBackdrop />

      <main className="relative z-10 mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 items-center gap-8 overflow-hidden px-6 py-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        {/* Left: headline + bot constellation */}
        <section className="hidden h-full min-h-0 flex-col justify-center gap-6 lg:flex">
          <div>
            <p className="text-muted-foreground text-[11px] tracking-[0.22em] uppercase">
              Meet the squad
            </p>
            <h1 className="mt-2 max-w-xl text-[40px] leading-[1.05] font-semibold tracking-tight">
              Your autonomous engineering team,{" "}
              <span className="text-muted-foreground">
                waiting on a sign in.
              </span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
              <span className="font-semibold text-amber-700">BOSS</span> scopes
              the issue,{" "}
              <span className="font-semibold text-sky-700">FIXER</span> welds
              the patch,{" "}
              <span className="font-semibold text-emerald-700">TESTEES</span>{" "}
              proves it green — from one board, one chat.
            </p>
          </div>

          <BotConstellation />
        </section>

        {/* Right: sign-in card (real auth) */}
        <section className="flex h-full items-center justify-center overflow-hidden">
          <SignInCard />
        </section>
      </main>
    </>
  )
}
