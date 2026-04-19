"use client"

import { useSyncExternalStore } from "react"

import type { AgentKey } from "@/components/agent-orb"

export type Role = "PM" | "ENG" | "QA"
export type Tone = "todo" | "progress" | "done" | "merged"

export const AGENT_BY_ROLE: Record<Role, AgentKey> = {
  PM: "priya",
  ENG: "enzo",
  QA: "quinn",
}

export const TONE_ORDER: Tone[] = ["todo", "progress", "done", "merged"]

export const ROLES: Role[] = ["PM", "ENG", "QA"]

export const COLUMNS: {
  key: Tone
  title: string
  hint: string
  dot: string
  ring: string
}[] = [
  { key: "todo", title: "To Do", hint: "queued by BOSS", dot: "bg-amber-500", ring: "ring-amber-500/40" },
  { key: "progress", title: "In Progress", hint: "FIXER wrenching", dot: "bg-sky-500", ring: "ring-sky-500/40" },
  { key: "done", title: "Done", hint: "awaiting TESTEES", dot: "bg-emerald-500", ring: "ring-emerald-500/40" },
  { key: "merged", title: "Merged", hint: "PR shipped", dot: "bg-muted-foreground", ring: "ring-muted-foreground/40" },
]

export type BoardCard = {
  id: string
  title: string
  issueNumber: number
  agent: Role
  tags: string[]
  tone: Tone
  createdAt: number
  updatedAt: number
}

export type BoardActivityEntry = {
  id: string
  who: Role | "SYSTEM" | "USER"
  time: string
  text: string
  createdAt: number
}

export type BoardState = {
  cards: BoardCard[]
  activity: BoardActivityEntry[]
  nextCardSeq: number
  nextIssueSeq: number
  typing: Role | null
}

export type NewCardInput = {
  title: string
  agent?: Role
  tags?: string[]
}

const STORAGE_KEY = "cp_boards_v1"
const UPDATE_EVENT = "cp-boards-update"

type BoardStore = Record<string, BoardState>

const HOURS_AGO = (h: number) => Date.now() - h * 60 * 60 * 1000
const MINS_AGO = (m: number) => Date.now() - m * 60 * 1000

