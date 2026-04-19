"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

import { AgentBadge } from "@/components/agent-badge"
import {
  AGENTS,
  AgentName,
  AgentStatusDot,
  AgentKey,
} from "@/components/agent-orb"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { sendChatMessage } from "@/lib/chat-bus"

type Role = "PM" | "ENG" | "QA"

const AGENT_BY_ROLE: Record<Role, AgentKey> = {
  PM: "priya",
  ENG: "enzo",
  QA: "quinn",
}

type Tone = "todo" | "progress" | "done" | "merged"

type CardT = {
  id: string
  title: string
  issue: number
  agent: Role
  tags: string[]
  tone: Tone
}

const columns: {
  key: Tone
  title: string
  hint: string
  dot: string
  ring: string
}[] = [
  { key: "todo", title: "To Do", hint: "queued by BOSS", dot: "bg-amber-500", ring: "ring-amber-500/40" },
  { key: "progress", title: "In Progress", hint: "FIXER wrenching", dot: "bg-sky-500", ring: "ring-sky-500/40" },
  { key: "done", title: "Done", hint: "awaiting TESTEES", dot: "bg-emerald-500", ring: "ring-emerald-500/40" },
  { key: "merged", title: "Merged", hint: "PR shipped", dot: "bg-muted-foreground", ring: "ring-muted-foreground/40" },
]

const cards: CardT[] = [
  { id: "CDP-2142", title: "Settings: add SSO toggle for enterprise workspaces", issue: 131, agent: "PM", tags: ["auth", "settings"], tone: "todo" },
  { id: "CDP-2143", title: "Email: fix broken header spacing on Outlook iOS", issue: 133, agent: "PM", tags: ["email"], tone: "todo" },
  { id: "CDP-2141", title: "Search: clear stale results after filter reset", issue: 128, agent: "ENG", tags: ["a11y", "search"], tone: "progress" },
  { id: "CDP-2140", title: "Dashboard: chart legend overflows at 1280px", issue: 126, agent: "QA", tags: ["ui"], tone: "done" },
  { id: "CDP-2139", title: "Onboarding: skip button ignored after org switch", issue: 122, agent: "QA", tags: ["onboarding"], tone: "merged" },
]

const chat: { who: Role; time: string; text: string }[] = [
  { who: "PM", time: "11:42", text: "Issue #128 parsed. Creating CDP-2141 with 3 acceptance criteria." },
  { who: "ENG", time: "11:45", text: "Picked up CDP-2141, pulled branch feat/search-reset-cache." },
  { who: "ENG", time: "11:51", text: "Patch pushed. Moving card \u2192 Done." },
  { who: "QA", time: "11:53", text: "4 Playwright scenarios staged. Running now." },
  { who: "QA", time: "11:54", text: "All green. Raising PR #412." },
]

