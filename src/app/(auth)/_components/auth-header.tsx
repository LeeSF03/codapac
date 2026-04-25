"use client"

import { useEffect, useState } from "react"

import Link from "next/link"

import { useTheme } from "next-themes"

import { CodapacLogo } from "@/components/codapac-logo"

export function AuthHeader() {
  return (
    <header className="relative z-20 shrink-0">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 pt-5">
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

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <CodapacLogo size="sm" />
        </div>
      </div>
    </header>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-card/80 text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-px hover:border-foreground/30 hover:shadow-md"
    >
      <svg
        viewBox="0 0 24 24"
        className={`absolute size-4 transition-all duration-300 ${
          isDark
            ? "-rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className={`absolute size-4 transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  )
}
