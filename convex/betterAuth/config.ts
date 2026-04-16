import { type GenericCtx, createClient } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { isActionCtx } from "@convex-dev/better-auth/utils"
import { BetterAuthOptions } from "better-auth"
import { betterAuth } from "better-auth/minimal"
import { emailOTP } from "better-auth/plugins/email-otp"

import { components, internal } from "../_generated/api"
import { DataModel } from "../_generated/dataModel"
import authConfig from "../auth.config"
import schema from "./schema"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: {
      schema,
    },
  }
)

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: googleClientId!,
        clientSecret: googleClientSecret!,
        redirectURI: `${siteUrl}/api/auth/callback/google`,
      },
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          if (!isActionCtx(ctx)) {
            throw new Error("Better Auth email OTP requires an action context")
          }

          await ctx.runAction(internal.email.sendOtpEmailAction, {
            email,
            otp,
            type,
          })
        },
      }),
      convex({ authConfig }),
    ],
  }) satisfies BetterAuthOptions

export const options = createAuthOptions({} as GenericCtx<DataModel>)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx))
}