function CardItem({ c }: { c: CardT }) {
  const col = columns.find((x) => x.key === c.tone)!
  const a = AGENTS[AGENT_BY_ROLE[c.agent]]
  return (
    <Link
      href={`/issues/${c.issue}`}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <span
        className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 ${col.dot} transition-transform duration-300 group-hover:scale-x-100`}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
          {c.id}
        </span>
        <Badge variant="outline" className="gap-1.5 rounded-full px-2 py-0 text-[10px] font-medium">
          <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
          {col.title}
        </Badge>
      </div>
      <h4 className="mt-1.5 text-[13.5px] font-semibold leading-snug transition-colors group-hover:text-foreground">
        {c.title}
      </h4>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex gap-1">
          {c.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-secondary-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="underline-offset-2 group-hover:underline">#{c.issue}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-1.5 py-0.5 transition-colors group-hover:border-foreground/20">
            <AgentBadge agent={AGENT_BY_ROLE[c.agent]} size={14} />
            <span className="font-semibold text-foreground/80">{a.name}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [draft, setDraft] = useState("")
  const [filter, setFilter] = useState<Role | "ALL">("ALL")
  const [forwarded, setForwarded] = useState(false)
  const forwardTimer = useRef<number | null>(null)

  const { data: session } = authClient.useSession()
  const displayName =
    (session?.user?.name?.trim() as string | undefined) ||
    (session?.user?.email
      ? (session.user.email as string).split("@")[0]
      : undefined) ||
    "you"

  useEffect(() => {
    return () => {
      if (forwardTimer.current !== null) {
        window.clearTimeout(forwardTimer.current)
      }
    }
  }, [])

  const handleSprintSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = sendChatMessage(draft, displayName)
    if (!ok) return
    setDraft("")
    setForwarded(true)
    if (forwardTimer.current !== null) {
      window.clearTimeout(forwardTimer.current)
    }
    forwardTimer.current = window.setTimeout(() => {
      setForwarded(false)
      forwardTimer.current = null
    }, 2400)
  }

  const roleCounts = useMemo(() => {
    const c: Record<Role, number> = { PM: 0, ENG: 0, QA: 0 }
    cards.forEach((x) => (c[x.agent] += 1))
    return c
  }, [])

  const visibleCards = useMemo(
    () => (filter === "ALL" ? cards : cards.filter((c) => c.agent === filter)),
    [filter],
  )

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <main className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[1fr_380px]">
        {/* Kanban board */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                acme/web · sprint 24 · Q2
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Autonomous board
              </h1>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                <span className="font-semibold text-amber-700">BOSS</span> drops
                issues into To Do.{" "}
                <span className="font-semibold text-sky-700">FIXER</span> pulls
                cards through to Done.{" "}
                <span className="font-semibold text-emerald-700">TESTEES</span>{" "}
                closes the loop — green ships, red bounces it back.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm">
                Filters
              </Button>
              <Button type="button" size="sm">
                + New issue
              </Button>
            </div>
          </div>

          {/* Role filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              data-active={filter === "ALL"}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs transition-all duration-200 hover:-translate-y-px hover:text-foreground data-[active=true]:-translate-y-px data-[active=true]:border-foreground data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:shadow-md"
            >
              All
              <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[10px] text-muted-foreground group-data-[active=true]:bg-background/20 group-data-[active=true]:text-background">
                {cards.length}
              </span>
            </button>
            {(Object.keys(AGENT_BY_ROLE) as Role[]).map((role) => {
              const a = AGENTS[AGENT_BY_ROLE[role]]
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFilter(role)}
                  data-active={filter === role}
                  className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs transition-all duration-200 hover:-translate-y-px hover:text-foreground data-[active=true]:-translate-y-px data-[active=true]:border-foreground data-[active=true]:shadow-md"
                >
                  <AgentStatusDot
                    agent={AGENT_BY_ROLE[role]}
                    className="h-2 w-2 rounded-full"
                  />
                  <AgentName
                    agent={AGENT_BY_ROLE[role]}
                    className="font-semibold group-data-[active=true]:text-foreground"
                  >
                    {a.name}
                  </AgentName>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {roleCounts[role]}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((col) => {
              const list = visibleCards.filter((c) => c.tone === col.key)
              return (
                <div
                  key={col.key}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 transition-colors duration-300 hover:border-foreground/15"
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${col.dot}`} />
                      <h3 className="text-sm font-semibold">{col.title}</h3>
                      <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                        {list.length}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{col.hint}</span>
                  </div>
                  <div className="space-y-2.5">
                    {list.map((c) => (
                      <CardItem key={c.id} c={c} />
                    ))}
                    {list.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground/80">
                        nothing here
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* tiny analytics strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { k: "Cycle time", v: "54m", t: "\u2193 12% wk/wk", trend: "text-emerald-600" },
              { k: "PR green rate", v: "92%", t: "last 30 PRs", trend: "text-emerald-600" },
              { k: "Bounces", v: "3", t: "sent back by TESTEES", trend: "text-muted-foreground" },
              { k: "Active agents", v: "3 / 3", t: "BOSS \u00b7 FIXER \u00b7 TESTEES", trend: "text-muted-foreground" },
            ].map((s) => (
              <div
                key={s.k}
                className="group rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
              >
                <div className="text-xs text-muted-foreground">{s.k}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{s.v}</div>
                <div className={`mt-0.5 text-[11px] ${s.trend}`}>{s.t}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Chat sidecar */}
        <aside className="sticky top-[72px] flex h-[calc(100dvh-88px)] flex-col rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
              <h3 className="text-sm font-semibold">Sprint chat</h3>
              <span className="text-[11px] text-muted-foreground">#issue-128</span>
            </div>
            <button type="button" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              ⋯
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground/80">
              <div className="mb-1 font-semibold text-emerald-700">Sprint started</div>
              Issue <span className="font-mono">#128</span> picked up at 11:42.
              Three bots assigned automatically.
            </div>

            {chat.map((m, i) => {
              const a = AGENTS[AGENT_BY_ROLE[m.who]]
              return (
                <div
                  key={i}
                  className="group flex gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/40"
                >
                  <AgentBadge agent={AGENT_BY_ROLE[m.who]} size={28} />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <AgentName
                        agent={AGENT_BY_ROLE[m.who]}
                        className="text-[13px] font-semibold"
                      >
                        {a.name}
                      </AgentName>
                      <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[9px] font-semibold tracking-wider text-muted-foreground">
                        {m.who}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">{m.time}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">{m.text}</p>
                  </div>
                </div>
              )
            })}

            <div className="flex items-center gap-2 pl-[38px] text-[11px] text-muted-foreground">
              <span className="flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-sky-500 [animation-delay:0ms]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-sky-500 [animation-delay:120ms]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-sky-500 [animation-delay:240ms]" />
              </span>
              <span className="font-semibold text-sky-700">FIXER</span> is typing…
            </div>
          </div>

          <form onSubmit={handleSprintSubmit} className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-xl border border-input bg-card p-2 transition-shadow focus-within:ring-2 focus-within:ring-ring/30">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault()
                    handleSprintSubmit(e)
                  }
                }}
                rows={2}
                placeholder="Paste a GitHub issue URL, or nudge a bot — @boss @fixer @testees"
                className="flex-1 resize-none bg-transparent text-[13px] placeholder:text-muted-foreground focus:outline-none"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 shrink-0"
                disabled={draft.trim().length === 0}
              >
                Send
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex gap-3">
                <button type="button" className="transition-colors hover:text-foreground">＠ mention</button>
                <button type="button" className="transition-colors hover:text-foreground">🔗 link</button>
                <button type="button" className="transition-colors hover:text-foreground">⌘K commands</button>
              </div>
              {forwarded ? (
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1 font-medium text-emerald-600 transition-colors hover:text-emerald-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Sent to Squad chat →
                </Link>
              ) : (
                <span>⌘↵ to send · shared with Squad chat</span>
              )}
            </div>
          </form>
        </aside>
      </main>
    </div>
  )
}
