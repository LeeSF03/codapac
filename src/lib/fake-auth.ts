"use client"

import { useEffect, useState } from "react"

const FLAG = "cp_fake"
const EMAIL = "cp_fake_email"
const MAX_AGE = 60 * 60 * 24 * 7

export type FakeSession = { user: { email: string; name: string } } | null

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

export function setFakeSession(email: string) {
  if (typeof document === "undefined") return
  document.cookie = `${FLAG}=1; path=/; max-age=${MAX_AGE}; samesite=lax`
  document.cookie = `${EMAIL}=${encodeURIComponent(email)}; path=/; max-age=${MAX_AGE}; samesite=lax`
}

export function clearFakeSession() {
  if (typeof document === "undefined") return
  document.cookie = `${FLAG}=; path=/; max-age=0`
  document.cookie = `${EMAIL}=; path=/; max-age=0`
}

export function useFakeSession(): FakeSession {
  const [session, setSession] = useState<FakeSession>(null)

  useEffect(() => {
    const sync = () => {
      if (readCookie(FLAG) !== "1") {
        setSession(null)
        return
      }
      const email = readCookie(EMAIL) ?? "you@codapac.dev"
      const name = email.split("@")[0] || "you"
      setSession({ user: { email, name } })
    }
    sync()
    const onFocus = () => sync()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  return session
}
