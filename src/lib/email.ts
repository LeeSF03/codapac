import { type Transporter, createTransport } from "nodemailer"
import { z } from "zod"

export const otpEmailPayloadSchema = z.object({
  email: z.email().trim(),
  otp: z.string().trim().min(1),
  type: z.enum([
    "sign-in",
    "email-verification",
    "forget-password",
    "change-email",
  ]),
})

export type SendOtpEmailInput = z.infer<typeof otpEmailPayloadSchema>

type OtpEmailContent = {
  intro: string
  subject: string
}

let smtpTransporter: Transporter | undefined

function getSmtpTransporter() {
  if (smtpTransporter) {
    return smtpTransporter
  }

  const port = Number(process.env.SMTP_PORT!)
  smtpTransporter = createTransport({
    auth: {
      pass: process.env.SMTP_PASS!,
      user: process.env.SMTP_USER!,
    },
    host: process.env.SMTP_HOST!,
    port,
    secure: port === 465,
  })

  return smtpTransporter
}

export const otpEmailContent = {
  "email-verification": {
    intro: "Use this code to verify your email address.",
    subject: "Verify your email",
  },
  "forget-password": {
    intro: "Use this code to reset your password.",
    subject: "Reset your password",
  },
  "change-email": {
    intro: "Use this code to confirm your email change.",
    subject: "Confirm your email change",
  },
  "sign-in": {
    intro: "Use this code to finish signing in to FinHack.",
    subject: "Your FinHack sign-in code",
  },
} satisfies Record<SendOtpEmailInput["type"], OtpEmailContent>

export async function sendOtpEmail(input: SendOtpEmailInput) {
  const { email, otp, type } = otpEmailPayloadSchema.parse(input)
  const { intro, subject } = otpEmailContent[type]
  const fromAddress = process.env.SMTP_USER!

  await getSmtpTransporter().sendMail({
    from: `FinHack <${fromAddress}>`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <p>${intro}</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.3em; margin: 24px 0;">
          ${otp}
        </p>
        <p>This code expires soon. If you did not request it, you can ignore this email.</p>
      </div>
    `,
    subject,
    text: `${intro}\n\n${otp}\n\nThis code expires soon. If you did not request it, you can ignore this email.`,
    to: email,
  })
}
