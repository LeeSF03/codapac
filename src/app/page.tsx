"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { AgentBadge } from "@/components/agent-badge"
import { AGENTS, AgentKey, AgentOrb } from "@/components/agent-orb"
import { LiveAgentChat } from "@/components/live-agent-chat"
import { Reveal } from "@/components/reveal"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { useFakeSession } from "@/lib/fake-auth"

type Phase = {
  key: "listen" | "plan" | "fix" | "check"
  title: string
  blurb: string
  agent: AgentKey
  dot: string
  text: string
  ring: string
}

const PHASES: Phase[] = [
  {
    key: "listen",
    title: "Listen",
    blurb: "Tell us what's wrong in your own words. We pick out the important bits.",
    agent: "priya",
    dot: "bg-amber-500",
    text: "text-amber-700",
    ring: "ring-amber-500/30",
  },
  {
    key: "plan",
    title: "Plan",
    blurb: "We break it into small, clear pieces so nothing gets forgotten.",
    agent: "priya",
    dot: "bg-amber-500",
    text: "text-amber-700",
    ring: "ring-amber-500/30",
  },
  {
    key: "fix",
    title: "Fix",
    blurb: "A helper rolls up their sleeves and takes care of each piece.",
    agent: "enzo",
    dot: "bg-sky-500",
    text: "text-sky-700",
    ring: "ring-sky-500/30",
  },
  {
    key: "check",
    title: "Check",
    blurb: "Another helper double-checks everything is working before it goes live.",
    agent: "quinn",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    ring: "ring-emerald-500/30",
  },
]

type MiniCard = {
  title: string
  tag: string
  agent: AgentKey
  tone: "todo" | "progress" | "done" | "merged"
}

const MINI_COLUMNS: {
  key: MiniCard["tone"]
  title: string
  hint: string
  dot: string
}[] = [
  { key: "todo", title: "To do", hint: "3 waiting", dot: "bg-amber-500" },
  { key: "progress", title: "Working on it", hint: "being handled", dot: "bg-sky-500" },
  { key: "done", title: "Checking", hint: "one last look", dot: "bg-emerald-500" },
  { key: "merged", title: "All done", hint: "live", dot: "bg-muted-foreground" },
]

const MINI_CARDS: MiniCard[] = [
  {
    title: "Checkout button says the wrong thing",
    tag: "wording",
    agent: "priya",
    tone: "todo",
  },
  {
    title: "Welcome email looks broken on iPhone",
    tag: "email",
    agent: "priya",
    tone: "todo",
  },
  {
    title: "Search doesn't reset when I clear filters",
    tag: "feels buggy",
    agent: "enzo",
    tone: "progress",
  },
  {
    title: "Chart bleeds off the screen on my laptop",
    tag: "looks off",
    agent: "quinn",
    tone: "done",
  },
  {
    title: "Skip button was ignored after switching teams",
    tag: "onboarding",
    agent: "quinn",
    tone: "merged",
  },
]

const STATS = [
  {
    label: "Average time to fix",
    value: "54m",
    hint: "from 'this is annoying' to 'it's fixed'",
    trend: "text-emerald-600",
  },
  {
    label: "Got it right first time",
    value: "92%",
    hint: "of the last 30 fixes",
    trend: "text-emerald-600",
  },
  {
    label: "Sent back to redo",
    value: "3",
    hint: "caught by the checker",
    trend: "text-muted-foreground",
  },
  {
    label: "Team online",
    value: "3 / 3",
    hint: "always ready to help",
    trend: "text-muted-foreground",
  },
]

const AGENT_KEYS: AgentKey[] = ["priya", "enzo", "quinn"]

const FRIENDLY_BLURBS: Record<AgentKey, { role: string; blurb: string }> = {
  priya: {
    role: "The organiser",
    blurb:
      "Reads what you wrote, figures out what actually needs doing, and writes it down in plain steps.",
  },
  enzo: {
    role: "The fixer",
    blurb:
      "Takes each step and does it carefully. Doesn't stop until it feels right.",
  },
  quinn: {
    role: "The checker",
    blurb:
      "Tries to break it on purpose. Only gives the green light when everything behaves.",
  },
}

