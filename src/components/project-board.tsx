"use client"

import type { Route } from "next"
import Link from "next/link"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Streamdown } from "streamdown"

import { AgentBadge } from "@/components/agent-badge"
import {
  AGENTS,
  AgentName,
  AgentStatusDot,
} from "@/components/agent-orb"
import {
  NewIssueDialog,
  type NewIssueDialogInput,
} from "@/components/new-issue-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { sendChatMessage } from "@/lib/chat-bus"
import {
  AGENT_BY_ROLE,
  advanceCard,
  COLUMNS,
  deleteCard,
  regressCard,
  resetBoard,
  ROLES,
  TONE_ORDER,
  useBoard,
  type BoardActivityEntry,
  type BoardCard,
  type Role,
  type Tone,
} from "@/lib/mock-board"

type CardItemProps = {
  card: BoardCard
  href: string | null
  interactive: boolean
  onAdvance?: () => void
  onRegress?: () => void
  onDelete?: () => void
}

function CardItem({
  card,
  href,
  interactive,
  onAdvance,
  onRegress,
  onDelete,
}: CardItemProps) {
  const col = COLUMNS.find((x) => x.key === card.tone)!
  const a = AGENTS[AGENT_BY_ROLE[card.agent]]
  const toneIdx = TONE_ORDER.indexOf(card.tone)
  const canAdvance = toneIdx < TONE_ORDER.length - 1
  const canRegress = toneIdx > 0

  const content = (
    <>
      <span
        className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 ${col.dot} transition-transform duration-300 group-hover:scale-x-100`}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
          {card.id}
        </span>
        <Badge variant="outline" className="gap-1.5 rounded-full px-2 py-0 text-[10px] font-medium">
          <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
          {col.title}
        </Badge>
      </div>
      <h4 className="mt-1.5 text-[13.5px] font-semibold leading-snug transition-colors group-hover:text-foreground">
        {card.title}
      </h4>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {card.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-secondary-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="underline-offset-2 group-hover:underline">
            #{card.issueNumber}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-1.5 py-0.5 transition-colors group-hover:border-foreground/20">
            <AgentBadge agent={AGENT_BY_ROLE[card.agent]} size={14} />
            <span className="font-semibold text-foreground/80">{a.name}</span>
          </span>
        </div>
      </div>
      {interactive ? (
        <div className="mt-3 flex items-center justify-between gap-1 border-t border-dashed border-border pt-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRegress?.()
              }}
              disabled={!canRegress}
              aria-label="Move back"
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAdvance?.()
              }}
              disabled={!canAdvance}
              aria-label="Move forward"
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete?.()
            }}
            aria-label="Archive card"
            className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      ) : null}
    </>
  )

  if (!href) {
    return (
      <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href as Route}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {content}
    </Link>
  )
}

export type ProjectBoardProps = {
  /** When provided, the board reads from localStorage and enables create/move/delete. */
  projectId?: string
  boardState?: Pick<ReturnType<typeof useBoard>, "cards" | "activity" | "typing">
  interactive?: boolean
  eyebrow?: ReactNode
  title?: ReactNode
  description?: ReactNode
  /** Optional slot rendered above the title block (e.g. breadcrumb or inline actions). */
  headerSlot?: ReactNode
  emptyTodoMessage?: string
  issueHrefForCard?: (card: BoardCard) => string | null
  onCreateIssue?: (input: NewIssueDialogInput) => Promise<void> | void
  onAdvanceCard?: (cardId: string) => Promise<void> | void
  onRegressCard?: (cardId: string) => Promise<void> | void
  onDeleteCard?: (cardId: string) => Promise<void> | void
  onReset?: () => void
  chatMessages?: Array<{
    id: string
    role: "user" | "assistant" | "system"
    author: "USER" | "BOSS" | "SYSTEM"
    content: string
    time: string
  }>
  chatBusy?: boolean
  chatPlaceholder?: string
  chatQuickPrompts?: string[]
  onSendChat?: (message: string) => Promise<void> | void
}

export function ProjectBoard({
  projectId,
  boardState,
  interactive,
  eyebrow,
  title,
  description,
  headerSlot,
  emptyTodoMessage,
  issueHrefForCard,
  onCreateIssue,
  onAdvanceCard,
  onRegressCard,
  onDeleteCard,
  onReset,
  chatMessages,
  chatBusy,
  chatPlaceholder,
  chatQuickPrompts,
  onSendChat,
}: ProjectBoardProps = {}) {
  const localBoard = useBoard(projectId)
  const board = boardState ?? localBoard
  const isInteractive =
    interactive ??
    Boolean(
      projectId ||
        onCreateIssue ||
        onAdvanceCard ||
        onRegressCard ||
        onDeleteCard,
    )
  const canReset = Boolean(!boardState && projectId) || Boolean(onReset)

  const [draft, setDraft] = useState("")
  const [filter, setFilter] = useState<Role | "ALL">("ALL")
  const [forwarded, setForwarded] = useState(false)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const forwardTimer = useRef<number | null>(null)
  const chatMode = Boolean(chatMessages || onSendChat)
  const hasStreamingMessage = Boolean(
    chatMessages?.some((message) => message.id === "__streaming-boss"),
  )

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
    if (chatMode) {
      const trimmed = draft.trim()
      if (!trimmed || !onSendChat || chatBusy) return
      setDraft("")
      void Promise.resolve(onSendChat(trimmed)).catch(() => {
        setDraft(trimmed)
      })
      return
    }

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

  const cards = board.cards
  const activity = board.activity

  const roleCounts = useMemo(() => {
    const c: Record<Role, number> = { PM: 0, ENG: 0, QA: 0 }
    cards.forEach((x) => (c[x.agent] += 1))
    return c
  }, [cards])

  const visibleCards = useMemo(
    () => (filter === "ALL" ? cards : cards.filter((c) => c.agent === filter)),
    [filter, cards],
  )

  const stats = useMemo(() => {
    const total = cards.length
    const inFlight = cards.filter((c) => c.tone === "progress" || c.tone === "todo").length
    const shipped = cards.filter((c) => c.tone === "merged").length
    const shippedPct = total > 0 ? Math.round((shipped / total) * 100) : 0
    const activeRoles = new Set(cards.map((c) => c.agent)).size
    return { total, inFlight, shipped, shippedPct, activeRoles }
  }, [cards])

  const handleNewIssue = () => {
    if (!isInteractive) return
    setIssueDialogOpen(true)
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
      return
    }
    if (!projectId || boardState) return
    const ok = window.confirm("Reset this board to its mock seed data? Local changes will be discarded.")
    if (ok) resetBoard(projectId)
  }

  return (
    <>
      <main className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-[1fr_380px]">
        {/* Kanban board */}
        <section className="space-y-5">
          {headerSlot}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow ?? "acme/web · sprint 24 · Q2"}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {title ?? "Autonomous board"}
              </h1>
              <div className="mt-1 max-w-lg text-sm text-muted-foreground">
                {description ?? (
                  <p>
                    <span className="font-semibold text-amber-700">BOSS</span> drops
                    issues into To Do.{" "}
                    <span className="font-semibold text-sky-700">FIXER</span> pulls
                    cards through to Done.{" "}
                    <span className="font-semibold text-emerald-700">TESTEES</span>{" "}
                    closes the loop — green ships, red bounces it back.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {canReset ? (
                <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                  Reset board
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={handleNewIssue}
                disabled={!isInteractive}
                title={isInteractive ? undefined : "Open a project to file an issue"}
              >
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
            {ROLES.map((role) => {
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
            {COLUMNS.map((col) => {
              const list = visibleCards.filter((c) => c.tone === col.key)
              return (
                <ColumnDropZone
                  key={col.key}
                  tone={col.key}
                  title={col.title}
                  hint={col.hint}
                  dot={col.dot}
                  count={list.length}
                  interactive={isInteractive}
                >
                  {list.map((c) => (
                    <CardItem
                      key={c.id}
                      card={c}
                      href={issueHrefForCard ? issueHrefForCard(c) : `/mock/issues/${c.issueNumber}`}
                      interactive={isInteractive}
                      onAdvance={
                        onAdvanceCard
                          ? () => onAdvanceCard(c.id)
                          : projectId && !boardState
                            ? () => advanceCard(projectId, c.id)
                            : undefined
                      }
                      onRegress={
                        onRegressCard
                          ? () => onRegressCard(c.id)
                          : projectId && !boardState
                            ? () => regressCard(projectId, c.id)
                            : undefined
                      }
                      onDelete={
                        onDeleteCard
                          ? () => onDeleteCard(c.id)
                          : projectId && !boardState
                            ? () => deleteCard(projectId, c.id)
                            : undefined
                      }
                    />
                  ))}
                  {list.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground/80">
                      {isInteractive && col.key === "todo"
                        ? (emptyTodoMessage ?? "No work queued — hit “+ New issue”.")
                        : "nothing here"}
                    </div>
                  ) : null}
                </ColumnDropZone>
              )
            })}
          </div>

          {/* tiny analytics strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                k: "Open cards",
                v: stats.total.toString(),
                t:
                  stats.inFlight === 0
                    ? "nothing queued"
                    : `${stats.inFlight} still moving`,
                trend: "text-muted-foreground",
              },
              {
                k: "Shipped",
                v: `${stats.shippedPct}%`,
                t: `${stats.shipped} of ${stats.total || 0} merged`,
                trend: stats.shippedPct >= 50 ? "text-emerald-600" : "text-muted-foreground",
              },
              {
                k: "Role mix",
                v: `${stats.activeRoles} / 3`,
                t: "BOSS · FIXER · TESTEES",
                trend: "text-muted-foreground",
              },
              {
                k: "Last event",
                v: activity.length > 0 ? activity[activity.length - 1].time : "—",
                t:
                  activity.length > 0
                    ? activity[activity.length - 1].who.toString()
                    : "no activity yet",
                trend: "text-muted-foreground",
              },
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
              <h3 className="text-sm font-semibold">
                {chatMode ? "Project chat" : "Sprint chat"}
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {chatMode
                  ? `${chatMessages?.length ?? 0} message${(chatMessages?.length ?? 0) === 1 ? "" : "s"}`
                  : isInteractive
                    ? `${cards.length} card${cards.length === 1 ? "" : "s"}`
                    : "#issue-128"}
              </span>
            </div>
            <button type="button" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              ⋯
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
            {chatMode ? (
              <>
                {chatMessages && chatMessages.length > 0 ? (
                  <>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground/80">
                      <div className="mb-1 font-semibold text-emerald-700">
                        BOSS online
                      </div>
                      Chat with the project manager directly. Messages are saved here.
                    </div>
                    {chatMessages.map((message) => (
                      <ProjectChatRow key={message.id} message={message} />
                    ))}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground/80">
                      <div className="mb-1 font-semibold text-emerald-700">
                        BOSS is ready
                      </div>
                      Ask for goal details, task ideas, or next steps for this project.
                    </div>
                    {(chatQuickPrompts ?? []).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setDraft(prompt)}
                        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left text-[12.5px] font-medium text-foreground/90 shadow-xs transition-all hover:-translate-y-px hover:border-foreground/30 hover:shadow-md"
                      >
                        <span className="line-clamp-2">{prompt}</span>
                        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12h14" />
                          <path d="m13 6 6 6-6 6" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
                {chatBusy && !hasStreamingMessage ? (
                  <ProjectChatTyping />
                ) : null}
              </>
            ) : (
              <>
                {activity.length === 0 ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground/80">
                    <div className="mb-1 font-semibold text-emerald-700">Quiet sprint</div>
                    Nothing to report yet. File an issue to get the squad talking.
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground/80">
                    <div className="mb-1 font-semibold text-emerald-700">Sprint live</div>
                    {activity.length} event{activity.length === 1 ? "" : "s"} on the
                    wire. Latest at {activity[activity.length - 1].time}.
                  </div>
                )}

                {activity.map((m) => (
                  <ActivityRow key={m.id} entry={m} />
                ))}

                {board.typing ? <TypingIndicator who={board.typing} /> : null}
              </>
            )}
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
                placeholder={
                  chatMode
                    ? (chatPlaceholder ?? "Ask BOSS about goals, tasks, or next steps")
                    : "Paste a GitHub issue URL, or nudge a bot — @boss @fixer @testees"
                }
                className="flex-1 resize-none bg-transparent text-[13px] placeholder:text-muted-foreground focus:outline-none"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 shrink-0"
                disabled={draft.trim().length === 0 || Boolean(chatBusy)}
              >
                {chatBusy ? "..." : "Send"}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              {chatMode ? (
                <>
                  <span>⌘↵ to send · saved to this project</span>
                  <span>BOSS thread</span>
                </>
              ) : (
                <>
                  <div className="flex gap-3">
                    <button type="button" className="transition-colors hover:text-foreground">＠ mention</button>
                    <button type="button" className="transition-colors hover:text-foreground">🔗 link</button>
                    <button type="button" className="transition-colors hover:text-foreground">⌘K commands</button>
                  </div>
                  {forwarded ? (
                    <Link
                      href={"/mock/chat" as Route}
                      className="inline-flex items-center gap-1 font-medium text-emerald-600 transition-colors hover:text-emerald-700"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Sent to Squad chat →
                    </Link>
                  ) : (
                    <span>⌘↵ to send · shared with Squad chat</span>
                  )}
                </>
              )}
            </div>
          </form>
        </aside>
      </main>

      {isInteractive ? (
        <NewIssueDialog
          open={issueDialogOpen}
          projectId={projectId}
          onClose={() => setIssueDialogOpen(false)}
          onCreateIssue={onCreateIssue}
        />
      ) : null}
    </>
  )
}

function ProjectChatRow({
  message,
}: {
  message: {
    role: "user" | "assistant" | "system"
    author: "USER" | "BOSS" | "SYSTEM"
    content: string
    time: string
  }
}) {
  if (message.role === "system" || message.author === "SYSTEM") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider">
            system
          </span>
          <span className="ml-auto font-mono text-[10px]">{message.time}</span>
        </div>
        <div className="mt-0.5 leading-snug [&_a]:underline [&_li]:my-0.5 [&_ol]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_strong]:font-semibold [&_ul]:ml-4 [&_ul]:list-disc">
          <Streamdown>{message.content}</Streamdown>
        </div>
      </div>
    )
  }

  if (message.role === "user" || message.author === "USER") {
    return (
      <div className="flex gap-2.5 rounded-lg px-1 py-0.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
          YOU
        </span>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold">You</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {message.time}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/40">
      <AgentBadge agent="priya" size={28} />
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold">BOSS</span>
          <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[9px] font-semibold tracking-wider text-muted-foreground">
            PM
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {message.time}
          </span>
        </div>
        <div className="mt-0.5 text-[13px] leading-snug text-foreground/90 [&_a]:underline [&_li]:my-0.5 [&_ol]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_strong]:font-semibold [&_ul]:ml-4 [&_ul]:list-disc">
          <Streamdown>{message.content}</Streamdown>
        </div>
      </div>
    </div>
  )
}

function ProjectChatTyping() {
  return (
    <div className="flex items-center gap-2 pl-[38px] text-[11px] text-muted-foreground">
      <span className="flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-amber-500 [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-amber-500 [animation-delay:120ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-amber-500 [animation-delay:240ms]" />
      </span>
      <span className="font-semibold">BOSS</span> is typing…
    </div>
  )
}

function ColumnDropZone({
  tone,
  title,
  hint,
  dot,
  count,
  interactive,
  children,
}: {
  tone: Tone
  title: string
  hint: string
  dot: string
  count: number
  interactive: boolean
  children: ReactNode
}) {
  void tone
  void interactive
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 transition-colors duration-300 hover:border-foreground/15">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
            {count}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function ActivityRow({ entry }: { entry: BoardActivityEntry }) {
  if (entry.who === "SYSTEM") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider">system</span>
          <span className="ml-auto font-mono text-[10px]">{entry.time}</span>
        </div>
        <p className="mt-0.5 leading-snug">{entry.text}</p>
      </div>
    )
  }
  if (entry.who === "USER") {
    return (
      <div className="flex gap-2.5 rounded-lg px-1 py-0.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
          YOU
        </span>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold">You</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {entry.time}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">
            {entry.text}
          </p>
        </div>
      </div>
    )
  }
  const role = entry.who
  const key = AGENT_BY_ROLE[role]
  const a = AGENTS[key]
  return (
    <div className="group flex gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/40">
      <AgentBadge agent={key} size={28} />
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <AgentName agent={key} className="text-[13px] font-semibold">
            {a.name}
          </AgentName>
          <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[9px] font-semibold tracking-wider text-muted-foreground">
            {role}
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {entry.time}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">
          {entry.text}
        </p>
      </div>
    </div>
  )
}

function TypingIndicator({ who }: { who: Role }) {
  const key = AGENT_BY_ROLE[who]
  return (
    <div className="flex items-center gap-2 pl-[38px] text-[11px] text-muted-foreground">
      <span className="flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-sky-500 [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-sky-500 [animation-delay:120ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-sky-500 [animation-delay:240ms]" />
      </span>
      <AgentName agent={key} className="font-semibold">
        {who}
      </AgentName>{" "}
      is typing…
    </div>
  )
}
