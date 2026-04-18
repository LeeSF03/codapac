"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { AgentBadge } from "@/components/agent-badge"
import { AGENTS, AgentKey } from "@/components/agent-orb"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { authClient } from "@/lib/auth-client"
import {
  type AgentMsg,
  type ChatStore,
  createThread,
  deleteThread,
  getChatStore,
  type Project,
  renameThread,
  sendChatMessage,
  setActiveThread,
  subscribeChat,
  type Thread,
  type UserMsg,
} from "@/lib/chat-bus"
import { cn } from "@/lib/utils"

const AGENT_KEYS: AgentKey[] = ["priya", "enzo", "quinn"]

const QUICK_PROMPTS = [
  "the checkout button is broken",
  "run the tests on #128",
  "scope a new auth ticket",
]

const DAY_MS = 24 * 60 * 60 * 1000

type BucketKey = "today" | "yesterday" | "week" | "older"

const BUCKET_LABEL: Record<BucketKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "Previous 7 days",
  older: "Older",
}

function bucketFor(updatedAt: number): BucketKey {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (updatedAt >= start) return "today"
  if (updatedAt >= start - DAY_MS) return "yesterday"
  if (updatedAt >= start - 7 * DAY_MS) return "week"
  return "older"
}

function emptyStore(): ChatStore {
  return {
    version: 2,
    projects: [],
    threads: {},
    order: [],
    activeId: null,
  }
}

