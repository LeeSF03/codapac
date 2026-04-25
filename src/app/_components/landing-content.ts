import type { AgentKey } from "@/components/agent-orb"

export type LandingPhaseKey = "listen" | "plan" | "fix" | "check"
export type LandingMiniTone = "todo" | "progress" | "done" | "merged"

export type LandingPhase = {
  key: LandingPhaseKey
  title: string
  blurb: string
  agent: AgentKey
}

export const LANDING_PHASES: LandingPhase[] = [
  {
    key: "listen",
    title: "Listen",
    blurb:
      "Tell us what's wrong in your own words. We pick out the important bits.",
    agent: "priya",
  },
  {
    key: "plan",
    title: "Plan",
    blurb: "We break it into small, clear pieces so nothing gets forgotten.",
    agent: "priya",
  },
  {
    key: "fix",
    title: "Fix",
    blurb: "A helper rolls up their sleeves and takes care of each piece.",
    agent: "enzo",
  },
  {
    key: "check",
    title: "Check",
    blurb:
      "Another helper double-checks everything is working before it goes live.",
    agent: "quinn",
  },
]

export type LandingMiniCard = {
  title: string
  tag: string
  agent: AgentKey
  tone: LandingMiniTone
}

export const LANDING_MINI_COLUMNS: {
  key: LandingMiniTone
  title: string
  hint: string
}[] = [
  { key: "todo", title: "To do", hint: "3 waiting" },
  {
    key: "progress",
    title: "Working on it",
    hint: "being handled",
  },
  {
    key: "done",
    title: "Checking",
    hint: "one last look",
  },
  {
    key: "merged",
    title: "All done",
    hint: "live",
  },
]

export const LANDING_MINI_CARDS: LandingMiniCard[] = [
  {
    title: "Checkout button says the wrong thing",
    tag: "wording",
    agent: "priya",
    tone: "todo",
  },
  {
    title: "Welcome email looks broken on iPhone",
    tag: "email",
    agent: "priya",
    tone: "todo",
  },
  {
    title: "Search doesn't reset when I clear filters",
    tag: "feels buggy",
    agent: "enzo",
    tone: "progress",
  },
  {
    title: "Chart bleeds off the screen on my laptop",
    tag: "looks off",
    agent: "quinn",
    tone: "done",
  },
  {
    title: "Skip button was ignored after switching teams",
    tag: "onboarding",
    agent: "quinn",
    tone: "merged",
  },
]

export const LANDING_STATS = [
  {
    label: "Average time to fix",
    value: "54m",
    hint: "from 'this is annoying' to 'it's fixed'",
    trend: "text-emerald-600",
  },
  {
    label: "Got it right first time",
    value: "92%",
    hint: "of the last 30 fixes",
    trend: "text-emerald-600",
  },
  {
    label: "Sent back to redo",
    value: "3",
    hint: "caught by the checker",
    trend: "text-muted-foreground",
  },
  {
    label: "Team online",
    value: "3 / 3",
    hint: "always ready to help",
    trend: "text-muted-foreground",
  },
] as const

export const LANDING_AGENT_KEYS: AgentKey[] = ["priya", "enzo", "quinn"]

export const LANDING_AGENT_COPY: Record<
  AgentKey,
  { role: string; blurb: string }
> = {
  priya: {
    role: "The organiser",
    blurb:
      "Reads what you wrote, figures out what actually needs doing, and writes it down in plain steps.",
  },
  enzo: {
    role: "The fixer",
    blurb:
      "Takes each step and does it carefully. Doesn't stop until it feels right.",
  },
  quinn: {
    role: "The checker",
    blurb:
      "Tries to break it on purpose. Only gives the green light when everything behaves.",
  },
}
