import type { UsernameStatus } from "./username-status"

export function UsernameStatusLine({
  status,
  length,
  username,
}: {
  status: UsernameStatus
  length: number
  username: string
}) {
  const content = (() => {
    switch (status.kind) {
      case "available":
        return (
          <span className="text-emerald-600">@{username} is available</span>
        )
      case "taken":
        return <span className="text-destructive">That username is taken.</span>
      case "invalid":
        return status.reason ? (
          <span className="text-destructive">{status.reason}</span>
        ) : null
      case "idle":
      default:
        return (
          <span className="text-muted-foreground">
            {length === 0 ? "Start typing to check availability." : null}
          </span>
        )
    }
  })()

  return <p className="min-h-[1rem] text-[12px]">{content}</p>
}
