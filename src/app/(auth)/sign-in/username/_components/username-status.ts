const RESERVED_USERNAMES = new Set([
  "admin",
  "root",
  "codapac",
  "support",
  "api",
  "help",
  "priya",
  "enzo",
  "quinn",
])

export type UsernameStatus =
  | { kind: "idle" }
  | { kind: "invalid"; reason: string }
  | { kind: "taken" }
  | { kind: "available" }

type GetUsernameStatusOptions = {
  username: string
  validationMessage?: string
}

export function getUsernameStatus({
  username,
  validationMessage,
}: GetUsernameStatusOptions): UsernameStatus {
  if (username.length === 0) {
    return { kind: "idle" }
  }

  if (validationMessage) {
    return { kind: "invalid", reason: validationMessage }
  }

  // UI stub - replace with real availability query.
  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return { kind: "taken" }
  }

  return { kind: "available" }
}
