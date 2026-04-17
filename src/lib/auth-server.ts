"server-only"

import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs"

import { api } from "~/convex/_generated/api"

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
})

export async function getCurrentAuthUser() {
  if (!(await isAuthenticated())) {
    return null
  }

  return await fetchAuthQuery(api.auth.getAuthUser)
}

export function hasUsername(user: unknown) {
  if (!user || typeof user !== "object" || !("username" in user)) {
    return false
  }

  return typeof user.username === "string" && user.username.length > 0
}
