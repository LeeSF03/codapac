"use client"

import { useMemo, useState } from "react"

import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { useMutation, useQuery } from "convex/react"

import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { NewProjectDialog } from "@/app/project/_components/new-project-dialog"
import { authClient } from "@/lib/auth-client"
import {
  type ProjectColor,
  type ProjectStatus,
  type ProjectVisibility,
  formatRelative,
  projectColor,
} from "@/lib/mock-projects"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

type Filter = "all" | "starred" | ProjectVisibility | "archived"
type Sort = "updated" | "created" | "name"
type PlanningStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "blocked"

type LiveProject = {
  id: Id<"projects">
  name: string
  slug: string
  description: string
  emoji: string
  color: ProjectColor
  visibility: ProjectVisibility
  status: ProjectStatus
  repoUrl?: string
  createdAt: number
  updatedAt: number
  starred: boolean
  stats: {
    openIssues: number
    prsThisWeek: number
    cycleTime: string
  }
  planning: {
    status: PlanningStatus
    prompt?: string
    requestedAt?: number
  }
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "starred", label: "Starred" },
  { key: "private", label: "Private" },
  { key: "public", label: "Public" },
  { key: "archived", label: "Archived" },
]

const STATUS_LABEL: Record<ProjectStatus, { title: string; dot: string }> = {
  active: { title: "Active", dot: "bg-emerald-500" },
  paused: { title: "Paused", dot: "bg-amber-500" },
  archived: { title: "Archived", dot: "bg-muted-foreground" },
}

function planningLabel(status: PlanningStatus) {
  if (status === "queued") {
    return {
      title: "BOSS queued",
      className: "bg-amber-500/10 text-amber-700",
    }
  }
  if (status === "running") {
    return {
      title: "BOSS running",
      className: "bg-sky-500/10 text-sky-700",
    }
  }
  if (status === "failed" || status === "blocked") {
    return {
      title: "Needs attention",
      className: "bg-rose-500/10 text-rose-700",
    }
  }
  if (status === "completed") {
    return {
      title: "Backlog ready",
      className: "bg-emerald-500/10 text-emerald-700",
    }
  }
  return null
}

function workspaceMembers(name?: string | null) {
  return [
    {
      name: name?.trim() || "You",
      initials: "YO",
      color: "slate" as ProjectColor,
    },
    { name: "BOSS", initials: "BO", color: "amber" as ProjectColor },
    { name: "FIXER", initials: "FX", color: "sky" as ProjectColor },
    { name: "TESTEES", initials: "QA", color: "emerald" as ProjectColor },
  ]
}

