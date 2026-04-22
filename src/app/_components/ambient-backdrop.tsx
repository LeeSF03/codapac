"use client"

import type { ReactNode } from "react"

import { motion, useReducedMotion } from "motion/react"

function OrbitContours({
  className,
  duration,
  rotate,
  ellipses,
}: {
  className: string
  duration: number
  rotate: number
  ellipses: ReactNode
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      aria-hidden
      className={className}
      animate={reduceMotion ? undefined : { rotate }}
      transition={
        reduceMotion
          ? undefined
          : {
              duration,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }
      }
      style={{ transformOrigin: "50% 50%" }}
    >
      <svg viewBox="0 0 800 800" className="h-full w-full">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          {ellipses}
        </g>
      </svg>
    </motion.div>
  )
}

export function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Light-mode radial wash */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.08),transparent_55%),radial-gradient(circle_at_12%_60%,rgba(14,165,233,0.06),transparent_55%),radial-gradient(circle_at_60%_95%,rgba(16,185,129,0.05),transparent_65%)] dark:hidden" />

      {/* Dark-mode radial wash — stronger alpha so it actually reads */}
      <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.22),transparent_55%),radial-gradient(circle_at_12%_60%,rgba(14,165,233,0.18),transparent_55%),radial-gradient(circle_at_60%_95%,rgba(16,185,129,0.14),transparent_65%)] dark:block" />

      <OrbitContours
        className="absolute -top-[10%] -right-[20%] h-[90%] w-[70%] text-amber-500/20 dark:text-amber-400/35"
        duration={120}
        rotate={360}
        ellipses={Array.from({ length: 10 }).map((_, i) => (
          <ellipse
            key={i}
            cx="400"
            cy="400"
            rx={80 + i * 28}
            ry={64 + i * 22}
            transform={`rotate(${i * 5} 400 400)`}
            opacity={Math.max(0.1, 0.8 - i * 0.07)}
          />
        ))}
      />

      <OrbitContours
        className="absolute -bottom-[10%] -left-[20%] h-[90%] w-[70%] text-sky-500/15 dark:text-sky-400/30"
        duration={180}
        rotate={-360}
        ellipses={Array.from({ length: 9 }).map((_, i) => (
          <ellipse
            key={i}
            cx="400"
            cy="400"
            rx={90 + i * 34}
            ry={72 + i * 26}
            transform={`rotate(${-i * 6} 400 400)`}
            opacity={Math.max(0.1, 0.7 - i * 0.07)}
          />
        ))}
      />

      <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_85%)]">
        <div className="text-foreground h-full w-full [background-image:radial-gradient(circle,_currentColor_1px,_transparent_1.5px)] [background-size:28px_28px] opacity-[0.06] dark:opacity-[0.12]" />
      </div>
    </div>
  )
}
