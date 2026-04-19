import { LANDING_STATS } from "./landing-content"
import { LandingReveal } from "./landing-reveal"
import { SectionHeading } from "./section-heading"

export function StatsSection() {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-6 py-16">
      <SectionHeading
        eyebrow="The numbers so far"
        title="Small jobs, handled fast."
      />

      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {LANDING_STATS.map((stat, index) => (
          <LandingReveal key={stat.label} delay={120 * index}>
            <div className="group border-border bg-card hover:border-foreground/15 h-full rounded-2xl border p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                {stat.label}
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {stat.value}
              </div>
              <div className={`mt-1 text-[12px] ${stat.trend}`}>{stat.hint}</div>
            </div>
          </LandingReveal>
        ))}
      </div>
    </section>
  )
}
