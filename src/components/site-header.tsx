"use client"

import { useEffect, useRef, useState } from "react"

import type { Route } from "next"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { useTheme } from "next-themes"

import { CodapacLogo } from "@/components/codapac-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type NavItem = {
  href: Route
  label: string
  match: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/project" as Route,
    label: "Projects",
    match: (p) => p === "/project" || p.startsWith("/project/"),
  },
  {
    href: "/dashboard" as Route,
    label: "Dashboard",
    match: (p) => p.startsWith("/dashboard"),
  },
  {
    href: "/chat" as Route,
    label: "Chat",
    match: (p) => p.startsWith("/chat"),
  },
  {
    href: "/issues/1" as Route,
    label: "Issues",
    match: (p) => p.startsWith("/issues"),
  },
]

export function SiteHeader() {
  const pathname = usePathname() ?? ""
  const { data: session, isPending } = authClient.useSession()
  const signedIn = !!session && !isPending

  return (
    <header className="border-border/60 bg-background/80 text-foreground supports-[backdrop-filter]:bg-background/60 shrink-0 border-b backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
        <CodapacLogo href="/" />

        {signedIn ? (
          <nav className="ml-2 hidden flex-1 items-center gap-0.5 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={active}
                  className="relative rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground"
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-2">
          {signedIn ? (
            <UserMenu session={session} />
          ) : (
            <>
              <Link
                href={"/agents" as Route}
                data-active={pathname.startsWith("/agents")}
                className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground"
              >
                Agents
              </Link>
              <ThemeIconButton />
              <Button asChild size="sm">
                <Link href={"/sign-in" as Route}>Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {signedIn ? <MobileNav pathname={pathname} /> : null}
    </header>
  )
}

/* ─────────────── Mobile nav (sm screens) ─────────────── */

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="border-border/60 flex gap-0.5 overflow-x-auto border-t px-3 py-1.5 md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active}
            className="shrink-0 rounded-lg px-3 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground"
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/* ─────────────── User avatar menu ─────────────── */

type SessionUser = {
  email?: string | null
  name?: string | null
  image?: string | null
}

function UserMenu({
  session,
}: {
  session: { user?: SessionUser | null } | null | undefined
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const user = (session?.user ?? null) as SessionUser | null
  const email = user?.email ?? ""
  const displayName =
    user?.name?.trim() || (email ? email.split("@")[0] : "") || "you"
  const username = email ? email.split("@")[0] : "you"
  const initials =
    displayName
      .split(/[ ._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setOpen(false)
            router.push("/")
            router.refresh()
          },
        },
      })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-all",
          "hover:bg-muted/60",
          open && "bg-muted/60",
        )}
      >
        <span className="relative">
          <Avatar className="size-8 ring-1 ring-border transition-[box-shadow,ring-color] group-hover:ring-foreground/20">
            {user?.image ? (
              <AvatarImage src={user.image} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-muted text-[11px] font-semibold text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-card bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
        </span>
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-in fade-in-0 zoom-in-95 absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-xl ring-1 ring-foreground/5"
        >
          <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-3">
            <Avatar className="size-11 ring-1 ring-border">
              {user?.image ? (
                <AvatarImage src={user.image} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-muted text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold tracking-tight">
                {displayName}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                @{username}
              </p>
              {email ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  {email}
                </p>
              ) : null}
            </div>
          </div>

          <div className="py-1">
            <MenuLink
              href={"/profile" as Route}
              label="Your profile"
              hint="View & edit"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              }
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href={"/project" as Route}
              label="Your projects"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 9h18" />
                </svg>
              }
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href={"/dashboard" as Route}
              label="Dashboard"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="3" width="7" height="9" />
                  <rect x="14" y="3" width="7" height="5" />
                  <rect x="14" y="12" width="7" height="9" />
                  <rect x="3" y="16" width="7" height="5" />
                </svg>
              }
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href={"/chat" as Route}
              label="Squad chat"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              onClick={() => setOpen(false)}
            />
          </div>

          <div className="border-t border-border p-1.5">
            <ThemeSwitcher />
          </div>

          <div className="border-t border-border p-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:hover:bg-rose-950/30"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MenuLink({
  href,
  label,
  hint,
  icon,
  onClick,
}: {
  href: Route
  label: string
  hint?: string
  icon: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-foreground/90 transition-colors hover:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint ? (
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </Link>
  )
}

/* ─────────────── Theme switcher (light / dark / system) ─────────────── */

function ThemeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme()
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
      aria-label="Toggle dark mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-foreground/90 transition-colors hover:bg-muted"
    >
      <span className="text-muted-foreground">
        {isDark ? (
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="size-4"
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
        )}
      </span>
      <span className="flex-1">Dark mode</span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          isDark ? "bg-foreground" : "bg-muted ring-1 ring-inset ring-border",
        )}
      >
        <span
          className={cn(
            "inline-flex size-4 items-center justify-center rounded-full bg-card shadow-sm transition-transform",
            isDark ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        >
          {isDark ? (
            <svg
              viewBox="0 0 24 24"
              className="size-2.5 text-foreground"
              fill="currentColor"
              aria-hidden
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="size-2.5 text-amber-500"
              fill="currentColor"
              aria-hidden
            >
              <circle cx="12" cy="12" r="5" />
            </svg>
          )}
        </span>
      </span>
    </button>
  )
}

/* ─────────── Compact theme icon button (signed-out header) ─────────── */

function ThemeIconButton() {
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
      className="relative inline-flex size-8 items-center justify-center overflow-hidden rounded-full border border-border bg-card/60 text-foreground transition-all duration-200 hover:-translate-y-px hover:border-foreground/30 hover:bg-card hover:shadow-sm"
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(
          "absolute size-3.5 transition-all duration-300",
          isDark
            ? "-rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100",
        )}
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
        className={cn(
          "absolute size-3.5 transition-all duration-300",
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0",
        )}
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
