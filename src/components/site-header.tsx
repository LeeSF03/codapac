"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { clearFakeSession, useFakeSession } from "@/lib/fake-auth"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const pathname = usePathname()
  const { data: session, isPending } = authClient.useSession()
  const fake = useFakeSession()
  const signedIn = (!isPending && !!session) || !!fake

  return (
    <header
      className={cn(
        "shrink-0",
        signedIn
          ? "bg-neutral-950 text-white"
          : "border-b border-border bg-background text-foreground",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1500px] items-center gap-4 px-6 py-3">
        <Link
          href={signedIn ? "/dashboard" : "/"}
          className="flex shrink-0 items-center gap-2"
        >
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
            C
          </div>
          <span
            className={cn(
              "text-[15px] font-bold tracking-tight",
              signedIn ? "text-white" : "text-foreground",
            )}
          >
            codapac
          </span>
        </Link>

        <div className="flex-1" />

        <div className="flex shrink-0 items-center gap-2">
          {signedIn ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "text-white/80 hover:bg-white/10 hover:text-white",
                  (pathname.startsWith("/dashboard") ||
                    pathname.startsWith("/issues")) &&
                    "bg-white/10 text-white hover:bg-white/20",
                )}
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserMenu />
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
                  pathname.startsWith("/agents") &&
                    "bg-foreground/5 text-foreground hover:bg-foreground/10",
                )}
              >
                <Link href="/agents">Agents</Link>
              </Button>
              <Button asChild size="sm" className="shadow-sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function UserMenu() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const fake = useFakeSession()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (ev: MouseEvent) => {
      if (!wrapperRef.current?.contains(ev.target as Node)) setOpen(false)
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const realUser = session?.user as
    | { email?: string | null; name?: string | null; image?: string | null }
    | undefined
  const user: {
    email?: string | null
    name?: string | null
    image?: string | null
  } | undefined = realUser ?? fake?.user
  const email = user?.email ?? ""
  const displayName =
    user?.name?.trim() || (email ? email.split("@")[0] : "") || "you"
  const initials =
    displayName
      .split(/[ ._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      clearFakeSession()
      if (session) {
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/")
              router.refresh()
            },
          },
        })
      } else {
        router.push("/")
        router.refresh()
      }
    } finally {
      setSigningOut(false)
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white/5 p-0.5 pr-2 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10"
      >
        <Avatar size="sm" className="ring-1 ring-white/20">
          {user?.image ? (
            <AvatarImage src={user.image} alt={displayName} />
          ) : null}
          <AvatarFallback className="bg-white/10 text-[10px] font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[140px] truncate text-[12.5px] font-medium text-white/80 md:inline">
          {displayName}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xl [animation:cp-fade-up_0.18s_ease-out]"
        >
          <div className="border-b border-border px-3 py-2">
            <div className="text-[13px] font-semibold tracking-tight">
              {displayName}
            </div>
            {email && (
              <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                {email}
              </div>
            )}
          </div>
          <div className="p-1">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
