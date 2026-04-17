"use client"

import { useState } from "react"

import Link from "next/link"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type CardT = {
  id: string
  title: string
  issue: number
  agent: "PM" | "ENG" | "QA"
  tags: string[]
  tone: "todo" | "progress" | "done" | "merged"
}

const columns: {
  key: CardT["tone"]
  title: string
  hint: string
  dot: string
}[] = [
  { key: "todo", title: "To Do", hint: "queued by PM", dot: "bg-amber-500" },
  {
    key: "progress",
    title: "In Progress",
    hint: "Engineer working",
    dot: "bg-sky-500",
  },
  { key: "done", title: "Done", hint: "awaiting QA", dot: "bg-emerald-500" },
  {
    key: "merged",
    title: "Merged",
    hint: "PR shipped",
    dot: "bg-muted-foreground",
  },
]

const cards: CardT[] = [
  {
    id: "CDP-2142",
    title: "Settings: add SSO toggle for enterprise workspaces",
    issue: 131,
    agent: "PM",
    tags: ["auth", "settings"],
    tone: "todo",
  },
  {
    id: "CDP-2143",
    title: "Email: fix broken header spacing on Outlook iOS",
    issue: 133,
    agent: "PM",
    tags: ["email"],
    tone: "todo",
  },
  {
    id: "CDP-2141",
    title: "Search: clear stale results after filter reset",
    issue: 128,
    agent: "ENG",
    tags: ["a11y", "search"],
    tone: "progress",
  },
  {
    id: "CDP-2140",
    title: "Dashboard: chart legend overflows at 1280px",
    issue: 126,
    agent: "QA",
    tags: ["ui"],
    tone: "done",
  },
  {
    id: "CDP-2139",
    title: "Onboarding: skip button ignored after org switch",
    issue: 122,
    agent: "QA",
    tags: ["onboarding"],
    tone: "merged",
  },
]

const chat = [
  {
    who: "PM",
    name: "Priya",
    time: "11:42",
    text: "Issue #128 parsed. Creating CDP-2141 with 3 acceptance criteria.",
    tint: "bg-amber-500",
  },
  {
    who: "ENG",
    name: "Enzo",
    time: "11:45",
    text: "Picked up CDP-2141, pulled branch feat/search-reset-cache.",
    tint: "bg-sky-500",
  },
  {
    who: "ENG",
    name: "Enzo",
    time: "11:51",
    text: "Patch pushed. Moving card → Done.",
    tint: "bg-sky-500",
  },
  {
    who: "QA",
    name: "Quinn",
    time: "11:53",
    text: "4 Playwright scenarios staged. Running now.",
    tint: "bg-emerald-500",
  },
  {
    who: "QA",
    name: "Quinn",
    time: "11:54",
    text: "All green. Raising PR #412.",
    tint: "bg-emerald-500",
  },
]

