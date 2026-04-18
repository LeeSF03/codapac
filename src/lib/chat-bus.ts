"use client"

import type { AgentKey } from "@/components/agent-orb"

export type UserMsg = {
  id: string
  kind: "user"
  text: string
  time: string
  name?: string
}

export type AgentMsg = {
  id: string
  kind: "agent"
  agent: AgentKey
  text: string
  time: string
}

export type Msg = UserMsg | AgentMsg

export type Project = {
  id: string
  name: string
  slug: string
  accent: string
  dot: string
}

export type Thread = {
  id: string
  title: string
  projectId: string | null
  createdAt: number
  updatedAt: number
  messages: Msg[]
  typing: AgentKey | null
}

export type ChatStore = {
  version: 2
  projects: Project[]
  threads: Record<string, Thread>
  order: string[]
  activeId: string | null
}

const STORAGE_KEY_V2 = "cp_chat_store_v2"
const STORAGE_KEY_V1 = "cp_chat_state_v1"
const UPDATE_EVENT = "cp-chat-update"
const REPLY_DELAY_MS = 900
const MAX_TITLE_CHARS = 40

const SEED_PROJECTS: Project[] = [
  {
    id: "general",
    name: "General",
    slug: "general",
    accent: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  {
    id: "acme-web",
    name: "acme/web",
    slug: "acme/web",
    accent: "text-amber-700",
    dot: "bg-amber-500",
  },
  {
    id: "acme-api",
    name: "acme/api",
    slug: "acme/api",
    accent: "text-sky-700",
    dot: "bg-sky-500",
  },
]

const REPLIES: Record<AgentKey, string[]> = {
  priya: [
    "Got it. I'll scope this into a ticket.",
    "On it — breaking this down into small, clear pieces.",
    "Noted. I'll draft acceptance criteria and drop a card in To Do.",
  ],
  enzo: [
    "Patch incoming. I'll push a branch shortly.",
    "I can reproduce this. Fixing now.",
    "Queued for the next small batch — should be quick.",
  ],
  quinn: [
    "I'll stage tests for this before it ships.",
    "Running the regression suite to double-check.",
    "I'll poke every button twice and report back.",
  ],
}

export const SEED_MESSAGES: AgentMsg[] = [
  {
    id: "seed-priya",
    kind: "agent",
    agent: "priya",
    text: "Hey — tell us what's bothering you and we'll divvy it up.",
    time: "now",
  },
  {
    id: "seed-enzo",
    kind: "agent",
    agent: "enzo",
    text: "If it's a bug or a fix, tag me. I'll hop on it.",
    time: "now",
  },
  {
    id: "seed-quinn",
    kind: "agent",
    agent: "quinn",
    text: "And I'll make sure nothing sneaks past the checks.",
    time: "now",
  },
]

export function routeAgent(text: string): AgentKey {
  const t = text.toLowerCase()
  if (/\b(bug|broken|fix|error|crash|issue)\b/.test(t)) return "enzo"
  if (/\b(test|check|qa|verify|regression|coverage)\b/.test(t)) return "quinn"
  return "priya"
}

function nowLabel(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function makeEmptyThread(projectId: string | null = null): Thread {
  const now = Date.now()
  return {
    id: randomId("t"),
    title: "New chat",
    projectId,
    createdAt: now,
    updatedAt: now,
    messages: [...SEED_MESSAGES],
    typing: null,
  }
}

function emptyStore(): ChatStore {
  const t = makeEmptyThread(null)
  return {
    version: 2,
    projects: SEED_PROJECTS,
    threads: { [t.id]: t },
    order: [t.id],
    activeId: t.id,
  }
}

function migrateV1(): ChatStore | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V1)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { messages?: Msg[] } | null
    const messages =
      parsed && Array.isArray(parsed.messages) && parsed.messages.length > 0
        ? (parsed.messages as Msg[])
        : [...SEED_MESSAGES]
    const firstUser = messages.find(
      (m): m is UserMsg => m.kind === "user",
    )
    const title = firstUser ? truncateTitle(firstUser.text) : "New chat"
    const now = Date.now()
    const t: Thread = {
      id: randomId("t"),
      title,
      projectId: null,
      createdAt: now - 1000,
      updatedAt: now,
      messages,
      typing: null,
    }
    window.localStorage.removeItem(STORAGE_KEY_V1)
    return {
      version: 2,
      projects: SEED_PROJECTS,
      threads: { [t.id]: t },
      order: [t.id],
      activeId: t.id,
    }
  } catch {
    return null
  }
}

function ensureProjectsAndOrder(store: ChatStore): ChatStore {
  const projects =
    Array.isArray(store.projects) && store.projects.length > 0
      ? store.projects
      : SEED_PROJECTS
  const threads = store.threads ?? {}
  const knownIds = new Set(Object.keys(threads))
  const order = Array.isArray(store.order)
    ? store.order.filter((id) => knownIds.has(id))
    : []
  for (const id of knownIds) {
    if (!order.includes(id)) order.unshift(id)
  }
  let activeId = store.activeId
  if (!activeId || !knownIds.has(activeId)) {
    activeId = order[0] ?? null
  }
  return {
    version: 2,
    projects,
    threads,
    order,
    activeId,
  }
}

