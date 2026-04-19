"use client"

import type { ReactNode } from "react"
import { useEffect, useEffectEvent, useRef, useState } from "react"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { AgentBadge } from "@/components/agent-badge"
import {
  AGENTS,
  AgentName,
  type AgentKey,
} from "@/components/agent-orb"

import { PulseDot } from "./pulse-dot"

type Phase = "Listen" | "Plan" | "Fix" | "Check"

type StepBase = {
  phase: Phase
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
  | { id: number; kind: "message"; agent: AgentKey; text: string }
  | {
      id: number
      kind: "chip"
      agent: AgentKey
      chipKind: ChipStep["chipKind"]
      text: string
    }

function MessageMotion({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function LandingLiveAgentChat() {
  const [items, setItems] = useState<Rendered[]>([])
  const [typing, setTyping] = useState<AgentKey | null>(null)
  const [phase, setPhase] = useState<Phase>("Listen")
  const [runKey, setRunKey] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const reduceMotion = useReducedMotion()
  const renderedItems = reduceMotion
    ? SCRIPT.map((step, index) => {
        if (step.kind === "system") {
          return { id: index, kind: "system", text: step.text } as const
        }
        if (step.kind === "chip") {
          return {
            id: index,
            kind: "chip",
            agent: step.agent,
            chipKind: step.chipKind,
            text: step.text,
          } as const
        }
        return {
          id: index,
          kind: "message",
          agent: step.agent,
          text: step.text,
        } as const
      })
    : items
  const currentPhase = reduceMotion ? "Check" : phase
  const currentTyping = reduceMotion ? null : typing
  const queueRestart = useEffectEvent(() => {
    setItems([])
    setTyping(null)
    setPhase("Listen")
    setRunKey((key) => key + 1)
  })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [currentTyping, renderedItems])

  useEffect(() => {
    if (reduceMotion) {
      return
    }

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    const schedule = (fn: () => void, ms: number) => {
      const timer = setTimeout(() => {
        if (!cancelled) fn()
      }, ms)
      timers.push(timer)
    }

    const runNext = (index: number) => {
      if (cancelled) return
      if (index >= SCRIPT.length) {
        schedule(() => {
          queueRestart()
        }, 1400)
        return
      }

      const step = SCRIPT[index]
      setPhase(step.phase)

      if (step.kind === "message") {
        setTyping(step.agent)
        schedule(() => {
          setTyping(null)
          setItems((prev) => [
            ...prev,
            { id: index, kind: "message", agent: step.agent, text: step.text },
          ])
          schedule(() => runNext(index + 1), step.hold)
        }, step.typing)
        return
      }

      if (step.kind === "chip") {
        setItems((prev) => [
          ...prev,
          {
            id: index,
            kind: "chip",
            agent: step.agent,
            chipKind: step.chipKind,
            text: step.text,
          },
        ])
        schedule(() => runNext(index + 1), step.hold)
        return
      }

      setItems((prev) => [...prev, { id: index, kind: "system", text: step.text }])
      schedule(() => runNext(index + 1), step.hold)
    }

    schedule(() => runNext(0), 250)

    return () => {
      cancelled = true
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [reduceMotion, runKey])

  const activePhaseIndex = PHASES.indexOf(currentPhase)

  return (
    <div className="flex h-[540px] flex-col rounded-[2rem] border border-border bg-card shadow-lg">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <PulseDot className="h-2 w-2 bg-emerald-500" />
          <h3 className="text-sm font-semibold">Team chat</h3>
          <span className="text-[11px] text-muted-foreground">live demo</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setItems([])
            setTyping(null)
            setPhase("Listen")
            setRunKey((key) => key + 1)
          }}
          className="rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          aria-label="Replay the demo"
        >
          Replay
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 border-b border-border px-5 py-3">
        {PHASES.map((currentPhase, index) => {
          const state =
            index < activePhaseIndex
              ? "done"
              : index === activePhaseIndex
                ? "active"
                : "pending"
          const color = PHASE_COLOR[currentPhase]
          const pending = state === "pending"
          const active = state === "active"

          return (
            <div key={currentPhase} className="flex flex-col gap-1.5">
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <motion.span
                  className={`block h-full origin-left rounded-full ${color.bar}`}
                  initial={false}
                  animate={{ scaleX: pending ? 0 : 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <motion.span
                  className={`h-1.5 w-1.5 rounded-full ${color.bar} ${
                    pending ? "opacity-30" : ""
                  }`}
                  animate={
                    active && !reduceMotion
                      ? { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }
                      : undefined
                  }
                  transition={
                    active && !reduceMotion
                      ? {
                          duration: 1.4,
                          ease: "easeInOut",
                          repeat: Number.POSITIVE_INFINITY,
                        }
                      : undefined
                  }
                />
                <span
                  className={`font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    pending
                      ? "text-muted-foreground/60"
                      : active
                        ? color.text
                        : "text-muted-foreground"
                  }`}
                >
                  {currentPhase}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm"
      >
        <AnimatePresence initial={false}>
          {renderedItems.map((item) => {
            if (item.kind === "system") {
              return (
                <MessageMotion
                  key={item.id}
                  className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-center text-[11.5px] text-muted-foreground"
                >
                  {item.text}
                </MessageMotion>
              )
            }

            if (item.kind === "chip") {
              const agent = AGENTS[item.agent]
              const palette =
                item.chipKind === "update"
                  ? "border-sky-500/20 bg-sky-500/5 text-sky-700"
                  : item.chipKind === "checks"
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700"
                    : "border-amber-500/20 bg-amber-500/5 text-amber-700"
              const label =
                item.chipKind === "update"
                  ? "update"
                  : item.chipKind === "checks"
                    ? "checks"
                    : "note"

              return (
                <MessageMotion key={item.id} className="flex gap-2.5">
                  <AgentBadge agent={item.agent} size={28} />
                  <div className={`flex-1 rounded-lg border px-3 py-2 ${palette}`}>
                    <div className="flex items-baseline gap-2">
                      <AgentName
                        agent={item.agent}
                        className="text-[12px] font-semibold"
                      >
                        {agent.name}
                      </AgentName>
                      <span className="rounded-full bg-background/80 px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-snug text-foreground/85">
                      {item.text}
                    </p>
                  </div>
                </MessageMotion>
              )
            }

            const agent = AGENTS[item.agent]

            return (
              <MessageMotion key={item.id} className="flex gap-2.5">
                <AgentBadge agent={item.agent} size={28} />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <AgentName
                      agent={item.agent}
                      className="text-[13px] font-semibold"
                    >
                      {agent.name}
                    </AgentName>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">
                    {item.text}
                  </p>
                </div>
              </MessageMotion>
            )
          })}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {currentTyping ? (
            <motion.div
              key={currentTyping}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center gap-2.5"
            >
              <AgentBadge agent={currentTyping} size={28} />
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                <AgentName
                  agent={currentTyping}
                  className="text-[11.5px] font-semibold"
                >
                  {AGENTS[currentTyping].name}
                </AgentName>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((index) => (
                    <motion.span
                      key={index}
                      className="h-1 w-1 rounded-full bg-foreground/60"
                      animate={
                        reduceMotion
                          ? undefined
                          : { y: [0, -3, 0], opacity: [0.45, 1, 0.45] }
                      }
                      transition={
                        reduceMotion
                          ? undefined
                          : {
                              duration: 0.7,
                              ease: "easeInOut",
                              repeat: Number.POSITIVE_INFINITY,
                              delay: index * 0.12,
                            }
                      }
                    />
                  ))}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  is typing…
                </span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

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