export default function Home() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const fake = useFakeSession()
  const signedIn = (!isPending && !!session) || !!fake

  useEffect(() => {
    if (signedIn) router.replace("/dashboard")
  }, [signedIn, router])

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <main className="relative">
        <AmbientBackdrop />

        {/* ───────── Hero ───────── */}
        <section className="relative mx-auto w-full max-w-[1400px] px-6 pb-20 pt-14 lg:pt-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <Reveal className="flex flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-xs backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
                Your personal team of helpers
              </span>

              <h1 className="text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[56px]">
                Tell us what&apos;s bothering you.
                <br />
                <span className="text-muted-foreground">
                  We&apos;ll take care of the rest.
                </span>
              </h1>

              <p className="max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
                Got something small that&apos;s been nagging at you? A button that
                feels off, a page that looks broken, a little detail no one has
                time for? Just say it in plain words. A small team of friendly
                helpers takes it from there — one listens, one works on it, one
                double-checks it — and comes back when it&apos;s done.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-11 px-5 text-[15px] font-semibold shadow-md transition-all hover:-translate-y-px hover:shadow-lg">
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

              <div className="mt-2 flex flex-wrap items-center gap-5 text-[12.5px] text-muted-foreground">
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
            </Reveal>

            <Reveal delay={160} className="relative">
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.18),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(14,165,233,0.18),transparent_60%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.14),transparent_65%)] blur-2xl" />
              <LiveAgentChat />
            </Reveal>
          </div>
        </section>

        {/* ───────── How it works ───────── */}
        <section className="relative mx-auto w-full max-w-[1400px] px-6 py-16">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Four small steps. No jargon.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              You don&apos;t have to know what a pull request is. You don&apos;t
              have to write tickets. Just describe the thing that&apos;s
              bothering you and watch it get handled.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PHASES.map((p, i) => (
              <Reveal key={p.key} delay={120 * i}>
                <div className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-md">
                  <span
                    className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 ${p.dot} transition-transform duration-500 group-hover:scale-x-100`}
                  />
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${p.text}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                      Step {i + 1}
                    </span>
                    <AgentBadge agent={p.agent} size={26} />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {p.title}
                  </h3>
                  <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                    {p.blurb}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────── Meet the team ───────── */}
        <section className="relative mx-auto w-full max-w-[1400px] px-6 py-16">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Meet the team
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Three friendly helpers, each with a job they love.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              They work as a little crew so nothing slips through the cracks.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {AGENT_KEYS.map((key, i) => {
              const a = AGENTS[key]
              const copy = FRIENDLY_BLURBS[key]
              return (
                <Reveal key={key} delay={140 * i}>
                  <div className="group relative flex h-full flex-col items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-md">
                    <div className="relative">
                      <span
                        className={`pointer-events-none absolute inset-[-18%] rounded-full blur-2xl opacity-60 ${
                          key === "priya"
                            ? "bg-amber-400/30"
                            : key === "enzo"
                              ? "bg-sky-400/30"
                              : "bg-emerald-400/30"
                        }`}
                      />
                      <AgentOrb agent={key} size={132} />
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] font-bold tracking-wider ring-1 ring-border ${a.accent}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
                        {a.name}
                      </span>
                      <h3 className="text-lg font-semibold tracking-tight">
                        {copy.role}
                      </h3>
                    </div>

                    <p className="max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
                      {copy.blurb}
                    </p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* ───────── Mini board preview ───────── */}
        <section className="relative mx-auto w-full max-w-[1400px] px-6 py-16">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              A peek at the board
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Watch things move from &quot;to do&quot; to &quot;all done&quot;.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Every little job has its own card. It slides across the board as
              your team works on it, so you always know where things stand.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card/80 p-4 shadow-xs backdrop-blur-sm sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {MINI_COLUMNS.map((col, ci) => {
                  const list = MINI_CARDS.filter((c) => c.tone === col.key)
                  return (
                    <Reveal key={col.key} delay={120 + ci * 90}>
                      <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${col.dot}`}
                            />
                            <h3 className="text-sm font-semibold">
                              {col.title}
                            </h3>
                            <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                              {list.length}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {col.hint}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {list.map((c, idx) => {
                            const a = AGENTS[c.agent]
                            return (
                              <Reveal
                                key={c.title}
                                delay={240 + ci * 90 + idx * 70}
                              >
                                <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
                                  <span
                                    className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 ${col.dot} transition-transform duration-300 group-hover:scale-x-100`}
                                  />
                                  <h4 className="text-[13.5px] font-semibold leading-snug">
                                    {c.title}
                                  </h4>
                                  <div className="mt-2.5 flex items-center justify-between">
                                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10.5px] text-secondary-foreground">
                                      {c.tag}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-1.5 py-0.5 text-[10.5px]">
                                      <AgentBadge
                                        agent={c.agent}
                                        size={14}
                                      />
                                      <span
                                        className={`font-semibold ${a.accent}`}
                                      >
                                        {a.name}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </Reveal>
                            )
                          })}

                          {list.length === 0 && (
                            <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                              nothing here
                            </div>
                          )}
                        </div>
                      </div>
                    </Reveal>
                  )
                })}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ───────── Stats strip ───────── */}
        <section className="relative mx-auto w-full max-w-[1400px] px-6 py-16">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              The numbers so far
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Small jobs, handled fast.
            </h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={120 * i}>
                <div className="group h-full rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">
                    {s.value}
                  </div>
                  <div className={`mt-1 text-[12px] ${s.trend}`}>{s.hint}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────── Final CTA ───────── */}
        <section className="relative mx-auto w-full max-w-[1400px] px-6 py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-sm sm:p-14">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.18),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.18),transparent_65%)]"
              />
              <div className="relative flex flex-col items-center gap-5">
                <div className="flex -space-x-3">
                  {AGENT_KEYS.map((k) => (
                    <div
                      key={k}
                      className="rounded-full bg-card p-0.5 shadow-sm ring-1 ring-border"
                    >
                      <AgentBadge agent={k} size={36} />
                    </div>
                  ))}
                </div>
                <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                  Ready to hand off the busywork?
                </h2>
                <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
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
          </Reveal>
        </section>

        {/* ───────── Footer ───────── */}
        <footer className="border-t border-border">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-6 py-8 text-[12.5px] text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                C
              </div>
              <span className="font-semibold tracking-tight text-foreground">
                codapac
              </span>
              <span>— a calm little crew for the stuff that&apos;s been bugging you.</span>
            </div>
            <div className="flex items-center gap-5">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-foreground"
              >
                Board
              </Link>
              <Link
                href="/agents"
                className="transition-colors hover:text-foreground"
              >
                Team
              </Link>
              <Link
                href="/sign-in"
                className="transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

/* ───────── Ambient backdrop ─────────
   Soft rotating contour rings + faint dot grid behind every section. */
function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.08),transparent_55%),radial-gradient(circle_at_12%_60%,rgba(14,165,233,0.06),transparent_55%),radial-gradient(circle_at_60%_95%,rgba(16,185,129,0.05),transparent_65%)]" />

      <svg
        viewBox="0 0 800 800"
        className="absolute -right-[20%] -top-[10%] h-[90%] w-[70%] text-amber-500/20 [animation:cp-orbit_120s_linear_infinite]"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 10 }).map((_, i) => (
            <ellipse
              key={i}
              cx="400"
              cy="400"
              rx={80 + i * 28}
              ry={64 + i * 22}
              transform={`rotate(${i * 5} 400 400)`}
              opacity={Math.max(0.1, 0.8 - i * 0.07)}
            />
          ))}
        </g>
      </svg>

      <svg
        viewBox="0 0 800 800"
        className="absolute -bottom-[10%] -left-[20%] h-[90%] w-[70%] text-sky-500/15 [animation:cp-orbit_180s_linear_infinite]"
        style={{ animationDirection: "reverse" }}
      >
        <g fill="none" stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <ellipse
              key={i}
              cx="400"
              cy="400"
              rx={90 + i * 34}
              ry={72 + i * 26}
              transform={`rotate(${-i * 6} 400 400)`}
              opacity={Math.max(0.1, 0.7 - i * 0.07)}
            />
          ))}
        </g>
      </svg>

      <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_85%)]">
        <div className="h-full w-full opacity-[0.06] [background-image:radial-gradient(circle,_currentColor_1px,_transparent_1.5px)] [background-size:28px_28px] text-foreground" />
      </div>
    </div>
  )
}
