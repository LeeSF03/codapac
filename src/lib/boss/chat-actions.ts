"server-only"

import { generateObject, generateText } from "ai"
import { z } from "zod"

import { getKimiLanguageModel, getKimiTemperature } from "@/lib/boss/kimi"

type ChatTodoIntent = {
  shouldCreate: boolean
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: "low" | "medium" | "high"
  tags: string[]
}

type ChatIntentContext = {
  cards?: Array<{
    title: string
    tags?: string[]
  }>
  messages?: Array<{
    author: "USER" | "BOSS" | "SYSTEM"
    content: string
  }>
  project?: {
    name: string
    slug: string
    description: string
    repoUrl: string | null
    planningStatus: string
  }
}

const generatedCardSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(1_200),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(220)).min(1).max(6),
  priority: z.enum(["low", "medium", "high"]),
  tags: z.array(z.string().trim().min(1).max(32)).max(4),
})

const generatedCardsSchema = z.object({
  todos: z.array(generatedCardSchema).max(8),
})

type GeneratedCardDraft = z.infer<typeof generatedCardSchema>

function parseJsonObject(value: string) {
  const trimmed = value.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  const source = fenced?.[1] ?? trimmed
  const firstBrace = source.indexOf("{")
  const lastBrace = source.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Card draft response did not contain a JSON object.")
  }
  return JSON.parse(source.slice(firstBrace, lastBrace + 1)) as unknown
}

function normalizeGeneratedCardDraft(
  value: unknown,
  userMessage: string,
  intent: ChatTodoIntent,
): GeneratedCardDraft {
  const input = value && typeof value === "object" ? value : {}
  const record = input as Record<string, unknown>

  const title =
    typeof record.title === "string" && record.title.trim()
      ? record.title.trim()
      : intent.title
  const description =
    typeof record.description === "string" && record.description.trim()
      ? record.description.trim()
      : inferDescription(title, userMessage)
  const acceptanceCriteria = Array.isArray(record.acceptanceCriteria)
    ? record.acceptanceCriteria
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6)
    : inferAcceptanceCriteria(title, userMessage)
  const priority =
    record.priority === "low" ||
    record.priority === "medium" ||
    record.priority === "high"
      ? record.priority
      : intent.priority
  const tags = Array.isArray(record.tags)
    ? record.tags
        .filter((item): item is string => typeof item === "string")
        .map((item) =>
          item
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, ""),
        )
        .filter(Boolean)
        .slice(0, 4)
    : intent.tags

  return generatedCardSchema.parse({
    title,
    description,
    acceptanceCriteria:
      acceptanceCriteria.length > 0
        ? acceptanceCriteria
        : inferAcceptanceCriteria(title, userMessage),
    priority,
    tags,
  })
}

const ACTION_WORDS =
  /\b(create|build|make|add|implement|fix|design|develop|set\s*up|setup|generate|write|ship)\b/i

const AFFIRMATION =
  /^(yes|yep|yeah|ok|okay|sure|confirm|confirmed|proceed|go ahead|do it|please do|ready)$/i

const CONFIRMATION_PHRASE =
  /\b(option\s*\d+|sounds good|looks good|good middle ground|go with|pick|choose|that one|the first|the second|the third|let'?s do|do that|works for me)\b/i

const MISSING_TODOS_PHRASE =
  /\b(todo|task|card|issue)s?\b.*\b(missing|not showing|not shown|not there|didn'?t appear|not added|empty)\b/i

const QUESTION_ONLY =
  /^(what|why|how|when|where|who|can you explain|summari[sz]e|tell me|status|is there)\b/i

function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.?!]+$/g, "")
    .slice(0, 120)
}

function inferTags(message: string) {
  const lower = message.toLowerCase()
  const tags = new Set<string>()

  if (/\b(webpage|website|landing|page|html|css|ui)\b/.test(lower)) {
    tags.add("page")
  }
  if (/\b(api|backend|server|database|convex)\b/.test(lower)) {
    tags.add("data")
  }
  if (/\b(auth|login|sign in|oauth)\b/.test(lower)) {
    tags.add("sign-in")
  }
  if (/\btest|qa|verify|bug|fix\b/.test(lower)) {
    tags.add("review")
  }

  return Array.from(tags).slice(0, 4)
}

