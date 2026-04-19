"use client"

import type { ReactNode } from "react"

import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

export type AgentKey = "priya" | "enzo" | "quinn"

const agentNameStyles = cva("", {
  variants: {
    agent: {
      priya: "text-amber-700",
      enzo: "text-sky-700",
      quinn: "text-emerald-700",
    },
  },
})

const agentStatusDotStyles = cva("", {
  variants: {
    agent: {
      priya: "bg-amber-500",
      enzo: "bg-sky-500",
      quinn: "bg-emerald-500",
    },
  },
})

export const agentBadgeRingStyles = cva("", {
  variants: {
    agent: {
      priya: "ring-amber-500/30",
      enzo: "ring-sky-500/30",
      quinn: "ring-emerald-500/30",
    },
  },
})

const agentNodeRingStyles = cva("", {
  variants: {
    agent: {
      priya: "border-amber-500/30",
      enzo: "border-sky-500/30",
      quinn: "border-emerald-500/30",
    },
  },
})

const agentRoleBadgeStyles = cva("", {
  variants: {
    agent: {
      priya: "bg-amber-500/10 text-amber-700",
      enzo: "bg-sky-500/10 text-sky-700",
      quinn: "bg-emerald-500/10 text-emerald-700",
    },
  },
})

const agentHeroAuraStyles = cva("", {
  variants: {
    agent: {
      priya: "bg-amber-400/30",
      enzo: "bg-sky-400/30",
      quinn: "bg-emerald-400/30",
    },
  },
})

const agentAvatarSurfaceStyles = cva("", {
  variants: {
    agent: {
      priya: "bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200/80",
      enzo: "bg-gradient-to-br from-sky-100 via-sky-200 to-sky-300/70",
      quinn:
        "bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200/80",
    },
  },
})

const agentAvatarOutlineStyles = cva("", {
  variants: {
    agent: {
      priya: "ring-amber-500/25",
      enzo: "ring-sky-500/30",
      quinn: "ring-emerald-500/25",
    },
  },
})

export const agentBadgeSurfaceStyles = cva("", {
  variants: {
    agent: {
      priya: "bg-gradient-to-br from-amber-400 to-amber-600",
      enzo: "bg-gradient-to-br from-sky-400 to-sky-600",
      quinn: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    },
  },
})

export function AgentAvatar({
  agent,
  size = 140,
  className,
  paused,
}: {
  agent: AgentKey
  size?: number
  className?: string
  paused?: boolean
}) {
  return (
    <div
      style={{ width: size, height: size }}
      data-paused={paused ? "true" : undefined}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[28%] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_28px_-14px_rgba(15,23,42,0.35)] ring-1 ring-inset",
        agentAvatarSurfaceStyles({ agent }),
        agentAvatarOutlineStyles({ agent }),
        "[&[data-paused=true]_*]:![animation-play-state:paused]",
        className
      )}
    >
      {/* soft polka dot background */}
      <span className="pointer-events-none absolute inset-0 opacity-[0.08] [background:radial-gradient(circle_at_20%_20%,_black_1px,_transparent_1.5px)_0_0/18px_18px]" />
      {agent === "priya" && <BossScene />}
      {agent === "enzo" && <FixerScene />}
      {agent === "quinn" && <TesteesScene />}
    </div>
  )
}

/* Kept as an alias so older imports keep working. */
export const AgentOrb = AgentAvatar

export function AgentName({
  agent,
  className,
  children,
}: {
  agent: AgentKey
  className?: string
  children?: ReactNode
}) {
  return (
    <span className={cn(agentNameStyles({ agent }), className)}>
      {children ?? AGENTS[agent].name}
    </span>
  )
}

export function AgentStatusDot({
  agent,
  className,
}: {
  agent: AgentKey
  className?: string
}) {
  return <span aria-hidden className={cn(agentStatusDotStyles({ agent }), className)} />
}

export function AgentRoleTag({
  agent,
  className,
}: {
  agent: AgentKey
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-transparent",
        agentRoleBadgeStyles({ agent }),
        className
      )}
    >
      <AgentStatusDot agent={agent} className="h-1.5 w-1.5 rounded-full" />
      {AGENTS[agent].role}
    </span>
  )
}

export function AgentHeroAura({
  agent,
  className,
}: {
  agent: AgentKey
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(agentHeroAuraStyles({ agent }), className)}
    />
  )
}

