"use client"

import {
  AGENTS,
  AgentHeroAura,
  AgentName,
  AgentOrb,
  AgentStatusDot,
} from "@/components/agent-orb"

import { LANDING_AGENT_COPY, LANDING_AGENT_KEYS } from "./landing-content"
import { LandingReveal } from "./landing-reveal"
import { SectionHeading } from "./section-heading"

export function MeetTheTeamSection() {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-6 py-16">
      <SectionHeading
        eyebrow="Meet the team"
        title="Three friendly helpers, each with a job they love."
        description="They work as a little crew so nothing slips through the cracks."
      />

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        {LANDING_AGENT_KEYS.map((key, index) => {
          const agent = AGENTS[key]
          const copy = LANDING_AGENT_COPY[key]

          return (
            <LandingReveal key={key} delay={140 * index}>
              <div className="group border-border bg-card hover:border-foreground/15 relative flex h-full flex-col items-center gap-4 overflow-hidden rounded-2xl border p-6 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="relative">
                  <AgentHeroAura
                    agent={key}
                    className="pointer-events-none absolute inset-[-18%] rounded-full opacity-60 blur-2xl"
                  />
                  <AgentOrb agent={key} size={132} />
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <span className="bg-background/80 ring-border inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider ring-1">
                    <AgentStatusDot
                      agent={key}
                      className="h-1.5 w-1.5 rounded-full"
                    />
                    <AgentName agent={key}>{agent.name}</AgentName>
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {copy.role}
                  </h3>
                </div>

                <p className="text-muted-foreground max-w-xs text-[13.5px] leading-relaxed">
                  {copy.blurb}
                </p>
              </div>
            </LandingReveal>
          )
        })}
      </div>
    </section>
  )
}
