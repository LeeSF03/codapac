"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { authClient } from "@/lib/auth-client"

export default function ProfilePage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [signingOut, setSigningOut] = useState(false)

  const user = session?.user as
    | { email?: string | null; name?: string | null; image?: string | null }
    | undefined
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

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
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
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Your account
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only for now. Editing lands in a later update.
          </p>
        </div>

        <Card className="rounded-2xl border-border bg-card p-7 shadow-sm">
          <div className="flex items-center gap-5">
            <Avatar className="size-20 ring-1 ring-border">
              {user?.image ? (
                <AvatarImage src={user.image} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-muted text-lg font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-tight">
                {displayName}
              </h2>
              {email ? (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {email}
                </p>
              ) : null}
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 [animation:cp-breath_2s_ease-in-out_infinite]" />
                Active
              </span>
            </div>
          </div>

          <Separator className="my-7" />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Display name" value={displayName} />
            <Field label="Email" value={email || "—"} />
            <Field label="Username" value={`@${username}`} mono />
            <Field label="Member since" value="Today" />
          </div>

          <Separator className="my-7" />

          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Session</h3>
              <p className="text-[12.5px] text-muted-foreground">
                Signs you out of codapac on this device.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      <Input
        readOnly
        value={value}
        className={`pointer-events-none h-10 bg-muted/40 ${
          mono ? "font-mono text-[13.5px]" : ""
        }`}
      />
    </div>
  )
}
