"server-only"

import { generateText } from "ai"

import { getKimiLanguageModel, getKimiTemperature } from "@/lib/boss/kimi"

type ProjectChatContext = {
  project: {
    name: string
    slug: string
    description: string
    repoUrl: string | null
    planningStatus: string
  }
  cards: Array<{
    cardKey: string
    title: string
    tone: string
    agent: string
    priority: string
    tags: string[]
  }>
  messages: Array<{
    role: "user" | "assistant" | "system"
    author: "USER" | "BOSS" | "SYSTEM"
    content: string
  }>
  createdTodo?: {
    id: string
    title: string
  }
}

function buildSystemPrompt() {
  return [
    "You are BOSS, the product manager for this software project.",
    "You chat with the project owner inside the project dashboard.",
    "Your job is to clarify the user's goal, explain progress in plain language, and help shape the project task list.",
    "The target user is non-technical. Use simple, friendly language.",
    "Avoid implementation details unless the user explicitly asks for them.",
    "Do not mention deployment strategy, hosting providers, repositories, tokens, branches, file names, frameworks, environments, or technical scope.",
    "Be concise, direct, and outcome-focused.",
    "Do not invent implementation progress that is not present in the provided context.",
    "If the board is empty, acknowledge that and propose one simple next move.",
    "If a To Do card was just created, clearly say it has been added to the To Do column and do not ask permission to add it.",
    "If the user asks for a plan, respond with a useful planning answer in normal prose.",
    "Use clean Markdown with short paragraphs and bullets when listing options.",
    "Do not output JSON unless explicitly asked.",
  ].join("\n")
}

function buildProjectContextBlock(context: ProjectChatContext) {
  const cards =
    context.cards.length === 0
      ? "No cards on the board yet."
      : context.cards
          .map((card) => `- ${card.cardKey}: ${card.title} (${card.tone})`)
          .join("\n")

  return [
    `Project: ${context.project.name} (${context.project.slug})`,
    `Goal: ${context.project.description || "(none provided)"}`,
    `Planning status: ${context.project.planningStatus}`,
    context.createdTodo
      ? `Just-created To Do card: ${context.createdTodo.id} - ${context.createdTodo.title}`
      : "Just-created To Do card: none",
    "Current board items:",
    cards,
  ].join("\n")
}

export function buildBossChatMessages(context: ProjectChatContext) {
  return [
    {
      role: "system" as const,
      content: buildSystemPrompt(),
    },
    {
      role: "system" as const,
      content: buildProjectContextBlock(context),
    },
    ...context.messages.slice(-18).map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ]
}

export async function generateBossChatReply(context: ProjectChatContext) {
  const result = await generateText({
    model: getKimiLanguageModel(),
    temperature: getKimiTemperature(),
    maxOutputTokens: 1_000,
    messages: buildBossChatMessages(context),
  })

  const reply = result.text.trim()
  if (!reply) {
    throw new Error("Kimi did not return a project chat reply.")
  }

  return reply
}