function inferPriority(message: string): "low" | "medium" | "high" {
  const lower = message.toLowerCase()
  if (/\b(urgent|critical|blocker|asap|production|prod|broken|crash)\b/.test(lower)) {
    return "high"
  }
  if (/\b(polish|minor|small|simple|basic|tiny|quick)\b/.test(lower)) {
    return "low"
  }
  return "medium"
}

function inferDescription(title: string, source: string) {
  const cleanSource = source.trim().replace(/\s+/g, " ")
  if (cleanSource.length > 0 && cleanSource !== title) {
    return `Create the requested outcome from chat: ${cleanSource}`
  }
  return `Create ${title.charAt(0).toLowerCase()}${title.slice(1)}.`
}

function inferAcceptanceCriteria(title: string, source: string) {
  const lower = `${title} ${source}`.toLowerCase()
  const criteria = new Set<string>()

  if (/\bhello world\b/.test(lower)) {
    criteria.add('The page displays the exact text "hello world".')
  }
  if (/\b(webpage|website|page|html)\b/.test(lower)) {
    criteria.add("The page is available as a browser-rendered web page.")
  }
  if (/\b(simple|basic|minimal|static)\b/.test(lower)) {
    criteria.add("The result stays simple and avoids unnecessary extras.")
  }
  if (criteria.size === 0) {
    criteria.add("The requested result is visible in the project.")
  }

  criteria.add("The result is ready for the project owner to review.")
  return Array.from(criteria).slice(0, 5)
}

function emptyIntent(): ChatTodoIntent {
  return {
    shouldCreate: false,
    title: "",
    description: "",
    acceptanceCriteria: [],
    priority: "medium",
    tags: [],
  }
}

function normalizeActionTitle(message: string) {
  const title = titleCase(message)
  if (!title) {
    return "Create requested project task"
  }

  if (/^(create|build|make|add|implement|fix|design|develop|set\s*up|setup|generate|write|ship)\b/i.test(title)) {
    return title
  }

  return `Create ${title.charAt(0).toLowerCase()}${title.slice(1)}`
}

