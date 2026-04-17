"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Small wrapper that fades + translates its children in the first time they
 * cross the viewport. Falls back to immediate visibility when
 * `prefers-reduced-motion` is set or when IntersectionObserver is missing.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode
  /** Delay in milliseconds before the reveal animation starts. */
  delay?: number
  className?: string
  as?: "div" | "section" | "article"
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduced || typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
      data-visible={visible ? "true" : undefined}
      className={cn(
        "opacity-0 will-change-[opacity,transform]",
        visible && "[animation:cp-fade-up_0.55s_ease-out_forwards]",
        className,
      )}
    >
      {children}
    </Tag>
  )
}
