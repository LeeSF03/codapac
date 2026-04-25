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
  TONE_ORDER,
  useBoard,
  type BoardActivityEntry,
  type BoardCard,
  type Role,
  type Tone,
} from "@/lib/mock-board"

type ProjectChatAuthor = "USER" | "BOSS" | "PROGRAMMER" | "QA" | "SYSTEM"

type ProjectChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  author: ProjectChatAuthor
  content: string
  time: string
  createdAt?: number
}

export type ProjectBoardActiveRun = {
  id: string
  cardKey: string
  title: string
  agent: Role
  stage: "programmer" | "qa"
  notes?: string | null
  updatedAt: number
}

type ProjectBoardData = {
  cards: BoardCard[]
  activity: BoardActivityEntry[]
  typing: Role | null
  activeRuns?: ProjectBoardActiveRun[]
}

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
      {card.latestFailure?.error ? (
        <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2 text-[11px] leading-snug text-destructive">
          <div className="font-mono text-[9px] uppercase tracking-wider text-destructive/80">
            {card.latestFailure.stage === "qa" ? "QA failure" : "Build failure"}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-destructive/90">
            {card.latestFailure.error}
          </p>
        </div>
      ) : null}
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
  boardState?: ProjectBoardData
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
  chatMessages?: ProjectChatMessage[]
  chatBusy?: boolean
  chatPlaceholder?: string
  chatQuickPrompts?: string[]
  onSendChat?: (message: string) => Promise<void> | void
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
})

function formatLocalTime(timestamp?: number, fallback = "—") {
  if (typeof timestamp !== "number" || Number.isNaN(timestamp)) {
    return fallback
  }

  return timeFormatter.format(new Date(timestamp))
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
  const board: ProjectBoardData = boardState ?? localBoard
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
  const [forwarded, setForwarded] = useState(false)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const forwardTimer = useRef<number | null>(null)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
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

  useEffect(() => {
    if (!chatMode || !chatScrollRef.current) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const node = chatScrollRef.current
      if (!node) return
      node.scrollTo({
        top: node.scrollHeight,
        behavior: "smooth",
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [chatMode, chatMessages, chatBusy])

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
  const activeRuns = useMemo(() => {
    if (board.activeRuns && board.activeRuns.length > 0) {
      return board.activeRuns
        .slice()
        .sort((left, right) => right.updatedAt - left.updatedAt)
    }

    return cards
      .filter((card) => card.tone === "progress")
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map((card) => ({
        id: `progress-${card.id}`,
        cardKey: card.id,
        title: card.title,
        agent: card.agent,
        stage: "programmer" as const,
        notes: "Implementation in progress.",
        updatedAt: card.updatedAt,
      }))
  }, [board.activeRuns, cards])
  const latestActivityLabel = formatLocalTime(
    activity.length > 0 ? activity[activity.length - 1]?.createdAt : undefined,
    activity.length > 0 ? activity[activity.length - 1]?.time : "—",
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

          {activeRuns.length > 0 ? (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
                <span className="text-sm font-semibold">Live now</span>
                <span className="text-xs text-muted-foreground">
                  {activeRuns.length} active task{activeRuns.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {activeRuns.map((run) => {
                  const agentKey = AGENT_BY_ROLE[run.agent]
                  const agentName = AGENTS[agentKey].name
                  const statusLabel =
                    run.stage === "qa"
                      ? "Running checks"
                      : "Writing code"
                  return (
                    <div
                      key={run.id}
                      className="rounded-xl border border-border bg-background/85 px-3 py-3 shadow-xs"
                    >
                      <div className="flex items-start gap-2">
                        <AgentBadge agent={agentKey} size={24} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {run.cardKey}
                            </span>
                            <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[9px] font-semibold tracking-wider text-muted-foreground">
                              {agentName}
                            </span>
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              {formatLocalTime(run.updatedAt)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[13px] text-foreground/85">
                            {run.title}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {run.notes?.trim() || statusLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const list = cards.filter((c) => c.tone === col.key)
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
                      href={issueHrefForCard ? issueHrefForCard(c) : `/issues/${c.issueNumber}`}
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
                v: latestActivityLabel,
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
        <aside className="flex h-[min(640px,calc(100dvh-2rem))] min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs lg:sticky lg:top-[72px] lg:h-[calc(100dvh-128px)]">
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

          <div
            ref={chatScrollRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm"
          >
            {chatMode ? (
              <>
                {chatMessages && chatMessages.length > 0 ? (
                  <>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground/80">
                      <div className="mb-1 font-semibold text-emerald-700">
                        Squad online
                      </div>
                      {activeRuns.length > 0
                        ? `${activeRuns[0]?.cardKey} is currently in motion. Messages are saved here.`
                        : "Chat with the agents directly. Messages are saved here."}
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
                    wire. Latest at {latestActivityLabel}.
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
            <div className="flex items-end gap-2 rounded-lg border border-input bg-card p-2 transition-shadow focus-within:ring-2 focus-within:ring-ring/30">
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
            {!chatMode ? (
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <>
                  <div className="flex gap-3">
                    <button type="button" className="transition-colors hover:text-foreground">＠ mention</button>
                    <button type="button" className="transition-colors hover:text-foreground">🔗 link</button>
                    <button type="button" className="transition-colors hover:text-foreground">⌘K commands</button>
                  </div>
                  {forwarded ? (
                    <Link
                      href={"/chat" as Route}
                      className="inline-flex items-center gap-1 font-medium text-emerald-600 transition-colors hover:text-emerald-700"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Sent to Squad chat →
                    </Link>
                  ) : (
                    <span>⌘↵ to send · shared with Squad chat</span>
                  )}
                </>
              </div>
            ) : null}
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
  message: ProjectChatMessage
}) {
  if (message.role === "system" || message.author === "SYSTEM") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider">
            system
          </span>
          <span className="ml-auto font-mono text-[10px]">
            {formatLocalTime(message.createdAt, message.time)}
          </span>
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
              {formatLocalTime(message.createdAt, message.time)}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  const agent =
    message.author === "PROGRAMMER"
      ? "enzo"
      : message.author === "QA"
        ? "quinn"
        : "priya"
  const label =
    message.author === "PROGRAMMER"
      ? "FIXER"
      : message.author === "QA"
        ? "TESTEES"
        : "BOSS"
  const role =
    message.author === "PROGRAMMER"
      ? "ENG"
      : message.author === "QA"
        ? "QA"
        : "PM"

  return (
    <div className="group flex gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/40">
      <AgentBadge agent={agent} size={28} />
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold">{label}</span>
          <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[9px] font-semibold tracking-wider text-muted-foreground">
            {role}
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {formatLocalTime(message.createdAt, message.time)}
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
      <span className="font-semibold">Agent</span> is typing…
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
          <span className="ml-auto font-mono text-[10px]">
            {formatLocalTime(entry.createdAt, entry.time)}
          </span>
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
              {formatLocalTime(entry.createdAt, entry.time)}
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
            {formatLocalTime(entry.createdAt, entry.time)}
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
