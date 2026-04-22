"use client"

import {
  AGENTS,
  AgentKey,
  AgentName,
  AgentNodeRing,
  AgentOrb,
  AgentStatusDot,
} from "@/components/agent-orb"

export function ContourBackdrop() {
  return (
    <>
      {/* warm radial wash */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(245,158,11,0.10),transparent_55%),radial-gradient(circle_at_18%_82%,rgba(14,165,233,0.07),transparent_55%),radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)]" />

      {/* amber contour cluster, top-right */}
      <svg
        aria-hidden
        viewBox="0 0 800 800"
        className="pointer-events-none absolute -right-[25%] -top-[40%] h-[130%] w-[85%] text-amber-500/30 [animation:cp-orbit_90s_linear_infinite]"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 14 }).map((_, i) => (
            <ellipse
              key={i}
              cx="400"
              cy="400"
              rx={60 + i * 28}
              ry={48 + i * 22}
              transform={`rotate(${i * 4} 400 400)`}
              opacity={Math.max(0.15, 0.95 - i * 0.06)}
            />
          ))}
        </g>
      </svg>

      {/* sky contour cluster, bottom-left */}
      <svg
        aria-hidden
        viewBox="0 0 800 800"
        className="pointer-events-none absolute -bottom-[40%] -left-[25%] h-[130%] w-[85%] text-sky-500/20 [animation:cp-orbit-reverse_120s_linear_infinite]"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 12 }).map((_, i) => (
            <ellipse
              key={i}
              cx="400"
              cy="400"
              rx={70 + i * 32}
              ry={56 + i * 26}
              transform={`rotate(${-i * 5} 400 400)`}
              opacity={Math.max(0.12, 0.85 - i * 0.06)}
            />
          ))}
        </g>
      </svg>

      {/* emerald contour cluster, middle-right */}
      <svg
        aria-hidden
        viewBox="0 0 600 600"
        className="pointer-events-none absolute top-[30%] right-[-10%] h-[60%] w-[40%] text-emerald-500/15 [animation:cp-orbit_150s_linear_infinite]"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <ellipse
              key={i}
              cx="300"
              cy="300"
              rx={40 + i * 26}
              ry={32 + i * 20}
              transform={`rotate(${i * 7} 300 300)`}
              opacity={Math.max(0.15, 0.8 - i * 0.07)}
            />
          ))}
        </g>
      </svg>

      {/* faint dot grid with soft vignette */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]">
        <div className="h-full w-full text-foreground opacity-[0.08] [background-image:radial-gradient(circle,_currentColor_1px,_transparent_1.5px)] [background-size:26px_26px]" />
      </div>
    </>
  )
}

export function BotConstellation() {
  const nodes: {
    agent: AgentKey
    top: string
    left: string
  }[] = [
    { agent: "priya", top: "25%", left: "23.333%" },
    { agent: "enzo", top: "33.333%", left: "76.667%" },
    { agent: "quinn", top: "79.167%", left: "53.333%" },
  ]

  return (
    <div className="relative mx-auto aspect-[600/480] w-full max-w-[640px]">
      <svg
        viewBox="0 0 600 480"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <linearGradient id="flow-amber-sky" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <linearGradient id="flow-sky-emerald" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="flow-emerald-amber" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter
            id="soft-glow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g fill="currentColor" className="text-muted-foreground">
          {Array.from({ length: 32 }).map((_, i) => {
            const x = (i * 83 + 40) % 600
            const y = (i * 47 + 31) % 480
            const delay = (i % 7) * 0.4
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i % 5 === 0 ? 1.6 : 1}
                style={{ animationDelay: `${delay}s` }}
                className="[animation:cp-twinkle_4s_ease-in-out_infinite]"
              />
            )
          })}
        </g>

        <path
          d="M 140 120 Q 320 40 460 160"
          fill="none"
          stroke="url(#flow-amber-sky)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 10"
          className="[animation:cp-dash-flow_3.2s_linear_infinite]"
        />
        <path
          d="M 460 160 Q 540 320 320 380"
          fill="none"
          stroke="url(#flow-sky-emerald)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 10"
          className="[animation:cp-dash-flow_3.6s_linear_infinite]"
        />
        <path
          d="M 320 380 Q 100 320 140 120"
          fill="none"
          stroke="url(#flow-emerald-amber)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 10"
          className="[animation:cp-dash-flow_4s_linear_infinite]"
        />

        <g filter="url(#soft-glow)">
          <circle r="5" fill="#f59e0b">
            <animateMotion
              dur="3.2s"
              repeatCount="indefinite"
              path="M 140 120 Q 320 40 460 160"
            />
          </circle>
          <circle r="5" fill="#0ea5e9">
            <animateMotion
              dur="3.6s"
              repeatCount="indefinite"
              path="M 460 160 Q 540 320 320 380"
            />
          </circle>
          <circle r="5" fill="#10b981">
            <animateMotion
              dur="4s"
              repeatCount="indefinite"
              path="M 320 380 Q 100 320 140 120"
            />
          </circle>
        </g>

        <g
          className="font-mono"
          fontSize="10"
          fill="currentColor"
          textAnchor="middle"
        >
          <text x="300" y="62" className="text-amber-700/80">
            issue → spec
          </text>
          <text x="520" y="280" className="text-sky-700/80">
            spec → patch
          </text>
          <text
            x="110"
            y="260"
            className="text-emerald-700/80"
            transform="rotate(-12 110 260)"
          >
            patch → tests
          </text>
        </g>
      </svg>

      {nodes.map((n) => (
        <BotNode key={n.agent} agent={n.agent} top={n.top} left={n.left} />
      ))}
    </div>
  )
}

function BotNode({
  agent,
  top,
  left,
}: {
  agent: AgentKey
  top: string
  left: string
}) {
  const a = AGENTS[agent]
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ top, left }}
    >
      <div className="relative grid place-items-center">
        <AgentNodeRing
          agent={agent}
          className="pointer-events-none absolute size-[130%] rounded-full border [animation:cp-ping-soft_3.4s_ease-out_infinite]"
        />
        <span
          className="pointer-events-none absolute size-[115%] rounded-full opacity-40 blur-xl"
          style={{
            background:
              agent === "priya"
                ? "radial-gradient(circle, #f59e0b 0%, transparent 70%)"
                : agent === "enzo"
                  ? "radial-gradient(circle, #0ea5e9 0%, transparent 70%)"
                  : "radial-gradient(circle, #10b981 0%, transparent 70%)",
          }}
        />
        <AgentOrb agent={agent} size={120} />
      </div>

      <div className="mt-3 grid place-items-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-bold tracking-wide shadow-sm ring-1 ring-border">
          <AgentStatusDot agent={agent} className="h-1.5 w-1.5 rounded-full" />
          <AgentName agent={agent}>{a.name}</AgentName>
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {a.role} · {a.title}
        </span>
      </div>
    </div>
  )
}
