"use client"

import { useEffect, useMemo, useState } from "react"

import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { useQuery } from "convex/react"
import { useTheme } from "next-themes"

import { AgentBadge } from "@/components/agent-badge"
import { AGENTS, AgentKey, AgentName } from "@/components/agent-orb"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { authClient } from "@/lib/auth-client"
import { projectColor } from "@/lib/mock-projects"

import { api } from "~/convex/_generated/api"

type ProfileProject = {
  id: string
  name: string
  slug: string
  emoji: string
  color: string
  status: string
  visibility: string
  starred: boolean
  updatedAt: number
  stats: { openIssues: number; prsThisWeek: number }
}

const AGENT_KEYS: AgentKey[] = ["priya", "enzo", "quinn"]

function formatMemberSince(value: number | undefined) {
  if (!value) return "Today"
  const d = new Date(value)
  return d.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  })
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const week = Math.floor(day / 7)
  if (week < 5) return `${week}w ago`
  const month = Math.floor(day / 30)
  return `${month}mo ago`
}

export default function ProfilePage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [signingOut, setSigningOut] = useState(false)
  const [copied, setCopied] = useState(false)

  const projectsRaw = useQuery(api.projects.listForViewer, {}) as
    | ProfileProject[]
    | null
    | undefined
  const projects = projectsRaw ?? []
  const projectsLoading = projectsRaw === undefined || projectsRaw === null

  const user = session?.user as
    | {
        email?: string | null
        name?: string | null
        image?: string | null
        createdAt?: number | string | null
      }
    | undefined
  const email = user?.email ?? ""
  const displayName =
    user?.name?.trim() || (email ? email.split("@")[0] : "") || "you"
  const username = email ? email.split("@")[0] : "you"
  const initials =
    displayName
      .split(/[ ._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  const memberSinceTs =
    typeof user?.createdAt === "number"
      ? user.createdAt
      : typeof user?.createdAt === "string"
        ? Date.parse(user.createdAt)
        : undefined

  const stats = useMemo(() => {
    const total = projects.length
    const active = projects.filter((p) => p.status !== "archived").length
    const starred = projects.filter((p) => p.starred).length
    const openIssues = projects.reduce(
      (sum, p) => sum + (p.stats?.openIssues ?? 0),
      0,
    )
    const prsThisWeek = projects.reduce(
      (sum, p) => sum + (p.stats?.prsThisWeek ?? 0),
      0,
    )
    return { total, active, starred, openIssues, prsThisWeek }
  }, [projects])

  const recentProjects = useMemo(() => {
    return projects
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 4)
  }, [projects])

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/")
            router.refresh()
          },
        },
      })
    } finally {
      setSigningOut(false)
    }
  }

  const handleCopyUsername = async () => {
    try {
      await navigator.clipboard.writeText(`@${username}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // noop
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* Ambient backdrop — subtle in light, richer in dark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.06),transparent_55%),radial-gradient(circle_at_12%_80%,rgba(14,165,233,0.05),transparent_55%)] dark:hidden" />
        <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.18),transparent_55%),radial-gradient(circle_at_12%_80%,rgba(14,165,233,0.15),transparent_55%),radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.08),transparent_65%)] dark:block" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_85%)]">
          <div className="h-full w-full text-foreground opacity-[0.05] [background-image:radial-gradient(circle,_currentColor_1px,_transparent_1.5px)] [background-size:28px_28px] dark:opacity-[0.1]" />
        </div>
      </div>

      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-6">
        {/* ─────────────── Hero ─────────────── */}
        <section className="relative mt-4 overflow-hidden rounded-3xl border border-border bg-card">
          {/* Animated gradient banner */}
          <div className="relative h-48 w-full overflow-hidden sm:h-56">
            {/* Light-mode glow — warmer */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(245,158,11,0.35),transparent_55%),radial-gradient(circle_at_78%_30%,rgba(14,165,233,0.38),transparent_55%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.3),transparent_60%)] dark:hidden" />
            {/* Dark-mode glow — richer, saturated */}
            <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_18%_20%,rgba(245,158,11,0.45),transparent_55%),radial-gradient(circle_at_78%_30%,rgba(14,165,233,0.5),transparent_55%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.4),transparent_60%)] dark:block" />
            {/* Bottom fade into the card — white in light, near-black card in dark */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.6))] dark:bg-[linear-gradient(to_bottom,transparent_40%,var(--color-card))]" />
            <svg
              aria-hidden
              className="absolute inset-0 h-full w-full text-foreground/[0.04]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="grid-profile"
                  width="28"
                  height="28"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 28 0 L 0 0 0 28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-profile)" />
            </svg>
            <div
              aria-hidden
              className="absolute left-8 top-6 hidden gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/70 sm:flex"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 shadow-xs ring-1 ring-border backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
                Live
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 shadow-xs ring-1 ring-border backdrop-blur">
                Codapac Workspace
              </span>
            </div>

            {/* Floating orbs for flair */}
            <div className="pointer-events-none absolute right-6 top-6 hidden items-center gap-3 sm:flex">
              {AGENT_KEYS.map((k, i) => (
                <div
                  key={k}
                  style={{ animationDelay: `${i * 180}ms` }}
                  className="[animation:cp-float_3.2s_ease-in-out_infinite]"
                >
                  <AgentBadge agent={k} size={40} />
                </div>
              ))}
            </div>
          </div>

          {/* Identity block */}
          <div className="relative -mt-14 flex flex-col gap-6 px-6 pb-6 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pb-8">
            <div className="flex items-end gap-5">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400 via-sky-400 to-emerald-400 opacity-80 blur-[2px]" />
                <Avatar className="relative size-28 rounded-full border-4 border-card bg-background shadow-xl ring-1 ring-border sm:size-32">
                  {user?.image ? (
                    <AvatarImage src={user.image} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-muted to-background text-3xl font-semibold tracking-tight text-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-2 right-2 grid size-5 place-items-center rounded-full border-2 border-card bg-emerald-500 shadow-sm">
                  <span className="size-2 rounded-full bg-white [animation:cp-breath_2s_ease-in-out_infinite]" />
                </span>
              </div>

              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-3xl font-semibold tracking-tight sm:text-[32px]">
                    {displayName}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
                    Active now
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  className="group mt-1 inline-flex items-center gap-1.5 text-[13px] font-mono text-muted-foreground transition-colors hover:text-foreground"
                  title="Copy username"
                >
                  <span>@{username}</span>
                  <span className="text-[10.5px] opacity-0 transition-opacity group-hover:opacity-100">
                    {copied ? "copied!" : "copy"}
                  </span>
                </button>
                {email ? (
                  <p className="mt-1 truncate text-[13.5px] text-muted-foreground">
                    {email}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Link href={"/project" as Route}>
                  <svg
                    viewBox="0 0 24 24"
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  Your workspace
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? (
                  "Signing out…"
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <path d="M10 17l5-5-5-5" />
                      <path d="M15 12H3" />
                    </svg>
                    Sign out
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* ─────────────── Stats ─────────────── */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Projects"
            value={projectsLoading ? null : stats.total.toString()}
            hint={`${stats.active} active · ${stats.starred} starred`}
            tone="amber"
          />
          <StatCard
            label="Open issues"
            value={projectsLoading ? null : stats.openIssues.toString()}
            hint="across your boards"
            tone="sky"
          />
          <StatCard
            label="PRs this week"
            value={projectsLoading ? null : stats.prsThisWeek.toString()}
            hint="raised by FIXER"
            tone="emerald"
          />
          <StatCard
            label="Squad"
            value="3"
            hint="bots working for you"
            tone="slate"
          />
        </section>

        {/* ─────────────── Body ─────────────── */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main column */}
          <div className="flex flex-col gap-6">
            {/* Account info */}
            <Card className="rounded-2xl border-border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Account
                  </h2>
                  <p className="text-[12.5px] text-muted-foreground">
                    The basics we know about you. Editing lands soon.
                  </p>
                </div>
                <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:inline">
                  Read-only
                </span>
              </div>

              <Separator className="my-5" />

              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <InfoRow label="Display name" value={displayName} />
                <InfoRow label="Email" value={email || "—"} />
                <InfoRow label="Username" value={`@${username}`} mono />
                <InfoRow
                  label="Member since"
                  value={formatMemberSince(memberSinceTs)}
                />
              </dl>
            </Card>

            {/* Recent projects */}
            <Card className="rounded-2xl border-border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Recent projects
                  </h2>
                  <p className="text-[12.5px] text-muted-foreground">
                    The boards the squad touched most recently.
                  </p>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-[12.5px]"
                >
                  <Link href={"/project" as Route}>
                    View all
                    <svg
                      viewBox="0 0 24 24"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </Link>
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                {projectsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[58px] animate-pulse rounded-xl bg-muted/60"
                    />
                  ))
                ) : recentProjects.length === 0 ? (
                  <div className="grid place-items-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
                    <div className="grid size-11 place-items-center rounded-xl border border-border bg-background text-xl">
                      📭
                    </div>
                    <h3 className="mt-3 text-sm font-semibold">
                      No projects yet
                    </h3>
                    <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
                      Create your first project and the squad will line up
                      cards for you.
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href={"/project" as Route}>+ New project</Link>
                    </Button>
                  </div>
                ) : (
                  recentProjects.map((p) => (
                    <ProjectRow key={p.id} project={p} />
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            {/* Your squad */}
            <Card className="overflow-hidden rounded-2xl border-border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">
                  Your squad
                </h2>
                <Link
                  href={"/agents" as Route}
                  className="text-[12px] font-medium text-primary underline-offset-4 hover:underline"
                >
                  Meet them →
                </Link>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                Three tiny bots that work on every project.
              </p>

              <div className="mt-4 space-y-2">
                {AGENT_KEYS.map((k) => {
                  const a = AGENTS[k]
                  return (
                    <div
                      key={k}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-background/50 p-2.5 transition-all hover:-translate-y-px hover:border-foreground/20 hover:shadow-sm"
                    >
                      <AgentBadge agent={k} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <AgentName
                            agent={k}
                            className="text-[13.5px] font-semibold"
                          >
                            {a.name}
                          </AgentName>
                          <span className="rounded-full bg-muted px-1.5 py-0 font-mono text-[9.5px] font-semibold tracking-wider text-muted-foreground">
                            {a.role}
                          </span>
                        </div>
                        <p className="truncate text-[11.5px] text-muted-foreground">
                          {a.title}
                        </p>
                      </div>
                      <span className="size-2 rounded-full bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Preferences */}
            <Card className="rounded-2xl border-border bg-card p-6 shadow-xs">
              <h2 className="text-lg font-semibold tracking-tight">
                Preferences
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                Tune how codapac shows up for you.
              </p>

              <div className="mt-4 space-y-2">
                <ThemePreference />
              </div>
            </Card>

            {/* Danger zone / sign out */}
            <Card className="rounded-2xl border-rose-200/70 bg-rose-50/40 p-6 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/20">
              <h2 className="text-sm font-semibold tracking-tight text-rose-700">
                Session
              </h2>
              <p className="mt-0.5 text-[12.5px] text-rose-700/70">
                Sign out of codapac on this device. Your squad keeps running in
                the background.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 w-full gap-1.5 border-rose-300 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/50 dark:bg-transparent"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </Button>
            </Card>
          </aside>
        </section>
      </main>
    </div>
  )
}

/* ─────────────── Reusable bits ─────────────── */

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string | null
  hint: string
  tone: "amber" | "sky" | "emerald" | "slate"
}) {
  const tones: Record<typeof tone, string> = {
    amber:
      "from-amber-400/25 via-amber-200/10 to-transparent ring-amber-400/40",
    sky: "from-sky-400/25 via-sky-200/10 to-transparent ring-sky-400/40",
    emerald:
      "from-emerald-400/25 via-emerald-200/10 to-transparent ring-emerald-400/40",
    slate:
      "from-slate-400/25 via-slate-200/10 to-transparent ring-slate-400/40",
  }
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-90 ${tones[tone]}`}
        aria-hidden
      />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">
          {value ?? <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" />}
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`truncate rounded-lg border border-border bg-muted/30 px-3 py-2 text-[13.5px] ${
          mono ? "font-mono text-[13px]" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function ProjectRow({ project }: { project: ProfileProject }) {
  const accent = projectColor(
    (project.color as Parameters<typeof projectColor>[0]) ?? "slate",
  )
  return (
    <Link
      href={`/project/${project.slug}` as Route}
      className="group flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3 transition-all hover:-translate-y-px hover:border-foreground/20 hover:shadow-sm"
    >
      <div
        className={`grid size-10 place-items-center rounded-lg border border-border bg-card text-lg ring-1 ${accent.ring}`}
        aria-hidden
      >
        {project.emoji || "📦"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-semibold tracking-tight">
            {project.name}
          </span>
          {project.starred ? (
            <svg
              viewBox="0 0 24 24"
              className="size-3 text-amber-500"
              fill="currentColor"
              aria-hidden
            >
              <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .32-.988l5.519-.442a.563.563 0 0 0 .475-.345z" />
            </svg>
          ) : null}
        </div>
        <p className="truncate font-mono text-[10.5px] text-muted-foreground">
          codapac/{project.slug} · Updated {formatRelative(project.updatedAt)}
        </p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${accent.chip}`}
      >
        {project.stats?.openIssues ?? 0} open
      </span>
      <svg
        viewBox="0 0 24 24"
        className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  )
}

function ThemePreference() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const current = (mounted ? theme : undefined) ?? "system"
  const effective = mounted ? resolvedTheme : undefined

  const hint =
    current === "system"
      ? `Following system — currently ${effective === "dark" ? "dark" : "light"}.`
      : current === "dark"
        ? "Night mode on."
        : "Day mode on."

  const options: {
    key: "light" | "dark" | "system"
    label: string
  }[] = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "system", label: "Auto" },
  ]

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5">
      <span className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
        {effective === "dark" ? (
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold tracking-tight">Theme</div>
        <p className="truncate text-[11.5px] text-muted-foreground">{hint}</p>
      </div>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="flex rounded-full bg-muted/60 p-0.5"
      >
        {options.map((opt) => {
          const active = current === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                active
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