export default function ChatPage() {
  const { data: session } = authClient.useSession()
  const user = session?.user as
    | { email?: string | null; name?: string | null; image?: string | null }
    | undefined
  const displayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "you"

  const [store, setStore] = useState<ChatStore>(emptyStore)
  const [hydrated, setHydrated] = useState(false)
  const [projectFilter, setProjectFilter] = useState<string | "all">("all")
  const [search, setSearch] = useState("")
  const [draft, setDraft] = useState("")

  useEffect(() => {
    setStore(getChatStore())
    setHydrated(true)
    const unsubscribe = subscribeChat(() => setStore(getChatStore()))
    return unsubscribe
  }, [])

  const activeThread: Thread | null = useMemo(() => {
    if (!store.activeId) return null
    return store.threads[store.activeId] ?? null
  }, [store])

  const projectById = useMemo(() => {
    const map = new Map<string, Project>()
    for (const p of store.projects) map.set(p.id, p)
    return map
  }, [store.projects])

  const filteredThreadIds = useMemo(() => {
    const q = search.trim().toLowerCase()
    return store.order.filter((id) => {
      const t = store.threads[id]
      if (!t) return false
      if (projectFilter !== "all" && t.projectId !== projectFilter) return false
      if (q && !t.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [store, projectFilter, search])

  const groupedThreadIds = useMemo(() => {
    const groups: Record<BucketKey, string[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    }
    for (const id of filteredThreadIds) {
      const t = store.threads[id]
      if (!t) continue
      groups[bucketFor(t.updatedAt)].push(id)
    }
    return groups
  }, [filteredThreadIds, store.threads])

  const handleNewChat = () => {
    createThread(projectFilter === "all" ? null : projectFilter)
    setDraft("")
  }

  const handleDelete = (id: string) => {
    deleteThread(id)
  }

  const handlePickThread = (id: string) => {
    setActiveThread(id)
  }

  const handleSend = () => {
    if (!draft.trim() || activeThread?.typing) return
    const ok = sendChatMessage(draft, displayName)
    if (ok) setDraft("")
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <SiteHeader fullBleed />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          hydrated={hydrated}
          projects={store.projects}
          projectFilter={projectFilter}
          setProjectFilter={setProjectFilter}
          search={search}
          setSearch={setSearch}
          groups={groupedThreadIds}
          threads={store.threads}
          projectById={projectById}
          activeId={store.activeId}
          onNewChat={handleNewChat}
          onPickThread={handlePickThread}
          onDeleteThread={handleDelete}
        />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MainPane
            hydrated={hydrated}
            thread={activeThread}
            project={
              activeThread?.projectId
                ? projectById.get(activeThread.projectId) ?? null
                : null
            }
            displayName={displayName}
            draft={draft}
            setDraft={setDraft}
            onSend={handleSend}
            onKeyDown={onKeyDown}
            onPickPrompt={(p) => setDraft(p)}
            onRename={(title) => activeThread && renameThread(activeThread.id, title)}
          />
        </section>
      </div>
    </div>
  )
}

/* ─────────────────────── Sidebar ─────────────────────── */

type SidebarProps = {
  hydrated: boolean
  projects: Project[]
  projectFilter: string | "all"
  setProjectFilter: (v: string | "all") => void
  search: string
  setSearch: (v: string) => void
  groups: Record<BucketKey, string[]>
  threads: Record<string, Thread>
  projectById: Map<string, Project>
  activeId: string | null
  onNewChat: () => void
  onPickThread: (id: string) => void
  onDeleteThread: (id: string) => void
}

function Sidebar(props: SidebarProps) {
  const {
    hydrated,
    projects,
    projectFilter,
    setProjectFilter,
    search,
    setSearch,
    groups,
    threads,
    projectById,
    activeId,
    onNewChat,
    onPickThread,
    onDeleteThread,
  } = props

  const bucketOrder: BucketKey[] = ["today", "yesterday", "week", "older"]
  const hasAnyThread = bucketOrder.some((b) => groups[b].length > 0)

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Squad chat
        </span>
      </div>

      <div className="px-3 pt-3">
        <Button
          type="button"
          onClick={onNewChat}
          className="w-full justify-center gap-2 font-medium"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          New chat
        </Button>
      </div>

      <div className="px-3 pt-4">
        <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Projects
        </p>
        <div className="grid gap-1">
          <ProjectChip
            active={projectFilter === "all"}
            onClick={() => setProjectFilter("all")}
            dotClass="bg-foreground/30"
            label="All chats"
          />
          {projects.map((p) => (
            <ProjectChip
              key={p.id}
              active={projectFilter === p.id}
              onClick={() => setProjectFilter(p.id)}
              dotClass={p.dot}
              label={p.name}
            />
          ))}
        </div>
      </div>

      <div className="px-3 pt-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-[12.5px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-2 pb-2">
        {!hydrated ? null : !hasAnyThread ? (
          <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
            No chats yet. Start one above.
          </p>
        ) : (
          bucketOrder.map((bucket) => {
            const ids = groups[bucket]
            if (ids.length === 0) return null
            return (
              <div key={bucket} className="mt-3 first:mt-1">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {BUCKET_LABEL[bucket]}
                </p>
                <ul className="grid gap-0.5">
                  {ids.map((id) => {
                    const t = threads[id]
                    if (!t) return null
                    const project = t.projectId ? projectById.get(t.projectId) ?? null : null
                    return (
                      <ThreadRow
                        key={id}
                        active={id === activeId}
                        title={t.title}
                        projectDot={project?.dot ?? "bg-muted-foreground/40"}
                        onSelect={() => onPickThread(id)}
                        onDelete={() => onDeleteThread(id)}
                      />
                    )
                  })}
                </ul>
              </div>
            )
          })
        )}
      </div>

    </aside>
  )
}

function ProjectChip({
  active,
  onClick,
  dotClass,
  label,
}: {
  active: boolean
  onClick: () => void
  dotClass: string
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-foreground/80 transition-colors hover:bg-foreground/5 data-[active=true]:bg-foreground/10 data-[active=true]:text-foreground"
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      <span className="truncate">{label}</span>
    </button>
  )
}

function ThreadRow({
  active,
  title,
  projectDot,
  onSelect,
  onDelete,
}: {
  active: boolean
  title: string
  projectDot: string
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onSelect}
        data-active={active}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground/80 transition-colors hover:bg-foreground/5 data-[active=true]:bg-foreground/10 data-[active=true]:text-foreground"
      >
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", projectDot)} />
        <span className="flex-1 truncate">{title}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        aria-label="Delete chat"
        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 hover:text-destructive"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </button>
    </li>
  )
}

/* ─────────────────────── Main pane ─────────────────────── */

type MainPaneProps = {
  hydrated: boolean
  thread: Thread | null
  project: Project | null
  displayName: string
  draft: string
  setDraft: (v: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onPickPrompt: (p: string) => void
  onRename: (title: string) => void
}

function MainPane({
  hydrated,
  thread,
  project,
  displayName,
  draft,
  setDraft,
  onSend,
  onKeyDown,
  onPickPrompt,
  onRename,
}: MainPaneProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [thread?.messages, thread?.typing])

  const hasUserMessage = !!thread?.messages.some((m) => m.kind === "user")
  const canSend = draft.trim().length > 0 && thread?.typing == null

  return (
    <div className="flex h-full min-w-0 flex-col">
      <TopStrip thread={thread} project={project} onRename={onRename} />

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {!hydrated || !thread ? (
          <div className="p-8" />
        ) : hasUserMessage ? (
          <div className="mx-auto w-full max-w-2xl space-y-5 px-6 py-6">
            {thread.messages.map((m) =>
              m.kind === "user" ? (
                <UserBubble key={m.id} msg={m} fallbackName={displayName} />
              ) : (
                <AgentBubble key={m.id} msg={m} />
              ),
            )}
            {thread.typing && <TypingRow agent={thread.typing} />}
          </div>
        ) : (
          <EmptyHero onPickPrompt={onPickPrompt} />
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSend()
        }}
        className="border-t border-border bg-card/60 px-6 py-4"
      >
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-end gap-3 rounded-2xl border border-input bg-card p-3 shadow-xs transition-shadow focus-within:ring-2 focus-within:ring-ring/30">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={3}
              placeholder="Ask your squad — tag @enzo for fixes, @quinn for tests."
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[14.5px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            />
            <Button
              type="submit"
              size="lg"
              className="h-11 shrink-0 px-5"
              disabled={!canSend}
            >
              Send
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[11.5px] text-muted-foreground">
            <span>⌘↵ to send · shared with sprint chat</span>
            <span>
              {thread?.messages.filter((m) => m.kind !== "agent" || !m.id.startsWith("seed-")).length ?? 0} messages
            </span>
          </div>
        </div>
      </form>
    </div>
  )
}

function TopStrip({
  thread,
  project,
  onRename,
}: {
  thread: Thread | null
  project: Project | null
  onRename: (title: string) => void
}) {
  const handleRename = () => {
    if (!thread) return
    const next = window.prompt("Rename chat", thread.title)
    if (next == null) return
    onRename(next)
  }

  return (
    <div className="border-b border-border bg-card/80">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={handleRename}
            className="min-w-0 truncate text-left text-[15.5px] font-semibold tracking-tight transition-colors hover:text-primary"
            title="Click to rename"
          >
            {thread?.title ?? "Squad chat"}
          </button>
          {project ? (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold ring-1 ring-border",
                project.accent,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", project.dot)} />
              {project.name}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {AGENT_KEYS.map((k) => {
            const a = AGENTS[k]
            return (
              <span
                key={k}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-border",
                  a.accent,
                )}
              >
                <AgentBadge agent={k} size={16} />
                {a.name}
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EmptyHero({
  onPickPrompt,
}: {
  onPickPrompt: (p: string) => void
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <div className="mx-auto mb-5 flex items-center justify-center gap-2">
            {AGENT_KEYS.map((k) => (
              <AgentBadge key={k} agent={k} size={40} />
            ))}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Ask your squad anything
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
            Priya scopes it, Enzo fixes it, Quinn double-checks it. Start with
            one of these or type your own.
          </p>
        </div>
        <div className="mx-auto mt-6 grid w-full max-w-xl gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPickPrompt(p)}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-[13.5px] font-medium text-foreground/90 shadow-xs transition-all hover:-translate-y-px hover:border-foreground/30 hover:shadow-md"
            >
              <span className="truncate">{p}</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── Bubbles ─────────────────────── */

function AgentBubble({ msg }: { msg: AgentMsg }) {
  const a = AGENTS[msg.agent]
  return (
    <div className="flex gap-3">
      <AgentBadge agent={msg.agent} size={34} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-[14px] font-semibold", a.accent)}>
            {a.name}
          </span>
          <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[9.5px] font-semibold tracking-wider text-muted-foreground">
            {a.role}
          </span>
          <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">
            {msg.time}
          </span>
        </div>
        <div className="mt-1.5 max-w-[700px] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-[14.5px] leading-relaxed text-foreground/90">
          {msg.text}
        </div>
      </div>
    </div>
  )
}

function UserBubble({
  msg,
  fallbackName,
}: {
  msg: UserMsg
  fallbackName: string
}) {
  const name = msg.name?.trim() || fallbackName
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[700px] flex-col items-end gap-1">
        <div className="flex items-baseline gap-2 text-[11.5px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">{name}</span>
          <span className="font-mono text-[10.5px]">{msg.time}</span>
        </div>
        <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[14.5px] leading-relaxed text-primary-foreground">
          {msg.text}
        </div>
      </div>
    </div>
  )
}

function TypingRow({ agent }: { agent: AgentKey }) {
  const a = AGENTS[agent]
  return (
    <div className="flex items-center gap-2 pl-[46px] text-[12px] text-muted-foreground">
      <span className="flex gap-0.5">
        <span className={cn("h-1.5 w-1.5 animate-bounce rounded-full", a.dot, "[animation-delay:0ms]")} />
        <span className={cn("h-1.5 w-1.5 animate-bounce rounded-full", a.dot, "[animation-delay:120ms]")} />
        <span className={cn("h-1.5 w-1.5 animate-bounce rounded-full", a.dot, "[animation-delay:240ms]")} />
      </span>
      <span className={cn("font-semibold", a.accent)}>{a.name}</span> is typing…
    </div>
  )
}