function readStore(): ChatStore {
  if (typeof window === "undefined") return emptyStore()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V2)
    if (raw) {
      const parsed = JSON.parse(raw) as ChatStore
      if (parsed && parsed.version === 2 && parsed.threads) {
        return ensureProjectsAndOrder(parsed)
      }
    }
  } catch {
    // fall through
  }
  const migrated = migrateV1()
  if (migrated) {
    writeStore(migrated, { silent: true })
    return migrated
  }
  const fresh = emptyStore()
  writeStore(fresh, { silent: true })
  return fresh
}

function writeStore(
  next: ChatStore,
  opts: { silent?: boolean } = {},
): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(next))
    if (!opts.silent) {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
    }
  } catch {
    // ignore quota / disabled storage
  }
}

function truncateTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= MAX_TITLE_CHARS) return clean || "New chat"
  return `${clean.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`
}

export function getChatStore(): ChatStore {
  return readStore()
}

export function getActiveThread(store?: ChatStore): Thread | null {
  const s = store ?? readStore()
  if (!s.activeId) return null
  return s.threads[s.activeId] ?? null
}

export function subscribeChat(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const onLocal = () => cb()
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_V2) cb()
  }
  window.addEventListener(UPDATE_EVENT, onLocal)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(UPDATE_EVENT, onLocal)
    window.removeEventListener("storage", onStorage)
  }
}

export function createThread(projectId: string | null = null): string {
  const store = readStore()
  const t = makeEmptyThread(projectId)
  writeStore({
    ...store,
    threads: { ...store.threads, [t.id]: t },
    order: [t.id, ...store.order.filter((id) => id !== t.id)],
    activeId: t.id,
  })
  return t.id
}

export function setActiveThread(id: string): void {
  const store = readStore()
  if (!store.threads[id] || store.activeId === id) {
    if (store.threads[id] && store.activeId !== id) {
      writeStore({ ...store, activeId: id })
    }
    return
  }
  writeStore({ ...store, activeId: id })
}

export function deleteThread(id: string): void {
  const store = readStore()
  if (!store.threads[id]) return
  const nextThreads = { ...store.threads }
  delete nextThreads[id]
  const nextOrder = store.order.filter((tid) => tid !== id)
  let nextActive = store.activeId
  if (nextActive === id) {
    nextActive = nextOrder[0] ?? null
  }
  if (Object.keys(nextThreads).length === 0) {
    const t = makeEmptyThread(null)
    writeStore({
      ...store,
      threads: { [t.id]: t },
      order: [t.id],
      activeId: t.id,
    })
    return
  }
  writeStore({
    ...store,
    threads: nextThreads,
    order: nextOrder,
    activeId: nextActive,
  })
}

export function renameThread(id: string, title: string): void {
  const store = readStore()
  const t = store.threads[id]
  if (!t) return
  const clean = title.replace(/\s+/g, " ").trim()
  if (!clean) return
  writeStore({
    ...store,
    threads: {
      ...store.threads,
      [id]: { ...t, title: truncateTitle(clean), updatedAt: Date.now() },
    },
  })
}

export function resetChat(): void {
  writeStore(emptyStore())
}

let replyTimer: number | null = null

export function sendChatMessage(text: string, name?: string): boolean {
  if (typeof window === "undefined") return false
  const trimmed = text.trim()
  if (!trimmed) return false

  let store = readStore()
  let threadId = store.activeId
  if (!threadId || !store.threads[threadId]) {
    threadId = createThread(null)
    store = readStore()
  }

  const thread = store.threads[threadId]
  if (!thread || thread.typing) return false

  const userMsg: UserMsg = {
    id: randomId("u"),
    kind: "user",
    text: trimmed,
    time: nowLabel(),
    name,
  }
  const agent = routeAgent(trimmed)
  const nextMessages = [...thread.messages, userMsg]
  const isFirstUserMsg =
    thread.title === "New chat" &&
    !thread.messages.some((m) => m.kind === "user")
  const nextTitle = isFirstUserMsg ? truncateTitle(trimmed) : thread.title

  const afterUser: Thread = {
    ...thread,
    title: nextTitle,
    messages: nextMessages,
    typing: agent,
    updatedAt: Date.now(),
  }

  writeStore({
    ...store,
    threads: { ...store.threads, [threadId]: afterUser },
    order: [threadId, ...store.order.filter((id) => id !== threadId)],
  })

  const targetThreadId = threadId

  if (replyTimer !== null) {
    window.clearTimeout(replyTimer)
  }
  replyTimer = window.setTimeout(() => {
    const snapshot = readStore()
    const current = snapshot.threads[targetThreadId]
    if (!current) {
      replyTimer = null
      return
    }
    const pool = REPLIES[agent]
    const reply = pool[Math.floor(Math.random() * pool.length)]
    const agentMsg: AgentMsg = {
      id: randomId("a"),
      kind: "agent",
      agent,
      text: reply,
      time: nowLabel(),
    }
    writeStore({
      ...snapshot,
      threads: {
        ...snapshot.threads,
        [targetThreadId]: {
          ...current,
          messages: [...current.messages, agentMsg],
          typing: null,
          updatedAt: Date.now(),
        },
      },
      order: [
        targetThreadId,
        ...snapshot.order.filter((id) => id !== targetThreadId),
      ],
    })
    replyTimer = null
  }, REPLY_DELAY_MS)

  return true
}