const SEED_BOARDS: BoardStore = {
  "acme-web": {
    nextCardSeq: 2144,
    nextIssueSeq: 134,
    typing: "ENG",
    cards: [
      {
        id: "CDP-2142",
        title: "Settings: add SSO toggle for enterprise workspaces",
        issueNumber: 131,
        agent: "PM",
        tags: ["auth", "settings"],
        tone: "todo",
        createdAt: HOURS_AGO(3),
        updatedAt: HOURS_AGO(2),
      },
      {
        id: "CDP-2143",
        title: "Email: fix broken header spacing on Outlook iOS",
        issueNumber: 133,
        agent: "PM",
        tags: ["email"],
        tone: "todo",
        createdAt: HOURS_AGO(1),
        updatedAt: MINS_AGO(40),
      },
      {
        id: "CDP-2141",
        title: "Search: clear stale results after filter reset",
        issueNumber: 128,
        agent: "ENG",
        tags: ["a11y", "search"],
        tone: "progress",
        createdAt: HOURS_AGO(4),
        updatedAt: MINS_AGO(15),
      },
      {
        id: "CDP-2140",
        title: "Dashboard: chart legend overflows at 1280px",
        issueNumber: 126,
        agent: "QA",
        tags: ["ui"],
        tone: "done",
        createdAt: HOURS_AGO(6),
        updatedAt: MINS_AGO(20),
      },
      {
        id: "CDP-2139",
        title: "Onboarding: skip button ignored after org switch",
        issueNumber: 122,
        agent: "QA",
        tags: ["onboarding"],
        tone: "merged",
        createdAt: HOURS_AGO(20),
        updatedAt: HOURS_AGO(1),
      },
    ],
    activity: [
      { id: "act-web-1", who: "PM", time: "11:42", text: "Issue #128 parsed. Creating CDP-2141 with 3 acceptance criteria.", createdAt: MINS_AGO(90) },
      { id: "act-web-2", who: "ENG", time: "11:45", text: "Picked up CDP-2141, pulled branch feat/search-reset-cache.", createdAt: MINS_AGO(85) },
      { id: "act-web-3", who: "ENG", time: "11:51", text: "Patch pushed. Moving card \u2192 Done.", createdAt: MINS_AGO(80) },
      { id: "act-web-4", who: "QA", time: "11:53", text: "4 Playwright scenarios staged. Running now.", createdAt: MINS_AGO(75) },
      { id: "act-web-5", who: "QA", time: "11:54", text: "All green. Raising PR #412.", createdAt: MINS_AGO(70) },
    ],
  },
  "acme-api": {
    nextCardSeq: 812,
    nextIssueSeq: 57,
    typing: null,
    cards: [
      {
        id: "API-810",
        title: "Rate limiter: burst allowance for trusted clients",
        issueNumber: 54,
        agent: "PM",
        tags: ["rate-limit"],
        tone: "todo",
        createdAt: HOURS_AGO(5),
        updatedAt: HOURS_AGO(4),
      },
      {
        id: "API-811",
        title: "Tracing: propagate user id across downstream calls",
        issueNumber: 55,
        agent: "ENG",
        tags: ["tracing", "auth"],
        tone: "progress",
        createdAt: HOURS_AGO(8),
        updatedAt: HOURS_AGO(2),
      },
      {
        id: "API-809",
        title: "GraphQL: fix N+1 on paginated orders query",
        issueNumber: 52,
        agent: "QA",
        tags: ["graphql", "perf"],
        tone: "done",
        createdAt: HOURS_AGO(24),
        updatedAt: HOURS_AGO(3),
      },
    ],
    activity: [
      { id: "act-api-1", who: "PM", time: "09:02", text: "Reviewed #54 — splitting into two acceptance criteria.", createdAt: HOURS_AGO(6) },
      { id: "act-api-2", who: "ENG", time: "09:40", text: "Started work on tracing propagation.", createdAt: HOURS_AGO(5) },
      { id: "act-api-3", who: "QA", time: "10:15", text: "Regression sweep on #52 is green.", createdAt: HOURS_AGO(3) },
    ],
  },
  "labs-playground": {
    nextCardSeq: 3,
    nextIssueSeq: 2,
    typing: null,
    cards: [],
    activity: [
      { id: "act-labs-1", who: "SYSTEM", time: "—", text: "Nothing on the board yet. Drop an issue to kick things off.", createdAt: HOURS_AGO(24) },
    ],
  },
}

function isServer(): boolean {
  return typeof window === "undefined"
}

function serverSnapshot(): BoardStore {
  return SEED_BOARDS
}

let cached: BoardStore | null = null

function readStore(): BoardStore {
  if (isServer()) return SEED_BOARDS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_BOARDS))
      return SEED_BOARDS
    }
    const parsed = JSON.parse(raw) as BoardStore
    if (!parsed || typeof parsed !== "object") return SEED_BOARDS
    return parsed
  } catch {
    return SEED_BOARDS
  }
}