function StarButton({
  starred,
  onClick,
}: {
  starred: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={starred ? "Unstar project" : "Star project"}
      aria-pressed={starred}
      className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-7 place-items-center rounded-md transition-colors aria-pressed:text-amber-500"
    >
      <svg
        viewBox="0 0 24 24"
        fill={starred ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden
      >
        <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .32-.988l5.519-.442a.563.563 0 0 0 .475-.345z" />
      </svg>
    </button>
  )
}

function ProjectCard({
  project,
  memberName,
  onToggleStar,
}: {
  project: LiveProject
  memberName?: string | null
  onToggleStar: (projectId: Id<"projects">) => void
}) {
  const accent = projectColor(project.color)
  const status = STATUS_LABEL[project.status]
  const planning = planningLabel(project.planning.status)
  const members = workspaceMembers(memberName)

  return (
    <Link
      href={`/project/${project.slug}` as Route}
      className="group border-border bg-card hover:border-foreground/20 focus-visible:ring-ring/40 relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
    >
      <span
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.tint} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        aria-hidden
      />
      <span
        className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 ${accent.dot} transition-transform duration-300 group-hover:scale-x-100`}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`border-border bg-background grid size-11 place-items-center rounded-xl border text-xl ring-1 ${accent.ring}`}
            aria-hidden
          >
            {project.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight">
              {project.name}
            </h3>
            <p className="text-muted-foreground truncate font-mono text-[11px]">
              codapac/{project.slug}
            </p>
          </div>
        </div>
        <StarButton
          starred={project.starred}
          onClick={(e) => {
            e.preventDefault()
            onToggleStar(project.id)
          }}
        />
      </div>

      <p className="text-muted-foreground relative mt-3 line-clamp-2 text-[13px] leading-snug">
        {project.description || "No description yet."}
      </p>

      <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className="gap-1.5 rounded-full px-2 py-0 text-[10px] font-medium"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.title}
        </Badge>
        <Badge
          variant="outline"
          className="gap-1.5 rounded-full px-2 py-0 text-[10px] font-medium capitalize"
        >
          {project.visibility === "private" ? (
            <svg
              viewBox="0 0 24 24"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
            </svg>
          )}
          {project.visibility}
        </Badge>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${accent.chip}`}
        >
          {project.stats.openIssues} open
        </span>
        {planning ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${planning.className}`}
          >
            {planning.title}
          </span>
        ) : null}
      </div>

      <div className="border-border relative mt-4 flex items-center justify-between border-t pt-3">
        <div className="flex -space-x-1.5">
          {members.map((member) => {
            const memberColor = projectColor(member.color)
            return (
              <span
                key={member.name}
                className={`border-card grid size-6 place-items-center rounded-full border-2 text-[9px] font-semibold text-white ${memberColor.dot}`}
                title={member.name}
              >
                {member.initials}
              </span>
            )
          })}
        </div>
        <span className="text-muted-foreground font-mono text-[10.5px]">
          Updated {formatRelative(project.updatedAt)}
        </span>
      </div>
    </Link>
  )
}

export default function ProjectIndexPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const projects = useQuery(api.projects.listForViewer, {})
  const createProject = useMutation(api.projects.createProject)
  const toggleStar = useMutation(api.projects.toggleStar)

  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [sort, setSort] = useState<Sort>("updated")
  const [dialogOpen, setDialogOpen] = useState(false)
  const convexAuthPending = projects === null

  const filtered = useMemo(() => {
    if (!projects) {
      return []
    }

    const q = query.trim().toLowerCase()
    let list = [...projects] as LiveProject[]
    if (filter === "starred") list = list.filter((p) => p.starred)
    else if (filter === "archived")
      list = list.filter((p) => p.status === "archived")
    else if (filter === "private" || filter === "public") {
      list = list.filter((p) => p.visibility === filter)
    }
    if (filter !== "archived") {
      list = list.filter((p) => p.status !== "archived")
    }
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name)
      if (sort === "created") return b.createdAt - a.createdAt
      return b.updatedAt - a.updatedAt
    })
    return list
  }, [projects, query, filter, sort])

  const counts = useMemo(() => {
    const list = (projects ?? []) as LiveProject[]
    return {
      total: list.length,
      starred: list.filter((p) => p.starred).length,
      private: list.filter((p) => p.visibility === "private").length,
      public: list.filter((p) => p.visibility === "public").length,
      archived: list.filter((p) => p.status === "archived").length,
    }
  }, [projects])

  const countFor = (key: Filter): number => {
    if (key === "all") return counts.total
    return counts[key] ?? 0
  }

  const handleCreateProject = async (input: {
    name: string
    slug?: string
    description?: string
    emoji?: string
    color?: ProjectColor
    visibility?: ProjectVisibility
    repoUrl?: string
  }) => {
    try {
      const created = await createProject({
        name: input.name,
        slug: input.slug ?? null,
        description: input.description ?? null,
        emoji: input.emoji ?? null,
        color: input.color ?? null,
        visibility: input.visibility ?? null,
        repoUrl: input.repoUrl ?? null,
      })
      router.push(`/project/${created.slug}` as Route)
      return created
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Failed to create project."
      )
      throw error
    }
  }

  const handleToggleStar = async (projectId: Id<"projects">) => {
    try {
      await toggleStar({ projectId })
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Failed to update project."
      )
    }
  }

  if (isPending || projects === undefined || convexAuthPending) {
    return (
      <div className="bg-background min-h-dvh">
        <div className="sticky top-0 z-20">
          <SiteHeader />
        </div>
        <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
          <div className="bg-muted h-6 w-28 animate-pulse rounded" />
          <div className="bg-muted mt-3 h-10 w-72 animate-pulse rounded" />
          {convexAuthPending ? (
            <p className="text-muted-foreground mt-4 text-sm">
              Session found. Waiting for Convex auth to attach to the live workspace.
            </p>
          ) : null}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="border-border bg-card h-[230px] animate-pulse rounded-2xl border"
              />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-dvh">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">
              Your workspace
            </p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
              Projects
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm">
              Every project gets its own autonomous board. Spin one up and the
              squad will start picking up issues the moment they land.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
              <svg
                viewBox="0 0 24 24"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New project
            </Button>
          </div>
        </section>

        <section className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                data-active={filter === f.key}
                className="group border-border bg-card text-muted-foreground hover:text-foreground data-[active=true]:border-foreground data-[active=true]:bg-foreground data-[active=true]:text-background inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-xs transition-all duration-200 hover:-translate-y-px data-[active=true]:-translate-y-px data-[active=true]:shadow-md"
              >
                {f.label}
                <span className="bg-muted text-muted-foreground group-data-[active=true]:bg-background/20 group-data-[active=true]:text-background rounded-full px-1.5 py-0 font-mono text-[10px]">
                  {countFor(f.key)}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                className="h-8 w-56 pl-8"
                aria-label="Search projects"
              />
            </div>
            <label className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span className="tracking-[0.14em] uppercase">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="border-input text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2 text-xs transition-colors outline-none focus-visible:ring-3"
              >
                <option value="updated">Last updated</option>
                <option value="created">Recently created</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </section>

        <section className="mt-5">
          {filtered.length === 0 ? (
            <div className="border-border bg-card/50 grid place-items-center rounded-2xl border border-dashed px-6 py-16 text-center">
              <div className="border-border bg-background grid size-14 place-items-center rounded-2xl border text-2xl">
                📭
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {query ? "Nothing matches that." : "No projects here yet."}
              </h3>
              <p className="text-muted-foreground mt-1 max-w-xs text-xs">
                {query
                  ? "Try a different search, or clear the filters to see everything."
                  : "Create your first project and drop the first issues on the board."}
              </p>
              <div className="mt-4 flex gap-2">
                {query ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery("")}
                  >
                    Clear search
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  + New project
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  memberName={session?.user?.name}
                  onToggleStar={handleToggleStar}
                />
              ))}
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="group border-border bg-card/40 text-muted-foreground hover:border-foreground/30 hover:bg-card hover:text-foreground flex min-h-[230px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 text-center transition-all duration-200 hover:-translate-y-0.5"
              >
                <span className="border-border bg-background grid size-11 place-items-center rounded-xl border text-xl transition-transform duration-200 group-hover:scale-105">
                  +
                </span>
                <span className="text-sm font-semibold">
                  Start a new project
                </span>
                <span className="text-muted-foreground max-w-[200px] text-[11.5px]">
                  Name it and launch a fresh live workspace for the squad.
                </span>
              </button>
            </div>
          )}
        </section>
      </main>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  )
}
