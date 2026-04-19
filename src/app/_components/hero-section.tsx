import Link from "next/link"

import { Button } from "@/components/ui/button"

import { LandingLiveAgentChat } from "./landing-live-agent-chat"
import { LandingReveal } from "./landing-reveal"
import { PulseDot } from "./pulse-dot"

export function HeroSection() {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-6 pt-14 pb-20 lg:pt-20">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <LandingReveal className="flex flex-col gap-6">
          <span className="border-border bg-card/70 text-muted-foreground inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase shadow-xs backdrop-blur-md">
            <PulseDot className="h-1.5 w-1.5 bg-emerald-500" />
            Your personal team of helpers
          </span>

          <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-[56px]">
            Tell us what&apos;s bothering you.
            <br />
            <span className="text-muted-foreground">
              We&apos;ll take care of the rest.
            </span>
          </h1>

          <p className="text-muted-foreground max-w-xl text-[15.5px] leading-relaxed">
            Got something small that&apos;s been nagging at you? A button that
            feels off, a page that looks broken, a little detail no one has time
            for? Just say it in plain words. A small team of friendly helpers
            takes it from there — one listens, one works on it, one
            double-checks it — and comes back when it&apos;s done.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-11 px-5 text-[15px] font-semibold shadow-md transition-all hover:-translate-y-px hover:shadow-lg"
            >
              <Link href="/sign-in">Get started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 px-5 text-[15px] font-medium transition-all hover:-translate-y-px"
            >
              <Link href="/dashboard">See the live board</Link>
            </Button>
          </div>

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-5 text-[12.5px]">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              No technical knowledge needed
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Works in your browser
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              See every step as it happens
            </span>
          </div>
        </LandingReveal>

        <LandingReveal delay={160} className="relative">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.18),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(14,165,233,0.18),transparent_60%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.14),transparent_65%)] blur-2xl" />
          <LandingLiveAgentChat />
        </LandingReveal>
      </div>
    </section>
  )
}
