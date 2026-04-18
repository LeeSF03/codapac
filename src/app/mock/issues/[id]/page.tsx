"use client"

import Link from "next/link"
import { use, useState } from "react"

import { AgentBadge } from "@/components/agent-badge"
import { AGENTS, AgentKey, AgentOrb } from "@/components/agent-orb"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

type AgentState = "idle" | "thinking" | "working" | "done"

const agentState: Record<AgentKey, { state: AgentState; line: string }> = {
  priya: {
    state: "done",
    line: "Handed off CDP-2141 with 3 acceptance criteria.",
  },
  enzo: { state: "working", line: "Editing src/lib/search/reset-cache.ts…" },
  quinn: { state: "thinking", line: "Drafting 4 Playwright scenarios." },
}

const acceptance = [
  { text: "Reset clears stale results from the grid", done: true },
  { text: "Typed query re-runs on focus after reset", done: true },
  { text: "Keyboard shortcut ⌘⇧K triggers reset", done: false },
]

type EventKind = "msg" | "commit" | "status" | "test"

const events: {
  agent: AgentKey
  time: string
  kind: EventKind
  text: string
}[] = [
  { agent: "priya", time: "11:42", kind: "msg", text: "Parsed issue #128 → CDP-2141. 3 acceptance criteria attached." },
  { agent: "priya", time: "11:42", kind: "status", text: "Moved card to To Do" },
  { agent: "enzo", time: "11:45", kind: "msg", text: "Picking this up. Branching feat/search-reset-cache." },
  { agent: "enzo", time: "11:46", kind: "commit", text: "init: scaffold reset handler" },
  { agent: "enzo", time: "11:51", kind: "commit", text: "fix: clear stale cache on filter reset" },
  { agent: "enzo", time: "11:51", kind: "status", text: "Moved card to Done" },
  { agent: "quinn", time: "11:53", kind: "test", text: "4 Playwright scenarios staged — running now." },
  { agent: "quinn", time: "11:54", kind: "msg", text: "All 4 green. Raising PR #412." },
]

