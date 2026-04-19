import Link from "next/link"

import { AgentBadge } from "@/components/agent-badge"
import { Button } from "@/components/ui/button"

import { LANDING_AGENT_KEYS } from "./landing-content"
import { LandingReveal } from "./landing-reveal"

export function FinalCtaSection() {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-6 py-20">
      <LandingReveal>
        <div className="border-border bg-card relative overflow-hidden rounded-3xl border p-10 text-center shadow-sm sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.18),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.18),transparent_65%)]"
          />
          <div className="relative flex flex-col items-center gap-5">
            <div className="flex -space-x-3">
              {LANDING_AGENT_KEYS.map((key) => (
                <div
                  key={key}
                  className="bg-card ring-border rounded-full p-0.5 shadow-sm ring-1"
                >
                  <AgentBadge agent={key} size={36} />
                </div>
              ))}
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to hand off the busywork?
            </h2>
            <p className="text-muted-foreground max-w-xl text-[15px] leading-relaxed">
              Sign in, tell your team what&apos;s bothering you, and go do
              something else. We&apos;ll ping you when it&apos;s done.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-2 h-12 px-6 text-[15px] font-semibold shadow-md transition-all hover:-translate-y-px hover:shadow-lg"
            >
              <Link href="/sign-in">Get started — it&apos;s free</Link>
            </Button>
          </div>
        </div>
      </LandingReveal>
    </section>
  )
}