export function AgentNodeRing({
  agent,
  className,
}: {
  agent: AgentKey
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(agentNodeRingStyles({ agent }), className)}
    />
  )
}

/* ─────────────────── BOSS — Product Manager (amber) ───────────────────
   A tiny gold robot wearing a crown. Blinking eyes, bobbing antenna,
   a clipboard full of tasks, and a priority tag that swoops onto it. */
function BossScene() {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="relative h-[82%] w-[60%] [animation:cp-bob_4s_ease-in-out_infinite]">
        {/* antenna */}
        <span className="absolute top-[-12%] left-1/2 h-[10%] w-[3%] -translate-x-1/2 rounded-full bg-amber-700" />
        <span className="absolute top-[-16%] left-1/2 size-[9%] -translate-x-1/2 [animation:cp-breath_1.6s_ease-in-out_infinite] rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.9)]" />

        {/* crown */}
        <svg
          viewBox="0 0 32 14"
          className="absolute top-[-7%] left-1/2 h-[15%] w-[54%] -translate-x-1/2 text-amber-500 drop-shadow-sm"
          aria-hidden
        >
          <path
            d="M2 13 L5 3 L11 9 L16 1 L21 9 L27 3 L30 13 Z"
            fill="currentColor"
            stroke="#b45309"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <circle cx="5" cy="3" r="1.3" fill="#fbbf24" />
          <circle cx="16" cy="1.3" r="1.6" fill="#fde68a" />
          <circle cx="27" cy="3" r="1.3" fill="#fbbf24" />
        </svg>

        {/* head */}
        <div className="relative mx-auto mt-[10%] h-[50%] w-[96%] rounded-[30%] bg-white shadow-md ring-2 ring-amber-500/40">
          {/* eyes */}
          <span className="absolute top-[32%] left-[22%] size-[18%] [transform-origin:center] [animation:cp-eye-blink_3.4s_ease-in-out_infinite] rounded-full bg-amber-900" />
          <span className="absolute top-[32%] right-[22%] size-[18%] [transform-origin:center] [animation:cp-eye-blink_3.4s_ease-in-out_infinite] rounded-full bg-amber-900" />
          {/* eye sparkles */}
          <span className="absolute top-[36%] left-[27%] size-[5%] rounded-full bg-white" />
          <span className="absolute top-[36%] right-[27%] size-[5%] rounded-full bg-white" />
          {/* cheek blush */}
          <span className="absolute top-[58%] left-[10%] size-[14%] rounded-full bg-amber-300/80 blur-[1px]" />
          <span className="absolute top-[58%] right-[10%] size-[14%] rounded-full bg-amber-300/80 blur-[1px]" />
          {/* smile */}
          <span className="absolute top-[70%] left-1/2 h-[14%] w-[28%] [transform-origin:top] -translate-x-1/2 [animation:cp-mouth_3.4s_ease-in-out_infinite] overflow-hidden rounded-b-full bg-amber-800">
            <span className="absolute bottom-0 left-1/2 h-[40%] w-[40%] -translate-x-1/2 rounded-full bg-rose-400/80" />
          </span>
        </div>

        {/* body + clipboard */}
        <div className="relative mx-auto mt-[3%] h-[36%] w-[84%] rounded-[22%] bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner ring-1 ring-amber-700/30">
          {/* tie */}
          <span className="absolute -top-[14%] left-1/2 h-[26%] w-[14%] -translate-x-1/2 rounded-t-sm bg-amber-800" />
          <span className="absolute top-[12%] left-1/2 size-[18%] -translate-x-1/2 rotate-45 bg-amber-800" />
          {/* clipboard */}
          <div className="absolute inset-[16%] rounded-[16%] bg-white/95 p-[10%] shadow-inner">
            <span className="block h-[14%] w-full rounded-full bg-amber-500/70" />
            <span className="mt-[12%] block h-[14%] w-[72%] rounded-full bg-amber-500/50" />
            <span className="mt-[12%] block h-[14%] w-[54%] rounded-full bg-amber-500/40" />
          </div>
        </div>
      </div>

      {/* flying priority tag */}
      <span className="absolute top-[22%] right-[6%] flex h-[7%] w-[24%] [animation:cp-tag-land_4.4s_ease-in-out_infinite] items-center justify-center rounded-full bg-amber-500 text-[6px] font-bold text-white shadow-md">
        P1
      </span>
    </div>
  )
}

