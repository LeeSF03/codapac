"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { AGENTS, AgentKey, AgentOrb } from "@/components/agent-orb"
import { CodapacLogo } from "@/components/codapac-logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValid || sending) return
    setSending(true)
    const params = new URLSearchParams({ email })
    router.push(`/sign-in/verify?${params.toString()}`)
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <ContourBackdrop />

      {/* Floating back button + logo */}
      <div className="relative z-20 mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 pt-5">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-px hover:border-foreground/30 hover:shadow-md"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to home
        </Link>

        <CodapacLogo size="sm" />
      </div>

      <main className="relative z-10 mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 items-center gap-8 overflow-hidden px-6 py-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        {/* Left: headline + bot constellation */}
        <section className="hidden h-full min-h-0 flex-col justify-center gap-6 lg:flex">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Meet the squad
            </p>
            <h1 className="mt-2 max-w-xl text-[40px] font-semibold leading-[1.05] tracking-tight">
              Your autonomous engineering team,{" "}
              <span className="text-muted-foreground">waiting on a sign in.</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-amber-700">BOSS</span> scopes the issue,{" "}
              <span className="font-semibold text-sky-700">FIXER</span> welds the patch,{" "}
              <span className="font-semibold text-emerald-700">TESTEES</span> proves it green — from one board, one chat.
            </p>
          </div>

          <BotConstellation />
        </section>

        {/* Right: sign-in card */}
        <section className="flex h-full items-center justify-center overflow-hidden">
          <Card className="w-full max-w-md rounded-2xl border-border bg-card/90 p-7 shadow-xl ring-1 ring-foreground/5 backdrop-blur-md">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in to codapac</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll email you a one-time code — no password needed.
            </p>

            <div className="mt-5 grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 justify-center gap-2 font-medium transition-all hover:-translate-y-px hover:shadow-sm"
              >
                <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" />
                  <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a23.93 23.93 0 0 0 0 21.56l7.98-6.19Z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
                </svg>
                Continue with Google
              </Button>
            </div>

            <div className="my-4 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                or with email
              </span>
              <Separator className="flex-1" />
            </div>

            <form onSubmit={handleSendOtp} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                  required
                />
              </div>

              <Button
                type="submit"
                className="h-10 font-medium transition-all hover:-translate-y-px"
                disabled={!emailValid || sending}
              >
                {sending ? "Sending code…" : "Send one-time code"}
              </Button>
            </form>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              By signing in you agree to our{" "}
              <a href="/terms" className="underline-offset-4 hover:underline">Terms</a>{" "}
              and{" "}
              <a href="/privacy" className="underline-offset-4 hover:underline">Privacy</a>.
            </p>
          </Card>
        </section>
      </main>
    </div>
  )
}

/* ───────────────────── Contour backdrop ─────────────────────
   Two slowly rotating clusters of topographic-style rings plus
   a soft radial wash and a faint dot grid. All `pointer-events-none`. */
function ContourBackdrop() {
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

      {/* emerald contour cluster, middle-right (smaller, subtler) */}
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

      {/* faint dot grid with soft vignette mask */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]">
        <div className="h-full w-full opacity-[0.08] [background-image:radial-gradient(circle,_currentColor_1px,_transparent_1.5px)] [background-size:26px_26px] text-foreground" />
      </div>
    </>
  )
}

/* ───────────────────── Bot constellation ─────────────────────
   The three bots positioned as nodes connected by flowing dashed
   curves. Small colored packets travel along each edge via SMIL. */
function BotConstellation() {
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
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* twinkling background dots */}
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

        {/* flowing connections */}
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

        {/* traveling packets */}
        <g filter="url(#soft-glow)">
          <circle r="5" fill="#f59e0b">
            <animateMotion dur="3.2s" repeatCount="indefinite" path="M 140 120 Q 320 40 460 160" />
          </circle>
          <circle r="5" fill="#0ea5e9">
            <animateMotion dur="3.6s" repeatCount="indefinite" path="M 460 160 Q 540 320 320 380" />
          </circle>
          <circle r="5" fill="#10b981">
            <animateMotion dur="4s" repeatCount="indefinite" path="M 320 380 Q 100 320 140 120" />
          </circle>
        </g>

        {/* handoff labels on the curves */}
        <g
          className="font-mono"
          fontSize="10"
          fill="currentColor"
          textAnchor="middle"
        >
          <text x="300" y="62" className="text-amber-700/80">issue → spec</text>
          <text x="520" y="280" className="text-sky-700/80">spec → patch</text>
          <text x="110" y="260" className="text-emerald-700/80" transform="rotate(-12 110 260)">
            patch → tests
          </text>
        </g>
      </svg>

      {/* bot nodes */}
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
        {/* outer expanding ring */}
        <span
          className={`pointer-events-none absolute size-[130%] rounded-full border ${a.ring.replace("ring-", "border-")} [animation:cp-ping-soft_3.4s_ease-out_infinite]`}
        />
        {/* soft backdrop halo */}
        <span
          className="pointer-events-none absolute size-[115%] rounded-full blur-xl opacity-40"
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
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-bold tracking-wide shadow-sm ring-1 ring-border ${a.accent}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
          {a.name}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {a.role} · {a.title}
        </span>
      </div>
    </div>
  )
}
