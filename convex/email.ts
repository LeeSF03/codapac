"use node"

import { v } from "convex/values"

import { sendOtpEmail } from "@/lib/email-server"

import { internalAction } from "./_generated/server"

export const sendOtpEmailAction = internalAction({
  args: {
    email: v.string(),
    otp: v.string(),
    type: v.union(
      v.literal("sign-in"),
      v.literal("email-verification"),
      v.literal("forget-password"),
      v.literal("change-email")
    ),
  },
  handler: async (_ctx, args) => {
    await sendOtpEmail(args)
    return null
  },
})