function titleKey(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function alreadyHasCard(title: string, context?: ChatIntentContext) {
  const key = titleKey(title)
  if (!key) return false

  return (context?.cards ?? []).some((card) => titleKey(card.title) === key)
}

function uniqueNewDrafts(
  drafts: GeneratedCardDraft[],
  context?: ChatIntentContext,
) {
  const seen = new Set<string>()

  return drafts.filter((draft) => {
    const key = titleKey(draft.title)
    if (!key || seen.has(key) || alreadyHasCard(draft.title, context)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function cleanTitle(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function extractProposedTitle(content: string) {
  const patterns = [
    /(?:^|\n)\s*[-*]?\s*\*\*Title:\*\*\s*([^\n]+)/i,
    /(?:^|\n)\s*[-*]?\s*Title:\s*([^\n]+)/i,
    /(?:^|\n)\s*\*\*Card created:\*\*\s*([^\n]+)/i,
    /(?:^|\n)\s*\*\*Card marked:[^*]+\*\*\s*([^\n]*)/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(content)
    const title = cleanTitle(match?.[1] ?? "")
    if (title) return title
  }

  return ""
}

function inferConfirmedTitle(context?: ChatIntentContext) {
  const messages = context?.messages ?? []
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.author !== "BOSS") continue

    const proposedTitle = extractProposedTitle(message.content)
    if (proposedTitle) {
      return proposedTitle
    }
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.author !== "USER") continue
    if (!ACTION_WORDS.test(message.content)) continue
    return normalizeActionTitle(message.content)
  }

  return ""
}

export function inferChatTodoIntent(
  message: string,
  context?: ChatIntentContext,
): ChatTodoIntent {
  const trimmed = message.trim()
  if (!trimmed) {
    return emptyIntent()
  }

  if (AFFIRMATION.test(trimmed) || /\bmark\b.+\bready\b/i.test(trimmed)) {
    const confirmedTitle = inferConfirmedTitle(context)
    if (confirmedTitle && !alreadyHasCard(confirmedTitle, context)) {
      return {
        shouldCreate: true,
        title: confirmedTitle,
        description: inferDescription(confirmedTitle, confirmedTitle),
        acceptanceCriteria: inferAcceptanceCriteria(confirmedTitle, confirmedTitle),
        priority: inferPriority(confirmedTitle),
        tags: inferTags(confirmedTitle),
      }
    }
  }

  const hasAction = ACTION_WORDS.test(trimmed)
  const questionOnly = QUESTION_ONLY.test(trimmed) && !/\b(create|build|make|add|implement|fix|design|develop|generate|write)\b/i.test(trimmed)

  if (!hasAction || questionOnly) {
    return emptyIntent()
  }

  const title = normalizeActionTitle(trimmed)
  if (alreadyHasCard(title, context)) {
    return emptyIntent()
  }

  return {
    shouldCreate: true,
    title,
    description: inferDescription(title, trimmed),
    acceptanceCriteria: inferAcceptanceCriteria(title, trimmed),
    priority: inferPriority(trimmed),
    tags: inferTags(trimmed),
  }
}

function shouldInferTodoCards(message: string, context?: ChatIntentContext) {
  const trimmed = message.trim()
  if (!trimmed) {
    return false
  }

  const existingIntent = inferChatTodoIntent(trimmed, context)
  if (existingIntent.shouldCreate) {
    return true
  }

  if (!CONFIRMATION_PHRASE.test(trimmed) && !MISSING_TODOS_PHRASE.test(trimmed)) {
    return false
  }

  const recentBossMessages = (context?.messages ?? [])
    .filter((message) => message.author === "BOSS")
    .slice(-3)
    .map((message) => message.content)
    .join("\n")

  return /\b(option\s*\d+|add(ed)? these tasks|break this down|could break|here are|tasks?|todo)\b/i.test(
    recentBossMessages,
  )
}

function buildCardDraftPrompt(
  userMessage: string,
  intent: ChatTodoIntent,
  context?: ChatIntentContext,
) {
  const recentMessages = (context?.messages ?? [])
    .slice(-8)
    .map((message) => `${message.author}: ${message.content}`)
    .join("\n")

  const existingCards =
    (context?.cards ?? []).length > 0
      ? context?.cards?.map((card) => `- ${card.title}`).join("\n")
      : "No cards yet."

  return [
    "Generate one user-friendly task card for the project.",
    "Return concise, concrete content for a non-technical user.",
    "Do not mention deployment, hosting, repositories, tokens, branches, file names, frameworks, environments, or implementation strategy.",
    "",
    `Project: ${context?.project?.name ?? "Unknown"} (${context?.project?.slug ?? "unknown"})`,
    `Project description: ${context?.project?.description || "(none)"}`,
    "",
    "Existing cards:",
    existingCards,
    "",
    "Recent conversation:",
    recentMessages || "(none)",
    "",
    `User request: ${userMessage}`,
    `Initial title guess: ${intent.title}`,
    "",
    "Output requirements:",
    "- title: action-oriented, specific, and non-technical.",
    "- description: describe the desired user-facing outcome in plain language.",
    "- acceptanceCriteria: simple checklist items a non-technical user can verify.",
    "- priority: low, medium, or high.",
    "- tags: lowercase kebab-case labels.",
  ].join("\n")
}

function buildCardDraftsPrompt(
  userMessage: string,
  context?: ChatIntentContext,
) {
  const recentMessages = (context?.messages ?? [])
    .slice(-10)
    .map((message) => `${message.author}: ${message.content}`)
    .join("\n")

  const existingCards =
    (context?.cards ?? []).length > 0
      ? context?.cards?.map((card) => `- ${card.title}`).join("\n")
      : "No cards yet."

  return [
    "Decide whether the latest user message should create To Do cards now.",
    "Return one JSON object with a todos array. Return an empty todos array if no cards should be created.",
    "Create cards when the user directly asks for work to be done, or confirms/selects an option that BOSS proposed.",
    "If the user says expected cards are missing, recreate the cards from the most recent BOSS message that claimed tasks were added.",
    "When the user selects an option, create the concrete tasks implied by that selected option and any lower-level basics included by that option.",
    "Do not create cards for pure questions, status checks, or broad discussion without a clear decision.",
    "Return concise, concrete content for a non-technical user.",
    "Do not mention deployment, hosting, repositories, tokens, branches, file names, frameworks, environments, or implementation strategy.",
    "",
    `Project: ${context?.project?.name ?? "Unknown"} (${context?.project?.slug ?? "unknown"})`,
    `Project description: ${context?.project?.description || "(none)"}`,
    "",
    "Existing cards:",
    existingCards,
    "",
    "Recent conversation:",
    recentMessages || "(none)",
    "",
    `Latest user message: ${userMessage}`,
    "",
    "Output shape:",
    '{"todos":[{"title":"short action title","description":"plain language outcome","acceptanceCriteria":["simple user-verifiable checklist item"],"priority":"low|medium|high","tags":["lowercase-kebab-case"]}]}',
  ].join("\n")
}

export async function generateChatCardDraft(
  userMessage: string,
  intent: ChatTodoIntent,
  context?: ChatIntentContext,
): Promise<GeneratedCardDraft> {
  const prompt = buildCardDraftPrompt(userMessage, intent, context)

  try {
    const result = await generateObject({
      model: getKimiLanguageModel(),
      temperature: getKimiTemperature(),
      schema: generatedCardSchema,
      prompt,
    })

    return result.object
  } catch {
    const result = await generateText({
      model: getKimiLanguageModel(),
      temperature: getKimiTemperature(),
      maxOutputTokens: 1_200,
      messages: [
        {
          role: "system",
          content:
            "Return only one valid JSON object. No markdown. No prose outside JSON.",
        },
        {
          role: "user",
          content: `${prompt}\n\nJSON shape:\n{"title":"string","description":"plain language outcome","acceptanceCriteria":["simple user-verifiable checklist item"],"priority":"low|medium|high","tags":["lowercase-kebab-case"]}`,
        },
      ],
    })

    const parsed = parseJsonObject(result.text)
    return normalizeGeneratedCardDraft(parsed, userMessage, intent)
  }
}

export async function generateChatCardDrafts(
  userMessage: string,
  context?: ChatIntentContext,
): Promise<GeneratedCardDraft[]> {
  if (!shouldInferTodoCards(userMessage, context)) {
    return []
  }

  const prompt = buildCardDraftsPrompt(userMessage, context)
  const fallbackIntent = inferChatTodoIntent(userMessage, context)

  try {
    const result = await generateObject({
      model: getKimiLanguageModel(),
      temperature: getKimiTemperature(),
      schema: generatedCardsSchema,
      prompt,
    })

    return uniqueNewDrafts(result.object.todos, context)
  } catch {
    const result = await generateText({
      model: getKimiLanguageModel(),
      temperature: getKimiTemperature(),
      maxOutputTokens: 2_000,
      messages: [
        {
          role: "system",
          content:
            "Return only one valid JSON object. No markdown. No prose outside JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const parsed = parseJsonObject(result.text)
    const input = parsed && typeof parsed === "object" ? parsed : {}
    const todos = Array.isArray((input as Record<string, unknown>).todos)
      ? ((input as Record<string, unknown>).todos as unknown[])
      : []

    return uniqueNewDrafts(
      todos.map((todo) =>
        normalizeGeneratedCardDraft(todo, userMessage, {
          shouldCreate: true,
          title:
            todo && typeof todo === "object" && "title" in todo
              ? String((todo as Record<string, unknown>).title)
              : fallbackIntent.title || "Create requested project task",
          description: fallbackIntent.description,
          acceptanceCriteria: fallbackIntent.acceptanceCriteria,
          priority: fallbackIntent.priority,
          tags: fallbackIntent.tags,
        }),
      ),
      context,
    )
  }
}
