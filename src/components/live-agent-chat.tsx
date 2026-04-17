"use client"

import { useEffect, useRef, useState } from "react"

import { AgentBadge } from "@/components/agent-badge"
import { AGENTS, AgentKey } from "@/components/agent-orb"

type Phase = "Listen" | "Plan" | "Fix" | "Check"

type StepBase = {
  phase: Phase
  /** How long to wait after this step before moving to the next (ms). */
  hold: number
}

type SystemStep = StepBase & {
  kind: "system"
  text: string
}

type MessageStep = StepBase & {
  kind: "message"
  agent: AgentKey
  text: string
  /** Typing indicator duration before the message lands (ms). */
  typing: number
}

type ChipStep = StepBase & {
  kind: "chip"
  agent: AgentKey
  chipKind: "update" | "checks" | "note"
  text: string
}

type Step = SystemStep | MessageStep | ChipStep

const SCRIPT: Step[] = [
  {
    kind: "system",
    phase: "Listen",
    text: "New message from Alex",
    hold: 700,
  },
  {
    kind: "message",
    phase: "Listen",
    agent: "priya",
    typing: 900,
    text: "Got it — I read what's bothering you. Three small things to fix.",
    hold: 700,
  },
  {
    kind: "message",
    phase: "Plan",
    agent: "enzo",
    typing: 800,
    text: "On it. Starting with the first one.",
    hold: 500,
  },
  {
    kind: "message",
    phase: "Plan",
    agent: "quinn",
    typing: 700,
    text: "I'll get the checks ready while you work.",
    hold: 600,
  },
  {
    kind: "chip",
    phase: "Fix",
    agent: "enzo",
    chipKind: "update",
    text: "Fixed the search box — it now clears when you reset the filters.",
    hold: 900,
  },
  {
    kind: "message",
    phase: "Fix",
    agent: "enzo",
    typing: 650,
    text: "All done. Moving it to 'Done'.",
    hold: 500,
  },
  {
    kind: "chip",
    phase: "Check",
    agent: "quinn",
    chipKind: "checks",
    text: "All 4 checks passed.",
    hold: 700,
  },
  {
    kind: "message",
    phase: "Check",
    agent: "priya",
    typing: 700,
    text: "Sending it live.",
    hold: 700,
  },
  {
    kind: "system",
    phase: "Check",
    text: "All set. Took 54 minutes.",
    hold: 2200,
  },
]

const PHASES: Phase[] = ["Listen", "Plan", "Fix", "Check"]

const PHASE_COLOR: Record<Phase, { bar: string; text: string }> = {
  Listen: { bar: "bg-amber-500", text: "text-amber-700" },
  Plan: { bar: "bg-amber-500", text: "text-amber-700" },
  Fix: { bar: "bg-sky-500", text: "text-sky-700" },
  Check: { bar: "bg-emerald-500", text: "text-emerald-700" },
}

type Rendered =
  | { id: number; kind: "system"; text: string }
  | {
      id: number
      kind: "message"
      agent: AgentKey
      text: string
    }
  | {
      id: number
      kind: "chip"
      agent: AgentKey
      chipKind: ChipStep["chipKind"]
      text: string
    }

