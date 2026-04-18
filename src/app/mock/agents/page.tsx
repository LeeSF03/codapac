"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { AgentBadge } from "@/components/agent-badge"
import { AGENTS, AgentKey, AgentOrb } from "@/components/agent-orb"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { authClient } from "@/lib/auth-client"

const activity: Record<AgentKey, { time: string; text: string }[]> = {
  priya: [
    { time: "11:42", text: "Parsed issue #128 — dropped CDP-2141 to To Do." },
    { time: "11:40", text: "Requested screenshots from reporter on #126." },
    { time: "11:24", text: "Scoped CDP-2142 (SSO toggle) — 3 acceptance criteria." },
    { time: "10:58", text: "Closed duplicate #120 referencing #104." },
  ],
  enzo: [
    { time: "11:51", text: "Pushed patch on feat/search-reset-cache. 2 files changed." },
    { time: "11:46", text: "Picked up CDP-2141, pulled branch." },
    { time: "11:10", text: "Addressed review on PR #409, squashed fixup." },
    { time: "10:30", text: "Shipped PR #408 — Onboarding skip button." },
  ],
  quinn: [
    { time: "11:54", text: "Raised PR #412 — all 4 scenarios green." },
    { time: "11:53", text: "Playwright suite staged for CDP-2141." },
    { time: "11:02", text: "Bounced CDP-2139 back to FIXER — flake on retry." },
    { time: "09:45", text: "Merged PR #407 after regression sweep." },
  ],
}

const stats: Record<AgentKey, { k: string; v: string }[]> = {
  priya: [
    { k: "Issues parsed", v: "142" },
    { k: "Avg triage", v: "38s" },
    { k: "Bounces avoided", v: "12" },
  ],
  enzo: [
    { k: "PRs raised", v: "96" },
    { k: "Cycle time", v: "54m" },
    { k: "Green rate", v: "92%" },
  ],
  quinn: [
    { k: "Scenarios run", v: "1.2k" },
    { k: "Flakes caught", v: "18" },
    { k: "Bounces sent", v: "7" },
  ],
}

