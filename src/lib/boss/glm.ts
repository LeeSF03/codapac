"server-only"

import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

const DEFAULT_GLM_MODEL_ID = "kimi-k2.5"

type GlmErrorPayload = {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

export function getGlmToken() {
  const token = process.env.GLM_TOKEN?.trim()

  if (!token) {
    throw new Error(
      "Missing GLM API key. Set GLM_TOKEN in .env.local and restart the dev server.",
    )
  }

  return token
}

export function getGlmModel() {
  return process.env.GLM_MODEL?.trim() || DEFAULT_GLM_MODEL_ID
}

export function getGlmBaseUrl() {
  return process.env.GLM_BASE_URL?.trim() || "https://api.moonshot.ai/v1"
}

export function getGlmLanguageModel() {
  const glm = createOpenAICompatible({
    name: "glm",
    apiKey: getGlmToken(),
    baseURL: getGlmBaseUrl(),
  })

  return glm(getGlmModel())
}

export function getGlmTemperature() {
  return 1
}

export function formatGlmError(
  payload: GlmErrorPayload | null,
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
