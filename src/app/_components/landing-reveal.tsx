"use client"

import type { PropsWithChildren } from "react"
import { useRef } from "react"

import { motion, useInView, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

export function LandingReveal({
  children,
  delay = 0,
  className,
}: PropsWithChildren<{
  delay?: number
  className?: string
}>) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, {
    once: true,
    amount: 0.12,
    margin: "0px 0px -40px 0px",
  })
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={reduceMotion || inView ? { opacity: 1, y: 0 } : undefined}
      transition={{
        duration: 0.55,
        delay: delay / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
