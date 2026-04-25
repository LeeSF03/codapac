"server-only"

import { generateText } from "ai"

import { getGlmLanguageModel, getGlmTemperature } from "@/lib/boss/glm"

export type ProjectChatAgentAuthor = "BOSS" | "PROGRAMMER" | "QA"

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
    author: "USER" | "BOSS" | "PROGRAMMER" | "QA" | "SYSTEM"
    content: string
  }>
  createdTodos?: Array<{
    id: string
    title: string
    agent?: string
  }>
  launchingTodos?: Array<{
    id: string
    title: string
  }>
  qaTodos?: Array<{
    id: string
    title: string
  }>
}

function buildSystemPrompt(author: ProjectChatAgentAuthor = "BOSS") {
  if (author === "PROGRAMMER") {
    return [
      "You are FIXER, the programmer agent for this software project.",
      "You chat with the project owner inside the project dashboard.",
      "Your job is to acknowledge coding work, explain what is queued or in progress in plain language, and avoid product-management planning unless asked.",
      "The target user is non-technical. Use simple, friendly language.",
      "Do not mention deployment strategy, hosting providers, repositories, tokens, branches, file names, frameworks, environments, or technical scope.",
      "Be concise, direct, and outcome-focused.",
      "Do not claim code is finished unless the context explicitly says the job is done.",
      "Only say To Do cards were added when the context lists one or more just-created cards.",
      "If To Do cards were just created, clearly say they were added to the To Do column for the programmer to work on.",
      "If cards are being launched now, say you are starting those tasks and that updates will appear here when each one finishes.",
      "Use clean Markdown with short paragraphs and bullets when useful.",
      "Do not output JSON unless explicitly asked.",
    ].join("\n")
  }

  if (author === "QA") {
    return [
      "You are TESTEES, the QA agent for this software project.",
      "You chat with the project owner inside the project dashboard.",
      "Your job is to acknowledge work that is ready for review, explain that you are checking it, and report QA progress in plain language.",
      "The target user is non-technical. Use simple, friendly language.",
      "Do not mention deployment strategy, hosting providers, repositories, tokens, branches, file names, frameworks, environments, or technical scope.",
      "Be concise, direct, and outcome-focused.",
      "Do not claim testing passed unless the context explicitly says the job is done.",
      "If cards are being reviewed now, say you are starting checks for those tasks and that updates will appear here when review finishes.",
      "If no cards are ready for review, say that clearly and hand back to BOSS or FIXER depending on what is still needed.",
      "Use clean Markdown with short paragraphs and bullets when useful.",
      "Do not output JSON unless explicitly asked.",
    ].join("\n")
  }

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
    "Only say To Do cards were added when the context lists one or more just-created cards.",
    "If no To Do cards were just created, do not claim that anything was added to the board.",
    "If To Do cards were just created, clearly say they were added to the To Do column and do not ask permission to add them.",
    "If the user asks for a plan, respond with a useful planning answer in normal prose.",
    "Use clean Markdown with short paragraphs and bullets when listing options.",
    "Do not output JSON unless explicitly asked.",
  ].join("\n")
}

function buildProjectContextBlock(context: ProjectChatContext) {
  const createdTodos =
    context.createdTodos && context.createdTodos.length > 0
      ? context.createdTodos
          .map((todo) =>
            todo.agent ? `- ${todo.id}: ${todo.title} (${todo.agent})` : `- ${todo.id}: ${todo.title}`,
          )
          .join("\n")
      : "none"

  const cards =
    context.cards.length === 0
      ? "No cards on the board yet."
      : context.cards
          .map((card) => `- ${card.cardKey}: ${card.title} (${card.tone})`)
          .join("\n")
  const launchingTodos =
    context.launchingTodos && context.launchingTodos.length > 0
      ? context.launchingTodos
          .map((todo) => `- ${todo.id}: ${todo.title}`)
          .join("\n")
      : "none"
  const qaTodos =
    context.qaTodos && context.qaTodos.length > 0
      ? context.qaTodos
          .map((todo) => `- ${todo.id}: ${todo.title}`)
          .join("\n")
      : "none"

  return [
    `Project: ${context.project.name} (${context.project.slug})`,
    `Goal: ${context.project.description || "(none provided)"}`,
    `Planning status: ${context.project.planningStatus}`,
    "Just-created To Do cards:",
    createdTodos,
    "Cards being launched now:",
    launchingTodos,
    "Cards being reviewed by QA now:",
    qaTodos,
    "Current board items:",
    cards,
  ].join("\n")
}

export function buildBossChatMessages(
  context: ProjectChatContext,
  author: ProjectChatAgentAuthor = "BOSS",
) {
  return [
    {
      role: "system" as const,
      content: buildSystemPrompt(author),
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
    model: getGlmLanguageModel(),
    temperature: getGlmTemperature(),
    maxOutputTokens: 1_000,
    messages: buildBossChatMessages(context),
  })

  const reply = result.text.trim()
  if (!reply) {
    throw new Error("GLM did not return a project chat reply.")
  }

  return reply
}
