import { cva } from "class-variance-authority"

import { AgentBadge } from "@/components/agent-badge"

import { LANDING_PHASES } from "./landing-content"
import { LandingReveal } from "./landing-reveal"
import { SectionHeading } from "./section-heading"

const howItWorksStepRail = cva("", {
  variants: {
    phase: {
      listen: "bg-amber-500",
      plan: "bg-amber-500",
      fix: "bg-sky-500",
      check: "bg-emerald-500",
    },
  },
})

const howItWorksStepBadge = cva(
  "border-border bg-background/60 inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.14em] uppercase",
  {
    variants: {
      phase: {
        listen: "text-amber-700",
        plan: "text-amber-700",
        fix: "text-sky-700",
        check: "text-emerald-700",
      },
    },
  },
)

export function HowItWorksSection() {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-6 py-16">
      <SectionHeading
        eyebrow="How it works"
        title="Four small steps. No jargon."
        description="You don't have to know what a pull request is. You don't have to write tickets. Just describe the thing that's bothering you and watch it get handled."
      />

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LANDING_PHASES.map((phase, index) => (
          <LandingReveal key={phase.key} delay={120 * index}>
            <div className="group border-border bg-card hover:border-foreground/15 relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <span
                className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${howItWorksStepRail({ phase: phase.key })}`}
              />
              <div className="flex items-center justify-between">
                <span className={howItWorksStepBadge({ phase: phase.key })}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${howItWorksStepRail({
                      phase: phase.key,
                    })}`}
                  />
                  Step {index + 1}
                </span>
                <AgentBadge agent={phase.agent} size={26} />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                {phase.title}
              </h3>
              <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                {phase.blurb}
              </p>
            </div>
          </LandingReveal>
        ))}
      </div>
    </section>
  )
}
