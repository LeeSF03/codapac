type ExecutionContextProject = {
  name: string
  description?: string | null
}

type ExecutionContextCard = {
  cardKey: string
  title: string
  description?: string | null
}

type ExecutionContextMessage = {
  role: "user" | "assistant" | "system"
  author: "USER" | "BOSS" | "PROGRAMMER" | "QA" | "SYSTEM"
  content: string
  createdAt: number
}

export type ExecutionFeatureContext = {
  featureSummary: string
  recentConversationSummary: string | null
  groupedTaskRationale: string | null
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function uniqueLines(lines: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const line of lines) {
    const normalized = normalizeText(line)
    if (!normalized) {
      continue
    }
    if (seen.has(normalized.toLowerCase())) {
      continue
    }
    seen.add(normalized.toLowerCase())
    result.push(normalized)
  }

  return result
}

export function buildExecutionContextQuery(
  project: ExecutionContextProject,
  cards: ExecutionContextCard[],
) {
  return [
    project.name,
    project.description ?? "",
    ...cards.flatMap((card) => [card.title, card.description ?? ""]),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join("\n")
}

export function buildExecutionFeatureContext(input: {
  project: ExecutionContextProject
  cards: ExecutionContextCard[]
  messages: ExecutionContextMessage[]
}): ExecutionFeatureContext {
  const recentMessages = [...input.messages]
    .filter((message) => message.author !== "SYSTEM")
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-8)

  const recentUserMessages = [...recentMessages]
    .filter((message) => message.author === "USER")
    .slice(-3)
    .map((message) => truncate(normalizeText(message.content), 240))

  const recentAssistantMessages = [...recentMessages]
    .filter((message) => message.author === "BOSS")
    .slice(-2)
    .map((message) => truncate(normalizeText(message.content), 240))

  const cardSummary = input.cards
    .map((card) => `${card.cardKey}: ${card.title}`)
    .join("; ")

  const featureSummaryParts = uniqueLines([
    input.project.description,
    recentUserMessages.length > 0
      ? `Recent user request: ${recentUserMessages.join(" Then: ")}`
      : null,
    cardSummary ? `Current task batch: ${cardSummary}` : null,
  ])

  const featureSummary = featureSummaryParts.length > 0
    ? featureSummaryParts.join("\n")
    : "Implement the current assigned work as described by the task cards."

  const conversationSummaryEntries = uniqueLines([
    ...recentUserMessages.map((message) => `USER: ${message}`),
    ...recentAssistantMessages.map((message) => `BOSS: ${message}`),
  ])

  const recentConversationSummary = conversationSummaryEntries.length > 0
    ? conversationSummaryEntries.join("\n")
    : null

  const groupedTaskRationale = input.cards.length > 1
    ? [
        "These cards are grouped because they contribute to the same user-facing feature and should land as one coherent change.",
        `Implement them in a sensible dependency order, starting with the foundations and shared plumbing before finishing the higher-level behaviors. Current batch: ${cardSummary}.`,
      ].join("\n")
    : null

  return {
    featureSummary,
    recentConversationSummary,
    groupedTaskRationale,
  }
}
