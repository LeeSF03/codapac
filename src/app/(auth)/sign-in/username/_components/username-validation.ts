import { z } from "zod"

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20
export const USERNAME_PATTERN = /^[a-z0-9_]+$/

export const usernameSchema = z.object({
  username: z
    .string()
    .min(
      USERNAME_MIN_LENGTH,
      `Must be at least ${USERNAME_MIN_LENGTH} characters.`
    )
    .max(
      USERNAME_MAX_LENGTH,
      `Must be at most ${USERNAME_MAX_LENGTH} characters.`
    )
    .regex(
      USERNAME_PATTERN,
      "Use lowercase letters, numbers, and underscores only."
    ),
})

export type UsernameFormValues = z.infer<typeof usernameSchema>

export function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/\s+/g, "")
}