/* ─────────────────── FIXER — Engineer (sky) ───────────────────
   A sky-blue mechanic bot with a visor, a spinning gear, and a
   wrench that wiggles while sparks pop. */
function FixerScene() {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="relative h-[82%] w-[62%] [animation:cp-bob_3.6s_ease-in-out_infinite]">
        {/* spinning gear beside head */}
        <svg
          viewBox="0 0 24 24"
          className="absolute top-[2%] -left-[8%] h-[22%] w-[22%] [animation:cp-spin_5s_linear_infinite] text-sky-600/90"
          aria-hidden
        >
          <path
            d="M12 2.5 l1.3 2.2 2.4-.5.5 2.4 2.2 1.3-1 2.3 1 2.3-2.2 1.3-.5 2.4-2.4-.5-1.3 2.2-1.3-2.2-2.4.5-.5-2.4-2.2-1.3 1-2.3-1-2.3 2.2-1.3.5-2.4 2.4.5 z"
            fill="currentColor"
          />
          <circle cx="12" cy="12" r="3" fill="#e0f2fe" />
        </svg>

        {/* antenna + bolt light */}
        <span className="absolute top-[-9%] left-1/2 h-[8%] w-[3%] -translate-x-1/2 rounded-full bg-sky-800" />
        <svg
          viewBox="0 0 12 12"
          className="absolute top-[-14%] left-1/2 h-[11%] w-[11%] -translate-x-1/2 [animation:cp-breath_1.2s_ease-in-out_infinite] text-yellow-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.9)]"
          aria-hidden
        >
          <path
            d="M7 1 L2 7 L5.5 7 L4 11 L10 4 L6.5 4 Z"
            fill="currentColor"
            stroke="#ca8a04"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </svg>

        {/* head (helmet) */}
        <div className="relative mx-auto mt-[8%] h-[50%] w-[96%] rounded-[30%] bg-gradient-to-br from-sky-500 to-sky-700 shadow-lg ring-2 ring-sky-900/30">
          {/* helmet stripe */}
          <span className="absolute inset-x-[6%] top-[10%] h-[10%] rounded-full bg-sky-300/60" />
          {/* visor */}
          <div className="absolute inset-x-[10%] top-[28%] h-[40%] overflow-hidden rounded-[40%] bg-slate-900 shadow-inner ring-2 ring-sky-200/40">
            {/* scanline */}
            <span className="absolute inset-x-0 top-0 h-[20%] [animation:cp-scan_2.4s_linear_infinite] bg-gradient-to-b from-sky-300/60 to-transparent" />
            {/* eyes — two glowing pixels */}
            <span className="absolute top-1/2 left-[22%] size-[22%] -translate-y-1/2 [animation:cp-blink_1.8s_steps(2,end)_infinite] rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.9)]" />
            <span className="absolute top-1/2 right-[22%] size-[22%] -translate-y-1/2 [animation:cp-blink_1.8s_steps(2,end)_infinite] rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.9)] [animation-delay:0.2s]" />
          </div>
          {/* mouth grill */}
          <div className="absolute top-[76%] left-1/2 flex h-[8%] w-[34%] -translate-x-1/2 items-center justify-around rounded-sm bg-sky-900/80 px-[4%]">
            <span className="h-[60%] w-[8%] rounded-full bg-sky-300" />
            <span className="h-[60%] w-[8%] rounded-full bg-sky-300" />
            <span className="h-[60%] w-[8%] rounded-full bg-sky-300" />
            <span className="h-[60%] w-[8%] rounded-full bg-sky-300" />
          </div>
        </div>

        {/* body */}
        <div className="relative mx-auto mt-[3%] h-[36%] w-[86%] rounded-[22%] bg-gradient-to-br from-sky-400 to-sky-600 shadow-inner ring-1 ring-sky-900/30">
          {/* chest screen */}
          <div className="absolute inset-[16%] overflow-hidden rounded-[14%] bg-slate-950/85 p-[8%]">
            <div className="flex items-center gap-[4%]">
              <span className="size-[16%] rounded-full bg-rose-400/80" />
              <span className="size-[16%] rounded-full bg-amber-400/80" />
              <span className="size-[16%] rounded-full bg-emerald-400/80" />
            </div>
            <div className="mt-[14%] space-y-[10%]">
              <span
                className="block h-[14%] w-[72%] [animation:cp-grow_3.2s_ease-in-out_infinite] rounded-full bg-sky-400/80"
                style={{ transformOrigin: "left" }}
              />
              <span
                className="block h-[14%] w-[54%] [animation:cp-grow_3.2s_ease-in-out_infinite_0.3s] rounded-full bg-sky-300/70"
                style={{ transformOrigin: "left" }}
              />
              <span
                className="block h-[14%] w-[86%] [animation:cp-grow_3.2s_ease-in-out_infinite_0.6s] rounded-full bg-sky-400/80"
                style={{ transformOrigin: "left" }}
              />
            </div>
          </div>
        </div>

        {/* wrench — wiggles in right hand */}
        <div className="absolute top-[48%] right-[-14%] h-[30%] w-[26%] origin-bottom [animation:cp-wiggle_1.6s_ease-in-out_infinite]">
          <svg
            viewBox="0 0 24 64"
            className="h-full w-full text-slate-400 drop-shadow-sm"
            aria-hidden
          >
            <rect
              x="9"
              y="12"
              width="6"
              height="42"
              rx="3"
              fill="currentColor"
            />
            <path
              d="M12 2 L18 6 L18 12 L15 14 L15 20 L9 20 L9 14 L6 12 L6 6 Z"
              fill="currentColor"
              stroke="#334155"
              strokeWidth="0.8"
            />
            <rect x="9" y="54" width="6" height="6" rx="1.4" fill="#334155" />
          </svg>
          {/* spark */}
          <span className="absolute top-[4%] -left-[30%] h-[8%] w-[14%] [animation:cp-spark_1.6s_ease-in-out_infinite] rounded-full bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.9)]" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────── TESTEES — QA (emerald) ───────────────────
   A pastel-green lab bot that swings a magnifier, holds a bubbling
   beaker, and celebrates with a checkmark badge. */
function TesteesScene() {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="relative h-[82%] w-[60%] [animation:cp-bob_4.2s_ease-in-out_infinite]">
        {/* antenna with check */}
        <span className="absolute top-[-10%] left-1/2 h-[10%] w-[3%] -translate-x-1/2 rounded-full bg-emerald-700" />
        <span className="absolute top-[-17%] left-1/2 grid size-[16%] -translate-x-1/2 [animation:cp-breath_1.6s_ease-in-out_infinite] place-items-center rounded-full bg-emerald-500 shadow-md ring-2 ring-white">
          <svg
            viewBox="0 0 24 24"
            className="size-[70%]"
            fill="none"
            aria-hidden
          >
            <path
              d="M5 12.5 10 17.5 19 7.5"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        {/* ears / earmuffs */}
        <span className="absolute top-[30%] left-[-6%] size-[16%] rounded-full bg-emerald-500 ring-2 ring-white" />
        <span className="absolute top-[30%] right-[-6%] size-[16%] rounded-full bg-emerald-500 ring-2 ring-white" />

        {/* head */}
        <div className="relative mx-auto mt-[10%] h-[50%] w-[96%] rounded-[34%] bg-white shadow-md ring-2 ring-emerald-500/40">
          {/* forehead badge */}
          <span className="absolute top-[8%] left-1/2 h-[10%] w-[30%] -translate-x-1/2 rounded-full bg-emerald-500/15 text-center font-mono text-[6px] leading-[1.6] font-bold text-emerald-700">
            QA
          </span>
          {/* eyes (happy curves) */}
          <svg
            viewBox="0 0 40 16"
            className="absolute top-[36%] left-[18%] h-[14%] w-[20%] [transform-origin:center] [animation:cp-eye-blink_3.2s_ease-in-out_infinite] text-emerald-800"
            aria-hidden
            fill="none"
          >
            <path
              d="M4 12 Q20 -2 36 12"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
          <svg
            viewBox="0 0 40 16"
            className="absolute top-[36%] right-[18%] h-[14%] w-[20%] [transform-origin:center] [animation:cp-eye-blink_3.2s_ease-in-out_infinite] text-emerald-800"
            aria-hidden
            fill="none"
          >
            <path
              d="M4 12 Q20 -2 36 12"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
          {/* blush */}
          <span className="absolute top-[58%] left-[12%] size-[12%] rounded-full bg-emerald-300/80 blur-[1px]" />
          <span className="absolute top-[58%] right-[12%] size-[12%] rounded-full bg-emerald-300/80 blur-[1px]" />
          {/* smile */}
          <span className="absolute top-[70%] left-1/2 h-[12%] w-[22%] [transform-origin:top] -translate-x-1/2 [animation:cp-mouth_3.2s_ease-in-out_infinite] rounded-b-full bg-emerald-700" />
        </div>

        {/* body with beaker */}
        <div className="relative mx-auto mt-[3%] h-[36%] w-[82%] rounded-[22%] bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-inner ring-1 ring-emerald-700/30">
          {/* pocket */}
          <span className="absolute top-[18%] left-[12%] h-[24%] w-[28%] rounded-[18%] bg-emerald-100/60 ring-1 ring-emerald-700/20" />
          {/* beaker */}
          <div className="absolute top-[14%] right-[10%] h-[68%] w-[34%]">
            {/* neck */}
            <span className="absolute top-0 left-1/2 h-[16%] w-[40%] -translate-x-1/2 rounded-t-sm bg-white/95 ring-1 ring-emerald-700/30" />
            {/* flask */}
            <div className="absolute right-0 bottom-0 left-0 h-[86%] overflow-hidden rounded-[22%_22%_30%_30%] bg-white/95 shadow-inner ring-1 ring-emerald-700/30">
              <span className="absolute inset-x-0 bottom-0 h-[55%] bg-emerald-400/80" />
              {/* bubbles */}
              <span className="absolute bottom-[20%] left-[25%] size-[14%] [animation:cp-bubble_2.2s_ease-in-out_infinite] rounded-full bg-white" />
              <span className="absolute bottom-[10%] left-[55%] size-[18%] [animation:cp-bubble_2.6s_ease-in-out_infinite_0.6s] rounded-full bg-white" />
              <span className="absolute bottom-[30%] left-[40%] size-[10%] [animation:cp-bubble_1.8s_ease-in-out_infinite_0.3s] rounded-full bg-white" />
            </div>
          </div>
        </div>

        {/* magnifier swinging */}
        <div className="absolute top-[52%] left-[-18%] h-[34%] w-[34%] origin-top-right [animation:cp-swing_2.8s_ease-in-out_infinite]">
          <span className="absolute right-[10%] bottom-[6%] h-[48%] w-[10%] rotate-[40deg] rounded-full bg-slate-500" />
          <span className="absolute top-[0%] left-[0%] size-[64%] rounded-full bg-emerald-200/40 shadow-inner ring-[4px] ring-slate-500">
            <span className="absolute inset-[15%] rounded-full bg-white/70" />
          </span>
        </div>
      </div>

      {/* radar ping */}
      <span className="pointer-events-none absolute top-[12%] right-[14%] size-[7%] [animation:cp-ping-soft_2.6s_ease-out_infinite] rounded-full border border-emerald-500/70" />
    </div>
  )
}

