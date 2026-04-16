import { convexClient } from "@convex-dev/better-auth/client/plugins"
import { emailOTPClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

const baseURL = process.env.NEXT_PUBLIC_SITE_URL

export const authClient = createAuthClient({
  baseURL,
  plugins: [convexClient(), emailOTPClient()],
})
