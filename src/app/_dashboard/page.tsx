"use client"

import type { Route } from "next"
import Link from "next/link"
import { useSyncExternalStore } from "react"

import { ProjectBoard } from "@/components/project-board"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  projectColor,
  useProjects,
  type Project,
} from "@/lib/mock-projects"

const emptySubscribe = () => () => {}

function useHasHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

function pickDefaultProject(projects: Project[]): Project | undefined {
  const active = projects.filter((p) => p.status !== "archived")
  const starred = active.find((p) => p.starred)
  if (starred) return starred
  const mostRecent = active
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  return mostRecent ?? projects[0]
}

export default function DashboardPage() {
  const projects = useProjects()
  const hasHydrated = useHasHydrated()
  const project = pickDefaultProject(projects)

  if (hasHydrated && !project) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="sticky top-0 z-20">
          <SiteHeader />
        </div>
        <main className="mx-auto grid w-full max-w-3xl place-items-center px-6 py-20 text-center">
          <div className="grid size-14 place-items-center rounded-2xl border border-border bg-card text-2xl">
            📭
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            No projects yet
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The board lives inside a project. Spin one up and the squad will
            line up cards on it.
          </p>
          <div className="mt-5">
            <Button asChild size="sm">
              <Link href={"/project" as Route}>Go to projects</Link>
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
            <span className="capitalize">autonomous board</span>
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
          <p>
            Showing your{" "}
            <span className="font-semibold text-foreground">
              {project.starred ? "starred" : "most recent"}
            </span>{" "}
            project.{" "}
            <Link
              href={"/project" as Route}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Switch project →
            </Link>
          </p>
        }
      />
    </div>
  )
}
