import { AgentKey } from "@/components/agent-orb"
import { cn } from "@/lib/utils"

const theme: Record<AgentKey, { bg: string; ring: string }> = {
  priya: {
    bg: "bg-gradient-to-br from-amber-400 to-amber-600",
    ring: "ring-amber-500/30",
  },
  enzo: {
    bg: "bg-gradient-to-br from-sky-400 to-sky-600",
    ring: "ring-sky-500/30",
  },
  quinn: {
    bg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    ring: "ring-emerald-500/30",
  },
}

/**
 * Small, uniform avatar-style badge for each agent. Renders a distinctive SVG
 * glyph instead of the generic "P / E / Q" letter fallback.
 */
export function AgentBadge({
  agent,
  size = 28,
  ring,
  className,
}: {
  agent: AgentKey
  size?: number
  ring?: boolean
  className?: string
}) {
  const t = theme[agent]
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full text-white shadow-xs",
        t.bg,
        ring && `ring-2 ring-offset-2 ring-offset-card ${t.ring}`,
        className,
      )}
    >
      <AgentMark agent={agent} className="h-[55%] w-[55%]" />
    </span>
  )
}

/** Just the glyph, no circle. Useful inline or on custom backgrounds. */
export function AgentMark({
  agent,
  className,
}: {
  agent: AgentKey
  className?: string
}) {
  if (agent === "priya") return <PriyaMark className={className} />
  if (agent === "enzo") return <EnzoMark className={className} />
  return <QuinnMark className={className} />
}

/* BOSS — tiny crowned robot head. Crown on top, two eye dots, a smile. */
function PriyaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      {/* crown */}
      <path
        d="M5 6 L7 3 L12 5.5 L17 3 L19 6 Z"
        fill="currentColor"
      />
      {/* head */}
      <rect x="4.5" y="7" width="15" height="12" rx="4" fill="currentColor" />
      {/* eyes */}
      <circle cx="9" cy="12.5" r="1.4" fill="white" />
      <circle cx="15" cy="12.5" r="1.4" fill="white" />
      {/* smile */}
      <path
        d="M9.5 15.8 Q12 17.5 14.5 15.8"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/* FIXER — mechanic bot head with visor slit and wrench below. */
function EnzoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      {/* antenna bolt */}
      <path d="M13 2.5 L10.5 6 L12.5 6 L11 9 L14 5 L12 5 Z" fill="currentColor" />
      {/* head */}
      <rect x="4" y="6" width="16" height="11" rx="4.5" fill="currentColor" />
      {/* visor */}
      <rect x="6.5" y="9" width="11" height="4" rx="2" fill="#0f172a" />
      {/* eye pixels */}
      <circle cx="9.5" cy="11" r="0.9" fill="#7dd3fc" />
      <circle cx="14.5" cy="11" r="0.9" fill="#7dd3fc" />
      {/* wrench */}
      <path
        d="M7 21 L13 15 M12.2 14.2 a2 2 0 1 1 2.6 2.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/* TESTEES — lab bot head with headphone ears and a happy check mouth. */
function QuinnMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      {/* earmuffs */}
      <circle cx="4" cy="13" r="2" fill="currentColor" />
      <circle cx="20" cy="13" r="2" fill="currentColor" />
      {/* head */}
      <rect x="5.5" y="6" width="13" height="13" rx="5" fill="currentColor" />
      {/* happy eyes */}
      <path
        d="M8.5 12.5 Q10 10.5 11.5 12.5"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12.5 12.5 Q14 10.5 15.5 12.5"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      {/* check mouth */}
      <path
        d="M9.5 15.5 L11.2 17 L14.5 14.2"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
