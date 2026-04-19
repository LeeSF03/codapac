"server-only"

import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

type KimiErrorPayload = {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

export function getKimiToken() {
  const token =
    process.env.KIMI_TOKEN?.trim() || process.env.MOONSHOT_API_KEY?.trim()

  if (!token) {
    throw new Error(
      "Missing Kimi API key. Set KIMI_TOKEN or MOONSHOT_API_KEY in .env.local and restart the dev server.",
    )
  }

  return token
}

export function getKimiModel() {
  return process.env.KIMI_MODEL?.trim() || "kimi-k2.5"
}

export function getKimiLanguageModel() {
  const kimi = createOpenAICompatible({
    name: "kimi",
    apiKey: getKimiToken(),
    baseURL: "https://api.moonshot.ai/v1",
  })

  return kimi(getKimiModel())
}

export function getKimiTemperature() {
  return 1
}

export function formatKimiError(
  payload: KimiErrorPayload | null,
  fallback: string,
) {
  const message = payload?.error?.message?.trim()
  if (!message) {
    return fallback
  }

  if (payload?.error?.code) {
    return `${message} (${payload.error.code})`
  }

  return message
}