/* ─────────────────────────── Meta (copy) ─────────────────────────── */

export const AGENTS: Record<
  AgentKey,
  {
    key: AgentKey
    name: string
    role: string
    title: string
    tagline: string
    skills: string[]
  }
> = {
  priya: {
    key: "priya",
    name: "BOSS",
    role: "PM",
    title: "Backlog Boss-bot",
    tagline:
      "Crown-wearing taskmaster. Chews through GitHub issues, spits out crisp acceptance criteria, and never forgets a blocker.",
    skills: [
      "Issue triage",
      "Acceptance criteria",
      "Sprint shaping",
      "Priority calls",
      "Stakeholder replies",
    ],
  },
  enzo: {
    key: "enzo",
    name: "FIXER",
    role: "ENG",
    title: "Patch-Slinging Mechanic",
    tagline:
      "Wrench in hand, gears turning. Pulls cards, welds bugs shut, and ships clean commits on tidy feature branches.",
    skills: [
      "TypeScript",
      "Next.js",
      "Convex",
      "Refactors",
      "Code review replies",
    ],
  },
  quinn: {
    key: "quinn",
    name: "TESTEES",
    role: "QA",
    title: "Lab-Coat Test Goblin",
    tagline:
      "Magnifier out, beaker bubbling. Writes Playwright scenarios, breaks edge cases on purpose — green means ship, red bounces it back.",
    skills: [
      "Playwright",
      "Edge cases",
      "Regression sweeps",
      "Flake hunting",
      "PR gating",
    ],
  },
}