export default function IssuePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [draft, setDraft] = useState("")

  const fixerName = AGENTS.enzo.name

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <main className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[1fr_400px]">
        {/* Main column */}
        <section className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Board
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground">
                CDP-{id}
              </span>
              <Badge
                variant="outline"
                className="gap-1.5 border-transparent bg-sky-500/10 text-sky-700"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 [animation:cp-breath_1.6s_ease-in-out_infinite]" />
                In Progress
              </Badge>
              <a
                href="#"
                className="text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                github.com/acme/web#{id}
              </a>
            </div>
            <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight">
              Search: clear stale results after filter reset
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              When a user clears the search filters, the results grid still
              shows the previous matches until they retype. Reset should flush
              the cache and refocus the input.
            </p>
          </div>

          {/* Acceptance */}
          <Card className="rounded-2xl border-border bg-card p-5 transition-shadow hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Acceptance criteria</h3>
              <span className="text-[11px] text-muted-foreground">
                {acceptance.filter((a) => a.done).length} of {acceptance.length} complete
              </span>
            </div>
            <ul className="grid gap-2">
              {acceptance.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors ${
                      a.done ? "bg-emerald-500 text-white" : "border border-input"
                    }`}
                  >
                    {a.done && (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-2.5 w-2.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`text-[13.5px] leading-snug transition-colors ${
                      a.done ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {a.text}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Linked PR */}
          <Card className="flex items-center gap-3 rounded-2xl border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-md">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="6" cy="6" r="2" />
                <circle cx="6" cy="18" r="2" />
                <circle cx="18" cy="18" r="2" />
                <path d="M6 8v8M18 14V9a3 3 0 0 0-3-3h-3" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold">
                  PR #412 — fix: clear stale cache on filter reset
                </span>
                <Badge
                  variant="outline"
                  className="gap-1.5 border-transparent bg-emerald-500/10 text-emerald-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  green
                </Badge>
              </div>
              <p className="text-[12px] text-muted-foreground">
                feat/search-reset-cache → main · 2 files · +34 / -9 · opened by{" "}
                <span className="font-semibold text-sky-700">{fixerName}</span>
              </p>
            </div>
            <Button size="sm" variant="outline">
              Open PR
            </Button>
          </Card>

          {/* Event timeline */}
          <Card className="rounded-2xl border-border bg-card p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold">Activity</h3>
              <span className="text-[11px] text-muted-foreground">auto-generated by bots</span>
            </div>
            <ol className="relative px-5 py-4">
              <span className="absolute top-4 bottom-4 left-[34px] w-px bg-border" />
              <div className="space-y-3">
                {events.map((e, i) => {
                  const a = AGENTS[e.agent]
                  return (
                    <li
                      key={i}
                      className="group relative flex gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40"
                    >
                      <AgentBadge
                        agent={e.agent}
                        size={28}
                        className="z-10 ring-4 ring-card"
                      />
                      <div className="flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className={`text-[13px] font-semibold ${a.accent}`}>
                            {a.name}
                          </span>
                          <KindChip kind={e.kind} />
                          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                            {e.time}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">
                          {e.text}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </div>
            </ol>
          </Card>
        </section>

        {/* Aside — agent status + chat */}
        <aside className="space-y-5">
          <Card className="rounded-2xl border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Sprint squad</h3>
              <span className="text-[11px] text-muted-foreground">3 bots · live</span>
            </div>
            <div className="grid gap-2.5">
              {(Object.keys(AGENTS) as AgentKey[]).map((k) => {
                const a = AGENTS[k]
                const s = agentState[k]
                return (
                  <div
                    key={k}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-card hover:shadow-sm"
                  >
                    <div className="relative shrink-0">
                      <AgentOrb
                        agent={k}
                        size={56}
                        paused={s.state === "idle"}
                      />
                      <StateDot state={s.state} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-semibold ${a.accent}`}>
                          {a.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {a.role}
                        </span>
                      </div>
                      <p className="truncate text-[12px] text-foreground/80">
                        {s.line}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="flex h-[460px] flex-col rounded-2xl border-border bg-card p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
                <h3 className="text-sm font-semibold">Sprint chat</h3>
                <span className="text-[11px] text-muted-foreground">#issue-{id}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {events
                .filter((e) => e.kind === "msg")
                .map((m, i) => {
                  const a = AGENTS[m.agent]
                  return (
                    <div
                      key={i}
                      className="flex gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-muted/40"
                    >
                      <AgentBadge agent={m.agent} size={28} />
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-[13px] font-semibold ${a.accent}`}>
                            {a.name}
                          </span>
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                            {m.time}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">
                          {m.text}
                        </p>
                      </div>
                    </div>
                  )
                })}
              <div className="flex items-center gap-2 pl-[38px] text-[11px] text-muted-foreground">
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:120ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:240ms]" />
                </span>
                <span className="font-semibold text-emerald-700">{AGENTS.quinn.name}</span> is drafting tests…
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setDraft("")
              }}
              className="border-t border-border p-3"
            >
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Nudge a bot — @boss @fixer @testees"
                className="resize-none text-[13px]"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">⌘↵ to send</span>
                <Button type="submit" size="sm">
                  Send
                </Button>
              </div>
            </form>
          </Card>
        </aside>
      </main>
    </div>
  )
}

function KindChip({ kind }: { kind: EventKind }) {
  const map: Record<EventKind, { label: string; className: string }> = {
    msg: { label: "message", className: "bg-muted text-muted-foreground" },
    commit: { label: "commit", className: "bg-sky-500/10 text-sky-700" },
    status: { label: "status", className: "bg-amber-500/10 text-amber-700" },
    test: { label: "test", className: "bg-emerald-500/10 text-emerald-700" },
  }
  const c = map[kind]
  return (
    <span
      className={`rounded-full px-1.5 py-0 font-mono text-[10px] font-medium ${c.className}`}
    >
      {c.label}
    </span>
  )
}

function StateDot({ state }: { state: AgentState }) {
  const map: Record<AgentState, { color: string; pulse: boolean }> = {
    idle: { color: "bg-muted-foreground", pulse: false },
    thinking: { color: "bg-amber-500", pulse: true },
    working: { color: "bg-sky-500", pulse: true },
    done: { color: "bg-emerald-500", pulse: false },
  }
  const s = map[state]
  return (
    <span
      className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ring-card ${s.color} ${
        s.pulse ? "[animation:cp-breath_1.6s_ease-in-out_infinite]" : ""
      }`}
    />
  )
}
