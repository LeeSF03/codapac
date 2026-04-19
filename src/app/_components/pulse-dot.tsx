"use client"

import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

export function PulseDot({
  className,
  duration = 2,
  scale = 1.06,
}: {
  className?: string
  duration?: number
  scale?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.span
      aria-hidden
      className={cn("block rounded-full", className)}
      animate={
        reduceMotion
          ? undefined
          : {
              scale: [1, scale, 1],
              opacity: [0.88, 1, 0.88],
            }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              duration,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }
      }
    />
  )
}