export function LiveAgentChat() {
  const [items, setItems] = useState<Rendered[]>([])
  const [typing, setTyping] = useState<AgentKey | null>(null)
  const [phase, setPhase] = useState<Phase>("READ")
  const [runKey, setRunKey] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [items, typing])

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      setTyping(null)
      setPhase("Check")
      setItems(
        SCRIPT.map((s, i) => {
          if (s.kind === "system") {
            return { id: i, kind: "system", text: s.text }
          }
          if (s.kind === "chip") {
            return {
              id: i,
              kind: "chip",
              agent: s.agent,
              chipKind: s.chipKind,
              text: s.text,
            }
          }
          return { id: i, kind: "message", agent: s.agent, text: s.text }
        }),
      )
      return
    }

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    const clearAll = () => timers.forEach((t) => clearTimeout(t))
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        if (!cancelled) fn()
      }, ms)
      timers.push(t)
    }

    setItems([])
    setTyping(null)
    setPhase("Listen")

    const runNext = (idx: number) => {
      if (cancelled) return
      if (idx >= SCRIPT.length) {
        schedule(() => {
          setRunKey((k) => k + 1)
        }, 1400)
        return
      }
      const step = SCRIPT[idx]
      setPhase(step.phase)

      if (step.kind === "message") {
        setTyping(step.agent)
        schedule(() => {
          setTyping(null)
          setItems((prev) => [
            ...prev,
            { id: idx, kind: "message", agent: step.agent, text: step.text },
          ])
          schedule(() => runNext(idx + 1), step.hold)
        }, step.typing)
      } else if (step.kind === "chip") {
        setItems((prev) => [
          ...prev,
          {
            id: idx,
            kind: "chip",
            agent: step.agent,
            chipKind: step.chipKind,
            text: step.text,
          },
        ])
        schedule(() => runNext(idx + 1), step.hold)
      } else {
        setItems((prev) => [...prev, { id: idx, kind: "system", text: step.text }])
        schedule(() => runNext(idx + 1), step.hold)
      }
    }

    schedule(() => runNext(0), 250)

    return () => {
      cancelled = true
      clearAll()
    }
  }, [runKey])

  const activePhaseIdx = PHASES.indexOf(phase)

  return (
    <div className="flex h-[540px] flex-col rounded-[2rem] border border-border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
          <h3 className="text-sm font-semibold">Team chat</h3>
          <span className="text-[11px] text-muted-foreground">
            live demo
          </span>
        </div>
        <button
          type="button"
          onClick={() => setRunKey((k) => k + 1)}
          className="rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          aria-label="Replay the demo"
        >
          Replay
        </button>
      </div>

      {/* Phase progress rail */}
      <div className="grid grid-cols-4 gap-2 border-b border-border px-5 py-3">
        {PHASES.map((p, i) => {
          const state =
            i < activePhaseIdx ? "done" : i === activePhaseIdx ? "active" : "pending"
          const color = PHASE_COLOR[p]
          return (
            <div key={p} className="flex flex-col gap-1.5">
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <span
                  data-state={state}
                  className={`block h-full origin-left rounded-full ${color.bar} transition-transform duration-500 ease-out data-[state=pending]:scale-x-0 data-[state=active]:scale-x-100 data-[state=done]:scale-x-100`}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${color.bar} ${
                    state === "active" ? "[animation:cp-breath_1.4s_ease-in-out_infinite]" : ""
                  } ${state === "pending" ? "opacity-30" : ""}`}
                />
                <span
                  className={`font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    state === "pending"
                      ? "text-muted-foreground/60"
                      : state === "active"
                        ? color.text
                        : "text-muted-foreground"
                  }`}
                >
                  {p}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm"
      >
        {items.map((m) => {
          if (m.kind === "system") {
            return (
              <div
                key={m.id}
                className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-center text-[11.5px] text-muted-foreground [animation:cp-fade-up_0.4s_ease-out]"
              >
                {m.text}
              </div>
            )
          }
          if (m.kind === "chip") {
            const a = AGENTS[m.agent]
            const palette =
              m.chipKind === "update"
                ? "border-sky-500/20 bg-sky-500/5 text-sky-700"
                : m.chipKind === "checks"
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700"
                  : "border-amber-500/20 bg-amber-500/5 text-amber-700"
            const label =
              m.chipKind === "update"
                ? "update"
                : m.chipKind === "checks"
                  ? "checks"
                  : "note"
            return (
              <div
                key={m.id}
                className="flex gap-2.5 [animation:cp-fade-up_0.4s_ease-out]"
              >
                <AgentBadge agent={m.agent} size={28} />
                <div
                  className={`flex-1 rounded-lg border px-3 py-2 ${palette}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[12px] font-semibold ${a.accent}`}>
                      {a.name}
                    </span>
                    <span className="rounded-full bg-background/80 px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-foreground/85">
                    {m.text}
                  </p>
                </div>
              </div>
            )
          }
          const a = AGENTS[m.agent]
          return (
            <div
              key={m.id}
              className="flex gap-2.5 [animation:cp-fade-up_0.4s_ease-out]"
            >
              <AgentBadge agent={m.agent} size={28} />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[13px] font-semibold ${a.accent}`}>
                    {a.name}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">
                  {m.text}
                </p>
              </div>
            </div>
          )
        })}

        {typing && (
          <div className="flex items-center gap-2.5">
            <AgentBadge agent={typing} size={28} />
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
              <span className={`text-[11.5px] font-semibold ${AGENTS[typing].accent}`}>
                {AGENTS[typing].name}
              </span>
              <span className="flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/60 [animation-delay:0ms]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/60 [animation-delay:120ms]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/60 [animation-delay:240ms]" />
              </span>
              <span className="text-[11px] text-muted-foreground">is typing…</span>
            </div>
          </div>
        )}
      </div>

      {/* Fake input footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-input bg-background/60 p-2">
          <div className="flex-1 px-1.5 py-1 text-[12.5px] text-muted-foreground">
            Tell us what&apos;s bothering you…
          </div>
          <span className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background shadow-sm">
            Send
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
          <span>demo loops · no data sent</span>
          <span className="font-mono">⌘↵</span>
        </div>
      </div>
    </div>
  )
}
