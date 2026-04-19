"use client"

import { cva } from "class-variance-authority"

import { AgentBadge } from "@/components/agent-badge"
import { AgentName } from "@/components/agent-orb"

import { LANDING_MINI_CARDS, LANDING_MINI_COLUMNS } from "./landing-content"
import { LandingReveal } from "./landing-reveal"
import { SectionHeading } from "./section-heading"

const boardPreviewColumnAccent = cva("", {
  variants: {
    tone: {
      todo: "bg-amber-500",
      progress: "bg-sky-500",
      done: "bg-emerald-500",
      merged: "bg-muted-foreground",
    },
  },
})

export function BoardPreviewSection() {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-6 py-16">
      <SectionHeading
        eyebrow="A peek at the board"
        title={'Watch things move from "to do" to "all done".'}
        description="Every little job has its own card. It slides across the board as your team works on it, so you always know where things stand."
      />

      <LandingReveal delay={120}>
        <div className="border-border bg-card/80 mt-10 overflow-hidden rounded-3xl border p-4 shadow-xs backdrop-blur-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {LANDING_MINI_COLUMNS.map((column, columnIndex) => {
              const cards = LANDING_MINI_CARDS.filter(
                (card) => card.tone === column.key
              )

              return (
                <LandingReveal key={column.key} delay={120 + columnIndex * 90}>
                  <div className="border-border bg-card flex h-full flex-col gap-3 rounded-2xl border p-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${boardPreviewColumnAccent({ tone: column.key })}`}
                        />
                        <h3 className="text-sm font-semibold">
                          {column.title}
                        </h3>
                        <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-[10px] font-semibold">
                          {cards.length}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[11px]">
                        {column.hint}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {cards.map((card, cardIndex) => {
                        return (
                          <LandingReveal
                            key={card.title}
                            delay={240 + columnIndex * 90 + cardIndex * 70}
                          >
                            <div className="group border-border bg-card hover:border-foreground/20 relative overflow-hidden rounded-xl border p-3 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
                              <span
                                className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${boardPreviewColumnAccent({ tone: column.key })}`}
                              />
                              <h4 className="text-[13.5px] leading-snug font-semibold">
                                {card.title}
                              </h4>
                              <div className="mt-2.5 flex items-center justify-between">
                                <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[10.5px]">
                                  {card.tag}
                                </span>
                                <span className="border-border bg-background/80 inline-flex items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[10.5px]">
                                  <AgentBadge agent={card.agent} size={14} />
                                  <AgentName
                                    agent={card.agent}
                                    className="font-semibold"
                                  />
                                </span>
                              </div>
                            </div>
                          </LandingReveal>
                        )
                      })}

                      {cards.length === 0 ? (
                        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-5 text-center text-xs">
                          nothing here
                        </div>
                      ) : null}
                    </div>
                  </div>
                </LandingReveal>
              )
            })}
          </div>
        </div>
      </LandingReveal>
    </section>
  )
}
