"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NavItem = { label: string; href: "/" | "/agents" }

const NAV: NavItem[] = [
  { label: "Board", href: "/" },
  { label: "Agents", href: "/agents" },
]

export function SiteHeader({
  variant = "app",
}: {
  /** `app` = full nav + status chip, `auth` = minimal (sign-in flow) */
  variant?: "app" | "auth"
}) {
  const pathname = usePathname()

  return (
    <header className="shrink-0 bg-neutral-950 text-white">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
              C
            </div>
            <span className="text-[15px] font-bold tracking-tight">codapac</span>
          </Link>

          {variant === "app" && (
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/" || pathname.startsWith("/issues")
                    : pathname.startsWith(item.href)
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-white/80 hover:bg-white/10 hover:text-white",
                      active && "bg-white/10 text-white hover:bg-white/20",
                    )}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                )
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {variant === "app" && (
            <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white md:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              3 agents active
            </span>
          )}
          <Button asChild size="sm" className="shadow-sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
