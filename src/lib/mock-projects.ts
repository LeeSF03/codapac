"use client"

import { useCallback, useSyncExternalStore } from "react"

export type ProjectVisibility = "private" | "public"
export type ProjectStatus = "active" | "paused" | "archived"
export type ProjectColor =
  | "amber"
  | "sky"
  | "emerald"
  | "violet"
  | "rose"
  | "slate"

export type ProjectMember = {
  name: string
  initials: string
  color: ProjectColor
}

export type Project = {
  id: string
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
  members: ProjectMember[]
  stats: {
    openIssues: number
    prsThisWeek: number
    cycleTime: string
  }
}

export type NewProjectInput = {
  name: string
  slug?: string
  description?: string
  emoji?: string
  color?: ProjectColor
  visibility?: ProjectVisibility
  repoUrl?: string
}

export const PROJECT_COLORS: {
  key: ProjectColor
  label: string
  dot: string
  chip: string
  ring: string
  tint: string
}[] = [
  {
    key: "amber",
    label: "Amber",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700",
    ring: "ring-amber-500/30",
    tint: "from-amber-500/20 via-amber-500/5 to-transparent",
  },
  {
    key: "sky",
    label: "Sky",
    dot: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-700",
    ring: "ring-sky-500/30",
    tint: "from-sky-500/20 via-sky-500/5 to-transparent",
  },
  {
    key: "emerald",
    label: "Emerald",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700",
    ring: "ring-emerald-500/30",
    tint: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  },
  {
    key: "violet",
    label: "Violet",
    dot: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-700",
    ring: "ring-violet-500/30",
    tint: "from-violet-500/20 via-violet-500/5 to-transparent",
  },
  {
    key: "rose",
    label: "Rose",
    dot: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-700",
    ring: "ring-rose-500/30",
    tint: "from-rose-500/20 via-rose-500/5 to-transparent",
  },
  {
    key: "slate",
    label: "Slate",
    dot: "bg-slate-500",
    chip: "bg-slate-500/10 text-slate-700",
    ring: "ring-slate-500/30",
    tint: "from-slate-500/20 via-slate-500/5 to-transparent",
  },
]

export const PROJECT_EMOJIS = [
  "🚀",
  "🛰️",
  "📦",
  "🧪",
  "🛠️",
  "🧭",
  "🔭",
  "🪄",
  "🎛️",
  "🗂️",
  "🧱",
  "🧩",
]

export function projectColor(key: ProjectColor) {
  return PROJECT_COLORS.find((c) => c.key === key) ?? PROJECT_COLORS[0]
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s/._-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
}

const STORAGE_KEY = "cp_projects_v1"
const UPDATE_EVENT = "cp-projects-update"

const SEED_PROJECTS: Project[] = [
  {
    id: "acme-web",
    name: "acme/web",
    slug: "acme/web",
    description:
      "Marketing site + dashboard for Acme. Next.js, Tailwind, Convex.",
    emoji: "🚀",
    color: "amber",
    visibility: "private",
    status: "active",
    repoUrl: "https://github.com/acme/web",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    updatedAt: Date.now() - 1000 * 60 * 32,
    starred: true,
    members: [
      { name: "You", initials: "YO", color: "slate" },
      { name: "Priya", initials: "PR", color: "amber" },
      { name: "Enzo", initials: "EN", color: "sky" },
      { name: "Quinn", initials: "QU", color: "emerald" },
    ],
    stats: { openIssues: 12, prsThisWeek: 4, cycleTime: "54m" },
  },
  {
    id: "acme-api",
    name: "acme/api",
    slug: "acme/api",
    description: "Public GraphQL gateway. Rate limiting, auth, tracing.",
    emoji: "🛰️",
    color: "sky",
    visibility: "private",
    status: "active",
    repoUrl: "https://github.com/acme/api",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
    updatedAt: Date.now() - 1000 * 60 * 60 * 3,
    starred: false,
    members: [
      { name: "You", initials: "YO", color: "slate" },
      { name: "Enzo", initials: "EN", color: "sky" },
      { name: "Quinn", initials: "QU", color: "emerald" },
    ],
    stats: { openIssues: 7, prsThisWeek: 2, cycleTime: "1h 12m" },
  },
  {
    id: "labs-playground",
    name: "labs/playground",
    slug: "labs/playground",
    description: "Little experiments and one-off demos. Nothing is sacred.",
    emoji: "🧪",
    color: "violet",
    visibility: "public",
    status: "paused",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 92,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    starred: false,
    members: [{ name: "You", initials: "YO", color: "slate" }],
    stats: { openIssues: 0, prsThisWeek: 0, cycleTime: "—" },
  },
]

function isServer(): boolean {
  return typeof window === "undefined"
}

function readStore(): Project[] {
  if (isServer()) return SEED_PROJECTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROJECTS))
      return SEED_PROJECTS
    }
    const parsed = JSON.parse(raw) as Project[]
    if (!Array.isArray(parsed)) return SEED_PROJECTS
    return parsed
  } catch {
    return SEED_PROJECTS
  }
}

let cached: Project[] | null = null

function writeStore(next: Project[]): void {
  if (isServer()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    cached = next
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
  } catch {
    // ignore quota / disabled storage
  }
}

function subscribe(cb: () => void): () => void {
  if (isServer()) return () => {}
  const onLocal = () => {
    cached = null
    cb()
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cached = null
      cb()
    }
  }
  window.addEventListener(UPDATE_EVENT, onLocal)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(UPDATE_EVENT, onLocal)
    window.removeEventListener("storage", onStorage)
  }
}

function getSnapshot(): Project[] {
  if (isServer()) return SEED_PROJECTS
  if (cached) return cached
  cached = readStore()
  return cached
}

function randomId(): string {
  return `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createProject(input: NewProjectInput): Project {
  const name = input.name.trim()
  if (!name) throw new Error("Project name is required")
  const slug = (input.slug?.trim() || slugify(name)) || slugify(name)
  const now = Date.now()
  const project: Project = {
    id: randomId(),
    name,
    slug,
    description: input.description?.trim() ?? "",
    emoji: input.emoji || "📦",
    color: input.color || "slate",
    visibility: input.visibility || "private",
    status: "active",
    repoUrl: input.repoUrl?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    starred: false,
    members: [{ name: "You", initials: "YO", color: "slate" }],
    stats: { openIssues: 0, prsThisWeek: 0, cycleTime: "—" },
  }
  const next = [project, ...readStore()]
  writeStore(next)
  return project
}

export function toggleStar(id: string): void {
  const next = readStore().map((p) =>
    p.id === id ? { ...p, starred: !p.starred, updatedAt: Date.now() } : p,
  )
  writeStore(next)
}

export function deleteProject(id: string): void {
  const next = readStore().filter((p) => p.id !== id)
  writeStore(next)
}

export function resetProjects(): void {
  writeStore(SEED_PROJECTS)
}

export function useProjects(): Project[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => SEED_PROJECTS)
}

export function useProject(id: string): Project | undefined {
  const projects = useProjects()
  return projects.find((p) => p.id === id || p.slug === id)
}

export function useCreateProject(): (input: NewProjectInput) => Project {
  return useCallback((input: NewProjectInput) => createProject(input), [])
}

export function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp
  const sec = Math.round(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 14) return `${day}d ago`
  const wk = Math.round(day / 7)
  if (wk < 8) return `${wk}w ago`
  const mo = Math.round(day / 30)
  return `${mo}mo ago`
}
