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
  const initialRemainingSeconds = Math.max(0, cooldownSeconds)
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    autoStart ? initialRemainingSeconds : 0
  )
  const [cooldownEndCount, setCooldownEndCount] = useState(0)
  const timeoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const remainingSecondsRef = useRef(autoStart ? initialRemainingSeconds : 0)

  const handleCooldownEnd = useEffectEvent(() => {
    onCooldownEnd?.()
  })

  const clearCooldownInterval = () => {
    if (!timeoutIntervalRef.current) return

    clearInterval(timeoutIntervalRef.current)
    timeoutIntervalRef.current = null
  }

  const completeCooldown = () => {
    clearCooldownInterval()
    remainingSecondsRef.current = 0
    setRemainingSeconds(0)
    setCooldownEndCount((current) => current + 1)
  }

  const startCooldown = () => {
    const nextRemainingSeconds = Math.max(0, cooldownSeconds)

    clearCooldownInterval()
    remainingSecondsRef.current = nextRemainingSeconds
    setRemainingSeconds(nextRemainingSeconds)

    if (nextRemainingSeconds === 0) {
      completeCooldown()
      return
    }

    timeoutIntervalRef.current = setInterval(() => {
      const nextRemainingSeconds = Math.max(
        0,
        remainingSecondsRef.current - 1
      )

      remainingSecondsRef.current = nextRemainingSeconds
      setRemainingSeconds(nextRemainingSeconds)

      if (nextRemainingSeconds === 0) {
        completeCooldown()
      }
    }, 1000)
  }

  const stopCooldown = () => {
    clearCooldownInterval()
    remainingSecondsRef.current = 0
    setRemainingSeconds(0)
  }

  const autoStartCooldown = useEffectEvent(startCooldown)
  const clearActiveCooldown = useEffectEvent(clearCooldownInterval)

  useEffect(() => {
    if (cooldownEndCount === 0) return

    handleCooldownEnd()
  }, [cooldownEndCount])

  useEffect(() => {
    if (autoStart) {
      autoStartCooldown()
    }

    return () => clearActiveCooldown()
  }, [autoStart])

  return {
    isCoolingDown: remainingSeconds > 0,
    remainingSeconds,
    startCooldown,
    stopCooldown,
  }
}
