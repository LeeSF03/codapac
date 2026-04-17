"use client"

import { cn } from "@/lib/utils"

export type AgentKey = "priya" | "enzo" | "quinn"

const frame: Record<AgentKey, { bg: string; border: string; text: string }> = {
  priya: {
    bg: "bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200/80",
    border: "ring-amber-500/25",
    text: "text-amber-700",
  },
  enzo: {
    bg: "bg-gradient-to-br from-sky-100 via-sky-200 to-sky-300/70",
    border: "ring-sky-500/30",
    text: "text-sky-700",
  },
  quinn: {
    bg: "bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200/80",
    border: "ring-emerald-500/25",
    text: "text-emerald-700",
  },
}

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
  const t = frame[agent]
  return (
    <div
      style={{ width: size, height: size }}
      data-paused={paused ? "true" : undefined}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[28%] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_28px_-14px_rgba(15,23,42,0.35)] ring-1 ring-inset",
        t.bg,
        t.border,
        "[&[data-paused=true]_*]:![animation-play-state:paused]",
        className,
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

/* ─────────────────── BOSS — Product Manager (amber) ───────────────────
   A tiny gold robot wearing a crown. Blinking eyes, bobbing antenna,
   a clipboard full of tasks, and a priority tag that swoops onto it. */
function BossScene() {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="relative h-[82%] w-[60%] [animation:cp-bob_4s_ease-in-out_infinite]">
        {/* antenna */}
        <span className="absolute left-1/2 top-[-12%] h-[10%] w-[3%] -translate-x-1/2 rounded-full bg-amber-700" />
        <span className="absolute left-1/2 top-[-16%] size-[9%] -translate-x-1/2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.9)] [animation:cp-breath_1.6s_ease-in-out_infinite]" />

        {/* crown */}
        <svg
          viewBox="0 0 32 14"
          className="absolute left-1/2 top-[-7%] h-[15%] w-[54%] -translate-x-1/2 text-amber-500 drop-shadow-sm"
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
        <div className="relative mx-auto mt-[10%] h-[50%] w-[96%] rounded-[30%] bg-white ring-2 ring-amber-500/40 shadow-md">
          {/* eyes */}
          <span
            className="absolute left-[22%] top-[32%] size-[18%] rounded-full bg-amber-900 [animation:cp-eye-blink_3.4s_ease-in-out_infinite] [transform-origin:center]"
          />
          <span
            className="absolute right-[22%] top-[32%] size-[18%] rounded-full bg-amber-900 [animation:cp-eye-blink_3.4s_ease-in-out_infinite] [transform-origin:center]"
          />
          {/* eye sparkles */}
          <span className="absolute left-[27%] top-[36%] size-[5%] rounded-full bg-white" />
          <span className="absolute right-[27%] top-[36%] size-[5%] rounded-full bg-white" />
          {/* cheek blush */}
          <span className="absolute left-[10%] top-[58%] size-[14%] rounded-full bg-amber-300/80 blur-[1px]" />
          <span className="absolute right-[10%] top-[58%] size-[14%] rounded-full bg-amber-300/80 blur-[1px]" />
          {/* smile */}
          <span className="absolute left-1/2 top-[70%] h-[14%] w-[28%] -translate-x-1/2 overflow-hidden rounded-b-full bg-amber-800 [animation:cp-mouth_3.4s_ease-in-out_infinite] [transform-origin:top]">
            <span className="absolute bottom-0 left-1/2 h-[40%] w-[40%] -translate-x-1/2 rounded-full bg-rose-400/80" />
          </span>
        </div>

        {/* body + clipboard */}
        <div className="relative mx-auto mt-[3%] h-[36%] w-[84%] rounded-[22%] bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner ring-1 ring-amber-700/30">
          {/* tie */}
          <span className="absolute left-1/2 -top-[14%] h-[26%] w-[14%] -translate-x-1/2 rounded-t-sm bg-amber-800" />
          <span
            className="absolute left-1/2 top-[12%] size-[18%] -translate-x-1/2 rotate-45 bg-amber-800"
          />
          {/* clipboard */}
          <div className="absolute inset-[16%] rounded-[16%] bg-white/95 p-[10%] shadow-inner">
            <span className="block h-[14%] w-full rounded-full bg-amber-500/70" />
            <span className="mt-[12%] block h-[14%] w-[72%] rounded-full bg-amber-500/50" />
            <span className="mt-[12%] block h-[14%] w-[54%] rounded-full bg-amber-500/40" />
          </div>
        </div>
      </div>

      {/* flying priority tag */}
      <span className="absolute right-[6%] top-[22%] flex h-[7%] w-[24%] items-center justify-center rounded-full bg-amber-500 text-[6px] font-bold text-white shadow-md [animation:cp-tag-land_4.4s_ease-in-out_infinite]">
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
          className="absolute -left-[8%] top-[2%] h-[22%] w-[22%] text-sky-600/90 [animation:cp-spin_5s_linear_infinite]"
          aria-hidden
        >
          <path
            d="M12 2.5 l1.3 2.2 2.4-.5.5 2.4 2.2 1.3-1 2.3 1 2.3-2.2 1.3-.5 2.4-2.4-.5-1.3 2.2-1.3-2.2-2.4.5-.5-2.4-2.2-1.3 1-2.3-1-2.3 2.2-1.3.5-2.4 2.4.5 z"
            fill="currentColor"
          />
          <circle cx="12" cy="12" r="3" fill="#e0f2fe" />
        </svg>

        {/* antenna + bolt light */}
        <span className="absolute left-1/2 top-[-9%] h-[8%] w-[3%] -translate-x-1/2 rounded-full bg-sky-800" />
        <svg
          viewBox="0 0 12 12"
          className="absolute left-1/2 top-[-14%] h-[11%] w-[11%] -translate-x-1/2 text-yellow-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.9)] [animation:cp-breath_1.2s_ease-in-out_infinite]"
          aria-hidden
        >
          <path d="M7 1 L2 7 L5.5 7 L4 11 L10 4 L6.5 4 Z" fill="currentColor" stroke="#ca8a04" strokeWidth="0.6" strokeLinejoin="round" />
        </svg>

        {/* head (helmet) */}
        <div className="relative mx-auto mt-[8%] h-[50%] w-[96%] rounded-[30%] bg-gradient-to-br from-sky-500 to-sky-700 ring-2 ring-sky-900/30 shadow-lg">
          {/* helmet stripe */}
          <span className="absolute inset-x-[6%] top-[10%] h-[10%] rounded-full bg-sky-300/60" />
          {/* visor */}
          <div className="absolute inset-x-[10%] top-[28%] h-[40%] overflow-hidden rounded-[40%] bg-slate-900 ring-2 ring-sky-200/40 shadow-inner">
            {/* scanline */}
            <span className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-sky-300/60 to-transparent [animation:cp-scan_2.4s_linear_infinite]" />
            {/* eyes — two glowing pixels */}
            <span className="absolute left-[22%] top-1/2 size-[22%] -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.9)] [animation:cp-blink_1.8s_steps(2,end)_infinite]" />
            <span className="absolute right-[22%] top-1/2 size-[22%] -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.9)] [animation:cp-blink_1.8s_steps(2,end)_infinite] [animation-delay:0.2s]" />
          </div>
          {/* mouth grill */}
          <div className="absolute left-1/2 top-[76%] flex h-[8%] w-[34%] -translate-x-1/2 items-center justify-around rounded-sm bg-sky-900/80 px-[4%]">
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
              <span className="block h-[14%] w-[72%] rounded-full bg-sky-400/80 [animation:cp-grow_3.2s_ease-in-out_infinite]" style={{ transformOrigin: "left" }} />
              <span className="block h-[14%] w-[54%] rounded-full bg-sky-300/70 [animation:cp-grow_3.2s_ease-in-out_infinite_0.3s]" style={{ transformOrigin: "left" }} />
              <span className="block h-[14%] w-[86%] rounded-full bg-sky-400/80 [animation:cp-grow_3.2s_ease-in-out_infinite_0.6s]" style={{ transformOrigin: "left" }} />
            </div>
          </div>
        </div>

        {/* wrench — wiggles in right hand */}
        <div className="absolute right-[-14%] top-[48%] h-[30%] w-[26%] origin-bottom [animation:cp-wiggle_1.6s_ease-in-out_infinite]">
          <svg viewBox="0 0 24 64" className="h-full w-full text-slate-400 drop-shadow-sm" aria-hidden>
            <rect x="9" y="12" width="6" height="42" rx="3" fill="currentColor" />
            <path
              d="M12 2 L18 6 L18 12 L15 14 L15 20 L9 20 L9 14 L6 12 L6 6 Z"
              fill="currentColor"
              stroke="#334155"
              strokeWidth="0.8"
            />
            <rect x="9" y="54" width="6" height="6" rx="1.4" fill="#334155" />
          </svg>
          {/* spark */}
          <span className="absolute -left-[30%] top-[4%] h-[8%] w-[14%] rounded-full bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.9)] [animation:cp-spark_1.6s_ease-in-out_infinite]" />
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
        <span className="absolute left-1/2 top-[-10%] h-[10%] w-[3%] -translate-x-1/2 rounded-full bg-emerald-700" />
        <span className="absolute left-1/2 top-[-17%] grid size-[16%] -translate-x-1/2 place-items-center rounded-full bg-emerald-500 shadow-md ring-2 ring-white [animation:cp-breath_1.6s_ease-in-out_infinite]">
          <svg viewBox="0 0 24 24" className="size-[70%]" fill="none" aria-hidden>
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
        <span className="absolute left-[-6%] top-[30%] size-[16%] rounded-full bg-emerald-500 ring-2 ring-white" />
        <span className="absolute right-[-6%] top-[30%] size-[16%] rounded-full bg-emerald-500 ring-2 ring-white" />

        {/* head */}
        <div className="relative mx-auto mt-[10%] h-[50%] w-[96%] rounded-[34%] bg-white ring-2 ring-emerald-500/40 shadow-md">
          {/* forehead badge */}
          <span className="absolute left-1/2 top-[8%] h-[10%] w-[30%] -translate-x-1/2 rounded-full bg-emerald-500/15 text-center text-[6px] font-mono font-bold leading-[1.6] text-emerald-700">
            QA
          </span>
          {/* eyes (happy curves) */}
          <svg
            viewBox="0 0 40 16"
            className="absolute left-[18%] top-[36%] h-[14%] w-[20%] text-emerald-800 [animation:cp-eye-blink_3.2s_ease-in-out_infinite] [transform-origin:center]"
            aria-hidden
            fill="none"
          >
            <path d="M4 12 Q20 -2 36 12" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <svg
            viewBox="0 0 40 16"
            className="absolute right-[18%] top-[36%] h-[14%] w-[20%] text-emerald-800 [animation:cp-eye-blink_3.2s_ease-in-out_infinite] [transform-origin:center]"
            aria-hidden
            fill="none"
          >
            <path d="M4 12 Q20 -2 36 12" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
          {/* blush */}
          <span className="absolute left-[12%] top-[58%] size-[12%] rounded-full bg-emerald-300/80 blur-[1px]" />
          <span className="absolute right-[12%] top-[58%] size-[12%] rounded-full bg-emerald-300/80 blur-[1px]" />
          {/* smile */}
          <span className="absolute left-1/2 top-[70%] h-[12%] w-[22%] -translate-x-1/2 rounded-b-full bg-emerald-700 [animation:cp-mouth_3.2s_ease-in-out_infinite] [transform-origin:top]" />
        </div>

        {/* body with beaker */}
        <div className="relative mx-auto mt-[3%] h-[36%] w-[82%] rounded-[22%] bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-inner ring-1 ring-emerald-700/30">
          {/* pocket */}
          <span className="absolute left-[12%] top-[18%] h-[24%] w-[28%] rounded-[18%] bg-emerald-100/60 ring-1 ring-emerald-700/20" />
          {/* beaker */}
          <div className="absolute right-[10%] top-[14%] h-[68%] w-[34%]">
            {/* neck */}
            <span className="absolute left-1/2 top-0 h-[16%] w-[40%] -translate-x-1/2 rounded-t-sm bg-white/95 ring-1 ring-emerald-700/30" />
            {/* flask */}
            <div className="absolute bottom-0 left-0 right-0 h-[86%] overflow-hidden rounded-[22%_22%_30%_30%] bg-white/95 ring-1 ring-emerald-700/30 shadow-inner">
              <span className="absolute inset-x-0 bottom-0 h-[55%] bg-emerald-400/80" />
              {/* bubbles */}
              <span className="absolute bottom-[20%] left-[25%] size-[14%] rounded-full bg-white [animation:cp-bubble_2.2s_ease-in-out_infinite]" />
              <span className="absolute bottom-[10%] left-[55%] size-[18%] rounded-full bg-white [animation:cp-bubble_2.6s_ease-in-out_infinite_0.6s]" />
              <span className="absolute bottom-[30%] left-[40%] size-[10%] rounded-full bg-white [animation:cp-bubble_1.8s_ease-in-out_infinite_0.3s]" />
            </div>
          </div>
        </div>

        {/* magnifier swinging */}
        <div className="absolute left-[-18%] top-[52%] h-[34%] w-[34%] origin-top-right [animation:cp-swing_2.8s_ease-in-out_infinite]">
          <span className="absolute right-[10%] bottom-[6%] h-[48%] w-[10%] rotate-[40deg] rounded-full bg-slate-500" />
          <span className="absolute left-[0%] top-[0%] size-[64%] rounded-full bg-emerald-200/40 ring-[4px] ring-slate-500 shadow-inner">
            <span className="absolute inset-[15%] rounded-full bg-white/70" />
          </span>
        </div>
      </div>

      {/* radar ping */}
      <span className="pointer-events-none absolute right-[14%] top-[12%] size-[7%] rounded-full border border-emerald-500/70 [animation:cp-ping-soft_2.6s_ease-out_infinite]" />
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
    accent: string
    dot: string
    ring: string
    chip: string
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
    accent: "text-amber-700",
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
    chip: "bg-amber-500/10 text-amber-700",
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
    accent: "text-sky-700",
    dot: "bg-sky-500",
    ring: "ring-sky-500/30",
    chip: "bg-sky-500/10 text-sky-700",
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
    accent: "text-emerald-700",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    chip: "bg-emerald-500/10 text-emerald-700",
  },
}