function writeStore(next: BoardStore): void {
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

function getSnapshot(): BoardStore {
  if (isServer()) return SEED_BOARDS
  if (cached) return cached
  cached = readStore()
  return cached
}

function defaultBoardState(): BoardState {
  return {
    cards: [],
    activity: [
      {
        id: `act-seed-${Date.now().toString(36)}`,
        who: "SYSTEM",
        time: nowLabel(),
        text: "Board created. Drop an issue to get the squad moving.",
        createdAt: Date.now(),
      },
    ],
    nextCardSeq: 1,
    nextIssueSeq: 1,
    typing: null,
  }
}

function updateBoard(
  projectId: string,
  updater: (state: BoardState) => BoardState,
): void {
  const store = readStore()
  const current = store[projectId] ?? defaultBoardState()
  const next = updater(current)
  writeStore({ ...store, [projectId]: next })
}

function nowLabel(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function prefixFor(projectId: string): string {
  const match = /[A-Za-z]+/.exec(projectId.replace(/^.*\//, "").toUpperCase())
  return (match?.[0] ?? "CDP").slice(0, 4)
}

function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function appendActivity(
  state: BoardState,
  entry: Omit<BoardActivityEntry, "id" | "createdAt" | "time"> & {
    time?: string
  },
): BoardState {
  const next: BoardActivityEntry = {
    id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    time: entry.time ?? nowLabel(),
    who: entry.who,
    text: entry.text,
  }
  return { ...state, activity: [...state.activity, next] }
}

export function createCard(
  projectId: string,
  input: NewCardInput,
): BoardCard | null {
  const title = input.title.trim()
  if (!title) return null
  const agent: Role = input.agent ?? "PM"
  const tags = (input.tags ?? [])
    .map(slugifyTag)
    .filter((t) => t.length > 0)
    .slice(0, 4)
  let created: BoardCard | null = null
  updateBoard(projectId, (state) => {
    const prefix = prefixFor(projectId)
    const cardId = `${prefix}-${state.nextCardSeq}`
    const issueNumber = state.nextIssueSeq
    const now = Date.now()
    const card: BoardCard = {
      id: cardId,
      title,
      issueNumber,
      agent,
      tags,
      tone: "todo",
      createdAt: now,
      updatedAt: now,
    }
    created = card
    const after: BoardState = {
      ...state,
      cards: [card, ...state.cards],
      nextCardSeq: state.nextCardSeq + 1,
      nextIssueSeq: state.nextIssueSeq + 1,
    }
    return appendActivity(after, {
      who: "PM",
      text: `Filed ${cardId} from issue #${issueNumber} — queued in To Do.`,
    })
  })
  return created
}

function activityForMove(card: BoardCard, prev: Tone, next: Tone): {
  who: Role
  text: string
} {
  if (next === "progress")
    return {
      who: "ENG",
      text: `Picked up ${card.id} — pulling branch feat/${slugifyTag(card.title).slice(0, 22) || "work"}.`,
    }
  if (next === "done")
    return {
      who: "ENG",
      text: `Patch pushed for ${card.id}. Moving card \u2192 Done.`,
    }
  if (next === "merged")
    return {
      who: "QA",
      text: `All green on ${card.id}. PR raised and merged.`,
    }
  if (next === "todo" && prev === "progress")
    return {
      who: "QA",
      text: `Paused ${card.id} — needs more scoping before it moves.`,
    }
  if (prev === "merged")
    return {
      who: "QA",
      text: `Reopened ${card.id} — bouncing back for another pass.`,
    }
  return {
    who: "PM",
    text: `Shuffled ${card.id} back to ${next.toUpperCase()}.`,
  }
}

export function setCardTone(
  projectId: string,
  cardId: string,
  tone: Tone,
): void {
  updateBoard(projectId, (state) => {
    const idx = state.cards.findIndex((c) => c.id === cardId)
    if (idx === -1) return state
    const prev = state.cards[idx]
    if (prev.tone === tone) return state
    const updated: BoardCard = { ...prev, tone, updatedAt: Date.now() }
    const cards = state.cards.slice()
    cards[idx] = updated
    const activity = activityForMove(prev, prev.tone, tone)
    return appendActivity({ ...state, cards }, activity)
  })
}

export function advanceCard(projectId: string, cardId: string): void {
  const store = readStore()
  const state = store[projectId]
  const card = state?.cards.find((c) => c.id === cardId)
  if (!card) return
  const idx = TONE_ORDER.indexOf(card.tone)
  if (idx === -1 || idx === TONE_ORDER.length - 1) return
  setCardTone(projectId, cardId, TONE_ORDER[idx + 1])
}

export function regressCard(projectId: string, cardId: string): void {
  const store = readStore()
  const state = store[projectId]
  const card = state?.cards.find((c) => c.id === cardId)
  if (!card) return
  const idx = TONE_ORDER.indexOf(card.tone)
  if (idx <= 0) return
  setCardTone(projectId, cardId, TONE_ORDER[idx - 1])
}

export function deleteCard(projectId: string, cardId: string): void {
  updateBoard(projectId, (state) => {
    const card = state.cards.find((c) => c.id === cardId)
    if (!card) return state
    const cards = state.cards.filter((c) => c.id !== cardId)
    return appendActivity(
      { ...state, cards },
      { who: "PM", text: `Archived ${card.id}.` },
    )
  })
}

export function resetBoard(projectId: string): void {
  const seed = SEED_BOARDS[projectId] ?? defaultBoardState()
  const store = readStore()
  writeStore({ ...store, [projectId]: seed })
}

export function useBoard(projectId: string | null | undefined): BoardState {
  const store = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
  if (!projectId) return defaultBoardState()
  return store[projectId] ?? defaultBoardState()
}