function CardItem({ c }: { c: CardT }) {
  const col = columns.find((x) => x.key === c.tone)!
  return (
    <div className="group border-border bg-card cursor-grab rounded-xl border p-3 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-[10px] font-semibold tracking-wider">
          {c.id}
        </span>
        <Badge
          variant="outline"
          className="gap-1.5 rounded-full px-2 py-0 text-[10px] font-medium"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
          {col.title}
        </Badge>
      </div>
      <h4 className="mt-1.5 text-[13.5px] leading-snug font-semibold">
        {c.title}
      </h4>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex gap-1">
          {c.tags.map((t) => (
            <span
              key={t}
              className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 font-mono text-[10px]"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-[10px]">
          <a className="underline-offset-2 hover:underline" href="#">
            #{c.issue}
          </a>
          <Avatar className="h-5 w-5 text-[9px]">
            <AvatarFallback
              className={`${
                c.agent === "PM"
                  ? "bg-amber-500"
                  : c.agent === "ENG"
                    ? "bg-sky-500"
                    : "bg-emerald-500"
              } font-bold text-white`}
            >
              {c.agent[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [draft, setDraft] = useState("")

  return (
    <div className="bg-background min-h-dvh">
      <header className="sticky top-0 z-20 bg-neutral-950 text-white">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground grid h-7 w-7 place-items-center rounded-md text-[13px] font-bold">
                C
              </div>
              <span className="text-[15px] font-bold tracking-tight">
                codapac
              </span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/">Board</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white/80 hover:bg-white/10 hover:text-white"
              >
                <a href="#sprints">Sprints</a>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white/80 hover:bg-white/10 hover:text-white"
              >
                <a href="#prs">PRs</a>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white/80 hover:bg-white/10 hover:text-white"
              >
                <a href="#agents">Agents</a>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white/80 hover:bg-white/10 hover:text-white"
              >
                <a href="#docs">Docs</a>
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white md:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              3 agents active
            </span>
            <Button asChild size="sm" className="shadow-sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[1fr_380px]">
        {/* Kanban board */}
        <section className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
                acme/web · sprint 24 · Q2
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Autonomous board
              </h1>
              <p className="text-muted-foreground mt-1 max-w-lg text-sm">
                The PM agent drops issues into To Do. The Engineer pulls cards
                through to Done. QA closes the loop — green means PR, red
                bounces the card back.
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((col) => {
              const list = cards.filter((c) => c.tone === col.key)
              return (
                <div
                  key={col.key}
                  className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-3"
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${col.dot}`}
                      />
                      <h3 className="text-sm font-semibold">{col.title}</h3>
                      <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-[10px] font-semibold">
                        {list.length}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[11px]">
                      {col.hint}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {list.map((c) => (
                      <CardItem key={c.id} c={c} />
                    ))}
                    {list.length === 0 && (
                      <div className="border-border text-muted-foreground rounded-xl border border-dashed p-5 text-center text-xs">
                        drop new cards here
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* tiny analytics strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { k: "Cycle time", v: "54m", t: "↓ 12% wk/wk" },
              { k: "PR green rate", v: "92%", t: "last 30 PRs" },
              { k: "Bounces", v: "3", t: "sent back by QA" },
              { k: "Active agents", v: "3 / 3", t: "pm · eng · qa" },
            ].map((s) => (
              <div
                key={s.k}
                className="border-border bg-card rounded-2xl border p-4"
              >
                <div className="text-muted-foreground text-xs">{s.k}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">
                  {s.v}
                </div>
                <div className="text-muted-foreground mt-0.5 text-[11px]">
                  {s.t}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Chat sidecar */}
        <aside className="border-border bg-card sticky top-[72px] flex h-[calc(100dvh-88px)] flex-col rounded-2xl border">
          <div className="border-border flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold">Sprint chat</h3>
              <span className="text-muted-foreground text-[11px]">
                #issue-128
              </span>
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ⋯
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
            <div className="bg-secondary/60 text-secondary-foreground rounded-xl p-3 text-xs">
              <div className="mb-1 font-semibold">Sprint started</div>
              Issue <span className="font-mono">#128</span> picked up at 11:42.
              Three agents assigned automatically.
            </div>

            {chat.map((m, i) => (
              <div key={i} className="flex gap-2.5">
                <Avatar className="h-7 w-7 text-[10px]">
                  <AvatarFallback className={`${m.tint} font-bold text-white`}>
                    {m.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold">{m.name}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {m.who}
                    </span>
                    <span className="text-muted-foreground ml-auto text-[10px]">
                      {m.time}
                    </span>
                  </div>
                  <p className="text-foreground/90 mt-0.5 text-[13px] leading-snug">
                    {m.text}
                  </p>
                </div>
              </div>
            ))}

            <div className="text-muted-foreground flex items-center gap-2 pl-9 text-[11px]">
              <span className="flex gap-0.5">
                <span className="bg-muted-foreground h-1 w-1 animate-bounce rounded-full [animation-delay:0ms]" />
                <span className="bg-muted-foreground h-1 w-1 animate-bounce rounded-full [animation-delay:120ms]" />
                <span className="bg-muted-foreground h-1 w-1 animate-bounce rounded-full [animation-delay:240ms]" />
              </span>
              Enzo is typing…
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setDraft("")
            }}
            className="border-border border-t p-3"
          >
            <div className="border-input bg-card focus-within:ring-ring/30 flex items-end gap-2 rounded-xl border p-2 focus-within:ring-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Paste a github issue url, or nudge an agent @pm @eng @qa"
                className="placeholder:text-muted-foreground flex-1 resize-none bg-transparent text-[13px] focus:outline-none"
              />
              <Button type="submit" size="sm" className="h-8 shrink-0">
                Send
              </Button>
            </div>
            <div className="text-muted-foreground mt-2 flex items-center justify-between text-[11px]">
              <div className="flex gap-3">
                <button type="button">＠ mention</button>
                <button type="button">🔗 link</button>
                <button type="button">⌘K commands</button>
              </div>
              <span>⌘↵ to send</span>
            </div>
          </form>
        </aside>
      </main>
    </div>
  )
}
