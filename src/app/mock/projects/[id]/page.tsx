"use client"

import type { Route } from "next"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSyncExternalStore } from "react"

import { ProjectBoard } from "@/components/project-board"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  deleteProject,
  projectColor,
  toggleStar,
  useProject,
  useProjects,
} from "@/lib/mock-projects"

const emptySubscribe = () => () => {}

function useHasHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const projects = useProjects()
  const project = useProject(id ?? "")
  const hasHydrated = useHasHydrated()

  if (hasHydrated && projects.length > 0 && !project) {
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
            It might have been archived, or the link is a bit stale.
          </p>
          <div className="mt-5">
            <Button asChild size="sm">
              <Link href={"/mock/projects" as Route}>Back to projects</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="sticky top-0 z-20">
          <SiteHeader />
        </div>
        <main className="mx-auto w-full max-w-[1500px] px-6 py-6">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-10 w-72 animate-pulse rounded bg-muted" />
        </main>
      </div>
    )
  }

  const accent = projectColor(project.color)

  const handleDelete = () => {
    const ok = window.confirm(
      `Delete "${project.name}"? This only removes the mock entry from your browser.`,
    )
    if (!ok) return
    deleteProject(project.id)
    router.push("/mock/projects" as Route)
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <ProjectBoard
        projectId={project.id}
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
          project.description ? (
            <p>{project.description}</p>
          ) : (
            <p className="italic text-muted-foreground">
              No description yet — kick off the first issue and the squad will
              take it from here.
            </p>
          )
        }
        headerSlot={
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <Link
                href={"/mock/projects" as Route}
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
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => toggleStar(project.id)}
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
                onClick={handleDelete}
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
