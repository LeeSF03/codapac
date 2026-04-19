"use client"

import type { Route } from "next"
import Link from "next/link"
import { useMemo, useState } from "react"

import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  formatRelative,
  projectColor,
  resetProjects,
  toggleStar,
  useProjects,
  type Project,
  type ProjectStatus,
  type ProjectVisibility,
} from "@/lib/mock-projects"

import { NewProjectDialog } from "./_components/new-project-dialog"

type Filter = "all" | "starred" | ProjectVisibility | "archived"
type Sort = "updated" | "created" | "name"

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
      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:text-amber-500"
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

function ProjectCard({ project }: { project: Project }) {
  const accent = projectColor(project.color)
  const status = STATUS_LABEL[project.status]
  return (
    <Link
      href={`/mock/projects/${project.id}` as Route}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
            className={`grid size-11 place-items-center rounded-xl border border-border bg-background text-xl ring-1 ${accent.ring}`}
            aria-hidden
          >
            {project.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight">
              {project.name}
            </h3>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              codapac/{project.slug}
            </p>
          </div>
        </div>
        <StarButton
          starred={project.starred}
          onClick={(e) => {
            e.preventDefault()
            toggleStar(project.id)
          }}
        />
      </div>

      <p className="relative mt-3 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
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
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
            </svg>
          )}
          {project.visibility}
        </Badge>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${accent.chip}`}>
          {project.stats.openIssues} open
        </span>
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex -space-x-1.5">
          {project.members.slice(0, 4).map((m) => {
            const memberColor = projectColor(m.color)
            return (
              <span
                key={m.name}
                className={`grid size-6 place-items-center rounded-full border-2 border-card text-[9px] font-semibold text-white ${memberColor.dot}`}
                title={m.name}
              >
                {m.initials}
              </span>
            )
          })}
          {project.members.length > 4 ? (
            <span className="grid size-6 place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-semibold text-muted-foreground">
              +{project.members.length - 4}
            </span>
          ) : null}
        </div>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          Updated {formatRelative(project.updatedAt)}
        </span>
      </div>
    </Link>
  )
}

export default function ProjectsPage() {
  const projects = useProjects()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [sort, setSort] = useState<Sort>("updated")
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = projects.slice()
    if (filter === "starred") list = list.filter((p) => p.starred)
    else if (filter === "archived")
      list = list.filter((p) => p.status === "archived")
    else if (filter === "private" || filter === "public")
      list = list.filter((p) => p.visibility === filter)
    if (filter !== "archived")
      list = list.filter((p) => p.status !== "archived")
    if (q)
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name)
      if (sort === "created") return b.createdAt - a.createdAt
      return b.updatedAt - a.updatedAt
    })
    return list
  }, [projects, query, filter, sort])

  const counts = useMemo(() => {
    const total = projects.length
    const starred = projects.filter((p) => p.starred).length
    const privateCount = projects.filter((p) => p.visibility === "private").length
    const publicCount = projects.filter((p) => p.visibility === "public").length
    const archived = projects.filter((p) => p.status === "archived").length
    return { total, starred, private: privateCount, public: publicCount, archived }
  }, [projects])

  const countFor = (key: Filter): number => {
    if (key === "all") return counts.total
    return counts[key] ?? 0
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Your workspace
            </p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
              Projects
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Every project gets its own autonomous board. Spin up a new one and
              the squad will start picking up issues the second they land.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => resetProjects()}>
              Reset mock data
            </Button>
            <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              New project
            </Button>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Total", v: counts.total.toString(), t: "across your workspace" },
            { k: "Starred", v: counts.starred.toString(), t: "pinned to the top" },
            { k: "Private", v: counts.private.toString(), t: "internal work" },
            { k: "Public", v: counts.public.toString(), t: "shared with the world" },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
            >
              <div className="text-xs text-muted-foreground">{s.k}</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{s.v}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{s.t}</div>
            </div>
          ))}
        </section>

        <section className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                data-active={filter === f.key}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs transition-all duration-200 hover:-translate-y-px hover:text-foreground data-[active=true]:-translate-y-px data-[active=true]:border-foreground data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:shadow-md"
              >
                {f.label}
                <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[10px] text-muted-foreground group-data-[active=true]:bg-background/20 group-data-[active=true]:text-background">
                  {countFor(f.key)}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
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
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="uppercase tracking-[0.14em]">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <div className="grid size-14 place-items-center rounded-2xl border border-border bg-background text-2xl">
                📭
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {query ? "Nothing matches that." : "No projects here yet."}
              </h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {query
                  ? "Try a different search, or clear the filters to see everything."
                  : "Create your first project and the bot squad will line up to help."}
              </p>
              <div className="mt-4 flex gap-2">
                {query ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                ) : null}
                <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
                  + New project
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="group flex min-h-[230px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 px-6 text-center text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-card hover:text-foreground"
              >
                <span className="grid size-11 place-items-center rounded-xl border border-border bg-background text-xl transition-transform duration-200 group-hover:scale-105">
                  +
                </span>
                <span className="text-sm font-semibold">Start a new project</span>
                <span className="max-w-[200px] text-[11.5px] text-muted-foreground">
                  Name it, pick an emoji, and drop issues on the board.
                </span>
              </button>
            </div>
          )}
        </section>
      </main>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  )
}
