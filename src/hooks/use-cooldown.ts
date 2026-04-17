"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"

type UseCooldownOptions = {
  autoStart?: boolean
  cooldownSeconds: number
  onCooldownEnd?: () => void
}

export function useCooldown({
  autoStart = true,
  cooldownSeconds,
  onCooldownEnd,
}: UseCooldownOptions) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    autoStart ? cooldownSeconds : 0
  )

  const timeoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onCooldownEndRef = useRef(onCooldownEnd)

  useEffect(() => {
    onCooldownEndRef.current = onCooldownEnd
  }, [onCooldownEnd])

  const startCooldown = () => {
    stopCooldown()
    setRemainingSeconds(cooldownSeconds)

    timeoutIntervalRef.current = setInterval(() => {
      setRemainingSeconds((current) => {
        const next = Math.max(0, current - 1)

        if (next <= 0) {
          stopCooldown()
          onCooldownEndRef.current?.()
        }
        return next
      })
    }, 1000)
  }

  const stopCooldown = () => {
    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current)
      timeoutIntervalRef.current = null
    }
  }

  const autoStartCooldown = useEffectEvent(startCooldown)

  useEffect(() => {
    if (autoStart) {
      autoStartCooldown()
    }
    return stopCooldown
  }, [autoStart])

  return {
    isCoolingDown: remainingSeconds > 0,
    remainingSeconds,
    startCooldown,
    stopCooldown,
  }
}
