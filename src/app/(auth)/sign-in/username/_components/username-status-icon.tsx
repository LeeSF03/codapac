import { Check, X } from "lucide-react"

import type { UsernameStatus } from "./username-status"

export function UsernameStatusIcon({ status }: { status: UsernameStatus }) {
  if (status.kind === "available") {
    return <Check className="h-4 w-4 text-emerald-500" aria-hidden />
  }

  if (status.kind === "taken" || status.kind === "invalid") {
    return <X className="text-destructive h-4 w-4" aria-hidden />
  }

  return null
}
