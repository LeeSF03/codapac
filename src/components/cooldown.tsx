"use client"

import * as React from "react"

import { useCooldown } from "@/hooks/use-cooldown"

type CooldownRenderState = ReturnType<typeof useCooldown>

type CooldownProps = {
  autoStart?: boolean
  children: (state: CooldownRenderState) => React.ReactNode
  cooldownSeconds: number
  onCooldownEnd?: () => void
}

export function Cooldown({
  autoStart = true,
  children,
  cooldownSeconds,
  onCooldownEnd,
}: CooldownProps) {
  const cooldown = useCooldown({
    autoStart,
    cooldownSeconds,
    onCooldownEnd,
  })

  return <>{children(cooldown)}</>
}