export default function AgentsPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const signedIn = !isPending && !!session

  useEffect(() => {
    if (signedIn) router.replace("/dashboard")
  }, [signedIn, router])

  const [focus, setFocus] = useState<AgentKey>("priya")

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <main className="mx-auto w-full max-w-[1500px] px-6 py-10">
        {/* Hero */}
        <section className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div className="flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Meet the bot squad
            </p>
            <h1 className="mt-2 text-[42px] font-semibold leading-[1.05] tracking-tight">
              Three tiny bots,{" "}
              <span className="text-muted-foreground">one very chatty sprint.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Your codapac squad runs the whole loop from issue to PR.{" "}
              <span className="font-semibold text-amber-700">BOSS</span> scopes the work,{" "}
              <span className="font-semibold text-sky-700">FIXER</span> welds the patch,{" "}
              <span className="font-semibold text-emerald-700">TESTEES</span> pokes every button twice — you just chime in when you want to steer.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {(Object.keys(AGENTS) as AgentKey[]).map((k) => {
                const a = AGENTS[k]
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFocus(k)}
                    data-active={focus === k}
                    className="group flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-xs transition-all duration-200 hover:-translate-y-px hover:border-foreground/30 data-[active=true]:-translate-y-px data-[active=true]:border-foreground data-[active=true]:shadow-md"
                  >
                    <span className={`h-2 w-2 rounded-full ${a.dot} transition-transform group-data-[active=true]:scale-125`} />
                    <span className={`transition-colors ${a.accent}`}>{a.name}</span>
                    <span className="text-[11px] text-muted-foreground">{a.role}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Focused orb stage */}
          <Card className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[2rem] border-border bg-card p-8 shadow-lg">
            <div
              className={`pointer-events-none absolute inset-0 transition-colors duration-500 ${
                focus === "priya"
                  ? "bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.18)_0%,transparent_70%)]"
                  : focus === "enzo"
                    ? "bg-[radial-gradient(circle_at_50%_40%,rgba(14,165,233,0.18)_0%,transparent_70%)]"
                    : "bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.18)_0%,transparent_70%)]"
              }`}
            />
            <div
              key={focus}
              className="relative flex flex-col items-center gap-5 [animation:cp-float_0.5s_ease-out]"
            >
              <AgentOrb agent={focus} size={220} />
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <h2 className={`text-2xl font-semibold tracking-tight ${AGENTS[focus].accent}`}>
                    {AGENTS[focus].name}
                  </h2>
                  <Badge variant="outline" className={`gap-1.5 ${AGENTS[focus].chip} border-transparent`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${AGENTS[focus].dot}`} />
                    {AGENTS[focus].role}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {AGENTS[focus].title}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {AGENTS[focus].tagline}
                </p>
              </div>
              <div className="flex gap-6 pt-1">
                {stats[focus].map((s) => (
                  <div key={s.k} className="text-center">
                    <div className="text-xl font-semibold tracking-tight">{s.v}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {s.k}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Triad — all 3 orbs always animating */}
        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {(Object.keys(AGENTS) as AgentKey[]).map((k) => {
            const a = AGENTS[k]
            const active = focus === k
            return (
              <Card
                key={k}
                data-active={active}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border-border bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md data-[active=true]:-translate-y-0.5 data-[active=true]:border-foreground/40 data-[active=true]:shadow-lg"
                onClick={() => setFocus(k)}
              >
                <span
                  className={`absolute inset-x-0 top-0 h-1 origin-left scale-x-0 ${a.dot} transition-transform duration-300 group-hover:scale-x-100 group-data-[active=true]:scale-x-100`}
                />
                <div className="flex items-start gap-4">
                  <AgentOrb agent={k} size={96} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-lg font-semibold tracking-tight ${a.accent}`}>{a.name}</h3>
                      <Badge variant="outline" className={`gap-1.5 ${a.chip} border-transparent`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
                        {a.role}
                      </Badge>
                    </div>
                    <p className="text-[13px] text-muted-foreground">{a.title}</p>
                    <p className="mt-2 text-[13px] leading-snug text-foreground/80">
                      {a.tagline}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex flex-wrap gap-1.5">
                  {a.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors group-hover:border-foreground/20 group-hover:text-foreground/80"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFocus(k)
                  }}
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-primary underline-offset-4 transition-all hover:gap-2 hover:underline"
                >
                  {active ? "Focused" : "Focus bot"}
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </Card>
            )
          })}
        </section>

        {/* Live activity timeline */}
        <section className="mt-14">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Live activity</h2>
              <p className="text-sm text-muted-foreground">
                Latest moves from{" "}
                <span className={`font-semibold ${AGENTS[focus].accent}`}>
                  {AGENTS[focus].name}
                </span>
                .
              </p>
            </div>
            <div className="flex gap-1 rounded-full border border-border bg-card p-1 text-[12px] shadow-xs">
              {(Object.keys(AGENTS) as AgentKey[]).map((k) => {
                const a = AGENTS[k]
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFocus(k)}
                    data-active={focus === k}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
                    <span className="data-[active=true]:font-semibold">{a.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <Card className="rounded-2xl border-border bg-card p-0 shadow-xs">
            <ul className="divide-y divide-border">
              {activity[focus].map((item, i) => (
                <li
                  key={`${focus}-${i}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="flex items-start gap-3 px-5 py-4 opacity-0 transition-colors hover:bg-muted/40 [animation:cp-fade-up_0.4s_ease-out_forwards]"
                >
                  <AgentBadge agent={focus} size={32} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[13px] font-semibold ${AGENTS[focus].accent}`}>
                        {AGENTS[focus].name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{AGENTS[focus].role}</span>
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-[13.5px] leading-snug text-foreground/90">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </main>
    </div>
  )
}
