"use client"

import { useEffect, useRef, useState } from "react"

import type { Route } from "next"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { useMutation, useQuery } from "convex/react"

import { ProjectBoard } from "@/components/project-board"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { projectColor } from "@/lib/mock-projects"
import { api } from "~/convex/_generated/api"

function planningMessage(status: string) {
  if (status === "queued") {
    return "BOSS is getting the first set of tasks ready."
  }
  if (status === "running") {
    return "BOSS is planning the first tasks now. They will appear here automatically."
  }
  if (status === "failed" || status === "blocked") {
    return "BOSS needs attention before tasks can be created."
  }
  if (status === "completed") {
    return "BOSS has already created the first task list for this project."
  }
  return null
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug
  const launchRef = useRef<string | null>(null)

  const projects = useQuery(api.projects.listForViewer, {})
  const project = useQuery(
    api.projects.getBySlug,
    slug ? { slug } : "skip",
  )
  const chatMessages = useQuery(
    api.projectChat.listMessages,
    project ? { projectId: project.id } : "skip",
  )
  const board = useQuery(
    api.projects.getBoard,
    project ? { projectId: project.id } : "skip",
  )

  const toggleStar = useMutation(api.projects.toggleStar)
  const deleteProject = useMutation(api.projects.deleteProject)
  const createIssue = useMutation(api.projects.createIssue)
  const advanceCard = useMutation(api.projects.advanceCard)
  const regressCard = useMutation(api.projects.regressCard)
  const removeCard = useMutation(api.projects.deleteCard)
  const queueBossPlanning = useMutation(api.projects.queueBossPlanning)
  const convexAuthPending = projects === null
  const [chatBusy, setChatBusy] = useState(false)
  const [streamingReply, setStreamingReply] = useState<string | null>(null)

  useEffect(() => {
    if (!project || project.planning.status !== "queued") {
      return
    }

    const signature = `${project.id}:${project.planning.requestedAt ?? 0}`
    if (launchRef.current === signature) {
      return
    }
    launchRef.current = signature

    void fetch("/api/boss/launch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectId: project.id }),
    })
  }, [project])

  if (
    projects === undefined ||
    project === undefined ||
    chatMessages === undefined ||
    board === undefined ||
    convexAuthPending
  ) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="sticky top-0 z-20">
          <SiteHeader />
        </div>
        <main className="mx-auto w-full max-w-[1500px] px-6 py-6">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-10 w-72 animate-pulse rounded bg-muted" />
          {convexAuthPending ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Session found. Waiting for Convex auth to attach to the live workspace.
            </p>
          ) : null}
        </main>
      </div>
    )
  }

  if (project === null) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="sticky top-0 z-20">
          <SiteHeader />
        </div>
        <main className="mx-auto grid w-full max-w-3xl place-items-center px-6 py-20 text-center">
          <div className="grid size-14 place-items-center rounded-2xl border border-border bg-card text-2xl">
            🧐
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Project not found
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This project does not exist in your live workspace, or the slug is stale.
          </p>
          <div className="mt-5">
            <Button asChild size="sm">
              <Link href={"/project" as Route}>Back to projects</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const accent = projectColor(project.color)
  const planning = planningMessage(project.planning.status)
  const visibleChatMessages =
    streamingReply !== null
      ? [
          ...chatMessages,
          {
            id: "__streaming-boss",
            role: "assistant" as const,
            author: "BOSS" as const,
            content: streamingReply,
            time: "now",
          },
        ]
      : chatMessages

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <ProjectBoard
        boardState={board}
        interactive
        issueHrefForCard={() => null}
        emptyTodoMessage={
          planning ??
          "No tasks yet. Ask BOSS what should happen next."
        }
        onCreateIssue={async (input) => {
          await createIssue({
            projectId: project.id,
            title: input.title,
            agent: input.agent,
            tags: input.tags,
          })
        }}
        onAdvanceCard={async (cardKey) => {
          try {
            const card = board.cards.find((item) => item.id === cardKey)
            if (card?.tone === "todo") {
              const response = await fetch("/api/programmer/launch", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  projectId: project.id,
                  cardKey,
                }),
              })

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as
                  | { error?: string }
                  | null
                throw new Error(payload?.error || "Failed to start Programmer.")
              }
              return
            }

            if (card?.tone === "done") {
              const response = await fetch("/api/qa/launch", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  projectId: project.id,
                  cardKey,
                }),
              })

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as
                  | { error?: string }
                  | null
                throw new Error(payload?.error || "Failed to start QA.")
              }
              return
            }

            await advanceCard({ projectId: project.id, cardKey })
          } catch (error) {
            window.alert(
              error instanceof Error ? error.message : "Failed to move the task.",
            )
          }
        }}
        onRegressCard={async (cardKey) => {
          await regressCard({ projectId: project.id, cardKey })
        }}
        onDeleteCard={async (cardKey) => {
          await removeCard({ projectId: project.id, cardKey })
        }}
        chatMessages={visibleChatMessages}
        chatBusy={chatBusy}
        chatPlaceholder="Ask BOSS to clarify the goal, prioritise work, or suggest the next move."
        chatQuickPrompts={[
          "Summarize this project and tell me the best first milestone.",
          "Given the current board, what should BOSS prioritize next?",
          "What details are still unclear from this project brief?",
        ]}
        onSendChat={async (message) => {
          setChatBusy(true)
          setStreamingReply(null)
          let completedStream = false
          try {
            const response = await fetch("/api/project/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                projectId: project.id,
                message,
              }),
            })

            if (!response.ok) {
              const payload = (await response.json().catch(() => null)) as
                | { error?: string }
                | null
              throw new Error(payload?.error || "Failed to send project chat message.")
            }

            if (!response.body) {
              throw new Error("Project chat response did not include a stream.")
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let streamedText = ""

            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              streamedText += decoder.decode(value, { stream: true })
              setStreamingReply(streamedText)
            }

            streamedText += decoder.decode()
            setStreamingReply(streamedText)
            completedStream = true
          } catch (error) {
            setStreamingReply(null)
            window.alert(
              error instanceof Error
                ? error.message
                : "Failed to send project chat message.",
            )
          } finally {
            setChatBusy(false)
            if (completedStream) {
              window.setTimeout(() => setStreamingReply(null), 250)
            }
          }
        }}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
            <span className="font-mono tracking-normal normal-case text-muted-foreground">
              codapac/{project.slug}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="capitalize">{project.status}</span>
          </span>
        }
        title={
          <span className="inline-flex items-center gap-2.5">
            <span className="text-2xl leading-none" aria-hidden>
              {project.emoji}
            </span>
            {project.name}
          </span>
        }
        description={
          <div className="space-y-1">
            {project.latestPreviewDeploymentUrl ? (
              <p className="text-xs text-muted-foreground">
                <span>deployed at </span>
                <a
                  href={project.latestPreviewDeploymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-emerald-700 underline-offset-4 transition-colors hover:text-emerald-800 hover:underline"
                >
                  {project.latestPreviewDeploymentUrl.replace(/^https?:\/\//, "")}
                </a>
              </p>
            ) : null}
            {project.description ? (
              <p>{project.description}</p>
            ) : (
              <p className="italic text-muted-foreground">
                No description yet — kick off the first issue and the squad will
                take it from here.
              </p>
            )}
            {planning ? (
              <p className="text-xs text-amber-700">{planning}</p>
            ) : null}
          </div>
        }
        headerSlot={
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <Link
                href={"/project" as Route}
                className="transition-colors hover:text-foreground"
              >
                Projects
              </Link>
              <span aria-hidden>/</span>
              <span className="font-mono text-foreground/80">
                codapac/{project.slug}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {project.planning.prompt &&
              project.planning.status !== "queued" &&
              project.planning.status !== "running" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    queueBossPlanning({
                      projectId: project.id,
                      prompt: project.planning.prompt ?? "",
                    })
                  }
                >
                  Run BOSS
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => toggleStar({ projectId: project.id })}
                aria-pressed={project.starred}
                className="aria-pressed:text-amber-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={project.starred ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3"
                  aria-hidden
                >
                  <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .32-.988l5.519-.442a.563.563 0 0 0 .475-.345z" />
                </svg>
                {project.starred ? "Starred" : "Star"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={async () => {
                  const ok = window.confirm(
                    `Delete "${project.name}" from your live workspace?`,
                  )
                  if (!ok) return
                  await deleteProject({ projectId: project.id })
                  router.push("/project" as Route)
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                Delete
              </Button>
            </div>
          </nav>
        }
      />
    </div>
  )
}
