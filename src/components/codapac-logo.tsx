import type { Route } from "next"
import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * Codapac brand mark.
 * An isometric "pac" cube — three rhombus faces in light/mid/dark tones —
 * sitting inside a softly-glowing rounded tile. Directly evokes a package,
 * which fits the "pac" in codapac.
 *
 * Wrap in an element with the `group` class to get the hover tilt/glow.
 */
export function CodapacMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid h-10 w-10 place-items-center rounded-[14px] transition-all duration-300",
        "bg-gradient-to-br from-primary via-primary to-primary/70",
        "shadow-[0_6px_20px_-6px] shadow-primary/40 ring-1 ring-inset ring-black/5",
        "group-hover:shadow-[0_10px_28px_-6px] group-hover:shadow-primary/60",
        "dark:ring-white/10",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[14px] bg-gradient-to-tr from-white/0 via-white/10 to-white/30 opacity-60"
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="relative h-[22px] w-[22px] text-primary-foreground transition-transform duration-300 group-hover:-rotate-3"
        aria-hidden
      >
        <path
          d="M12 2.6 L21 7.2 L12 11.8 L3 7.2 Z"
          fill="currentColor"
          fillOpacity="0.95"
        />
        <path
          d="M3 7.2 L3 16.4 L12 21 L12 11.8 Z"
          fill="currentColor"
          fillOpacity="0.55"
        />
        <path
          d="M21 7.2 L21 16.4 L12 21 L12 11.8 Z"
          fill="currentColor"
          fillOpacity="0.78"
        />
        <path
          d="M3 7.2 L12 11.8 L21 7.2"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 11.8 L12 21"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="0.6"
        />
      </svg>
    </span>
  )
}

/**
 * Codapac wordmark — "CODA" (light) + "PAC" (black) + accent dot.
 * Use inside an element with `group` to inherit the mark's hover behavior.
 */
export function CodapacWordmark({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClass =
    size === "sm"
      ? "text-[16px] tracking-[0.14em]"
      : size === "lg"
        ? "text-[22px] tracking-[0.14em]"
        : "text-[20px] tracking-[0.14em]"
  return (
    <span
      className={cn(
        "flex items-baseline leading-none text-foreground",
        sizeClass,
        className,
      )}
    >
      <span className="font-light opacity-70">CODA</span>
      <span className="font-black">PAC</span>
      <span
        aria-hidden
        className="ml-1 h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-primary shadow-[0_0_10px] shadow-primary/60"
      />
    </span>
  )
}

/**
 * Full Codapac brand lockup (mark + wordmark) wrapped in a Next.js `Link`.
 * Drop this anywhere you previously rendered the "C tile + codapac" logo.
 */
export function CodapacLogo({
  href = "/",
  className,
  size = "md",
  ariaLabel = "codapac home",
}: {
  href?: string
  className?: string
  size?: "sm" | "md" | "lg"
  ariaLabel?: string
}) {
  return (
    <Link
      href={href as Route}
      aria-label={ariaLabel}
      className={cn(
        "group flex shrink-0 items-center gap-3 transition-transform hover:-translate-y-px",
        className,
      )}
    >
      <CodapacMark
        className={cn(
          size === "sm" && "h-8 w-8 rounded-[12px]",
          size === "lg" && "h-11 w-11 rounded-[16px]",
        )}
      />
      <CodapacWordmark size={size} />
    </Link>
  )
}
