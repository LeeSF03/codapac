"server-only"

import { generateObject, generateText } from "ai"
import { z } from "zod"

import { getGlmLanguageModel, getGlmTemperature } from "@/lib/boss/glm"

type ChatTodoIntent = {
  shouldCreate: boolean
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: "low" | "medium" | "high"
  tags: string[]
  agent: "PM" | "ENG" | "QA"
}

type ChatIntentContext = {
  cards?: Array<{
    cardKey?: string
    title: string
    tone?: string
    agent?: string
    tags?: string[]
  }>
  messages?: Array<{
    author: "USER" | "BOSS" | "PROGRAMMER" | "QA" | "SYSTEM"
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
  agent: z.enum(["PM", "ENG", "QA"]),
})

const generatedCardsSchema = z.object({
  todos: z.array(generatedCardSchema).max(8),
})

const programmerLaunchGroupsSchema = z.object({
  groups: z.array(z.array(z.string().trim().min(1)).min(1).max(5)).min(1).max(6),
})

const agentRoutingDecisionSchema = z.object({
  responseAgent: z.enum(["BOSS", "PROGRAMMER", "QA"]),
  action: z.enum(["respond_only", "start_programmer", "start_qa"]),
  programmerCardKeys: z.array(z.string().trim().min(1)).max(8),
  qaCardKeys: z.array(z.string().trim().min(1)).max(8),
  rationale: z.string().trim().min(1).max(400),
})

const executionNudgeSchema = z.object({
  action: z.enum(["respond_only", "start_programmer", "start_qa"]),
  programmerCardKeys: z.array(z.string().trim().min(1)).max(8),
  qaCardKeys: z.array(z.string().trim().min(1)).max(8),
  rationale: z.string().trim().min(1).max(400),
})

type GeneratedCardDraft = z.infer<typeof generatedCardSchema>
type AgentRoutingDecisionDraft = z.infer<typeof agentRoutingDecisionSchema>
type ExecutionNudgeDraft = z.infer<typeof executionNudgeSchema>
type LaunchCard = { cardKey: string; title: string }
type AgentRoutingDecision = {
  replyAuthor: "BOSS" | "PROGRAMMER" | "QA"
  action: "respond_only" | "start_programmer" | "start_qa"
  programmerLaunchCards: LaunchCard[]
  qaLaunchCards: LaunchCard[]
}

function extractJsonObjectSource(value: string) {
  const trimmed = value.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  const source = fenced?.[1] ?? trimmed
  const firstBrace = source.indexOf("{")
  const lastBrace = source.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Card draft response did not contain a JSON object.")
  }

  return source
    .slice(firstBrace, lastBrace + 1)
    .replace(/\u0000/g, "")
    .trim()
}

function parseJsonObject(value: string) {
  return JSON.parse(extractJsonObjectSource(value)) as unknown
}

async function repairJsonObject(
  rawValue: string,
  shapeHint: string,
) {
  const result = await generateText({
    model: getGlmLanguageModel(),
    temperature: getGlmTemperature(),
    maxOutputTokens: 2_000,
    messages: [
      {
        role: "system",
        content: [
          "You repair malformed JSON.",
          "Return one valid JSON object only.",
          "Do not add markdown fences.",
          "Do not change the meaning of the payload more than necessary.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          "Repair this malformed JSON so it parses as a single JSON object.",
          `Expected shape: ${shapeHint}`,
          "",
          rawValue,
        ].join("\n"),
      },
    ],
  })

  return parseJsonObject(result.text)
}

async function parseJsonObjectWithRepair(
  value: string,
  shapeHint: string,
) {
  try {
    return parseJsonObject(value)
  } catch {
    const repairInput = (() => {
      try {
        return extractJsonObjectSource(value)
      } catch {
        return value
      }
    })()

    return await repairJsonObject(repairInput, shapeHint)
  }
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
  const rawAgent =
    record.agent === "PM" || record.agent === "ENG" || record.agent === "QA"
      ? record.agent
      : intent.agent
  const agent = rawAgent === "QA" ? "QA" : "ENG"
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
    agent,
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

const EXECUTION_COMMAND =
  /\b(start|begin|run|execute|kick\s*off|work\s+on|continue|resume)\b.*\b(implement(?:ing|ation)?|build(?:ing)?|cod(?:e|ing)|develop(?:ing|ment)?|features?|tasks?|cards?|all|everything)\b/i

const BUILD_COMMAND =
  /\b(start|begin|run|execute|kick\s*off|work\s+on|get\s+to\s+work|continue|resume)\b.*\b(build(?:ing)?|cod(?:e|ing)|implement(?:ing|ation)?|develop(?:ing|ment)?|make\s+it|create\s+it)\b/i

const QA_COMMAND =
  /\b(qa|test|tests?|review|verify|check|validate|approve|quality)\b/i

const NEXT_STEP_COMMAND =
  /\b(next\s*step|proceed|continue|go\s*ahead|move\s*on|carry\s*on|next|ready)\b/i

const QUESTION_ONLY =
  /^(what|why|how|when|where|who|can you explain|summari[sz]e|tell me|status|is there)\b/i

const EXECUTION_CONFIRMATION =
  /^(?:alright|all right|ok|okay|sure|yep|yeah|go ahead|proceed|continue|carry on|crack on|start now|begin|you can start|do it|let'?s go)[.! ]*$/i

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

function inferAgent(message: string): "PM" | "ENG" | "QA" {
  const lower = message.toLowerCase()
  if (/\b(test|qa|verify|check|review|regression|acceptance)\b/.test(lower)) {
    return "QA"
  }
  return "ENG"
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
    agent: "PM",
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

export function isProgrammerExecutionIntent(message: string) {
  const trimmed = message.trim()
  return EXECUTION_COMMAND.test(trimmed) || BUILD_COMMAND.test(trimmed)
}

export function isQaExecutionIntent(message: string) {
  const trimmed = message.trim()
  return QA_COMMAND.test(trimmed) || (NEXT_STEP_COMMAND.test(trimmed) && !QUESTION_ONLY.test(trimmed))
}

function hasProgrammerTodoCards(context?: ChatIntentContext) {
  return (context?.cards ?? []).some(
    (card) => card.tone === "todo" && card.agent === "ENG",
  )
}

function isExplicitQaRequest(message: string) {
  const trimmed = message.trim()
  return QA_COMMAND.test(trimmed)
}

function isGenericContinueRequest(message: string) {
  const trimmed = message.trim()
  return NEXT_STEP_COMMAND.test(trimmed) && !QUESTION_ONLY.test(trimmed) && !QA_COMMAND.test(trimmed)
}

export function inferQaLaunchCards(
  message: string,
  context?: ChatIntentContext,
) {
  if (!isQaExecutionIntent(message)) {
    return []
  }

  if (isGenericContinueRequest(message) && hasProgrammerTodoCards(context)) {
    return []
  }

  const readyForReview = (context?.cards ?? [])
    .filter((card) => (card.agent === "QA" && card.tone === "todo") || card.tone === "done")
    .map((card) => ({
      cardKey: card.cardKey ?? "",
      title: card.title,
    }))
    .filter((card) => card.cardKey)

  const unique = Array.from(
    new Map(readyForReview.map((card) => [card.cardKey, card])).values(),
  )

  if (
    QA_COMMAND.test(message) ||
    /\b(all|everything|features?|tasks?|cards?|next\s*step|proceed|continue|go\s*ahead)\b/i.test(
      message,
    )
  ) {
    return unique.slice(0, 8)
  }

  return unique.slice(0, 1)
}

export function inferProgrammerLaunchCards(
  message: string,
  context?: ChatIntentContext,
  createdTodos: Array<{ id: string; title: string; agent: string }> = [],
) {
  const shouldStartProgrammer =
    isProgrammerExecutionIntent(message) ||
    (NEXT_STEP_COMMAND.test(message.trim()) &&
      !(context?.cards ?? []).some((card) => card.tone === "done") &&
      (context?.cards ?? []).some((card) => card.tone === "todo"))

  if (!shouldStartProgrammer) {
    return []
  }

  const existingCards = (context?.cards ?? [])
    .filter((card) => card.tone === "todo")
    .filter((card) => {
      if (card.agent === "ENG") {
        return true
      }
      return inferAgent(`${card.title} ${(card.tags ?? []).join(" ")}`) === "ENG"
    })
    .map((card) => ({
      cardKey: card.cardKey ?? "",
      title: card.title,
    }))
    .filter((card) => card.cardKey)

  const newCards = createdTodos
    .filter((todo) => todo.agent === "ENG")
    .map((todo) => ({
      cardKey: todo.id,
      title: todo.title,
    }))

  const candidates = [...existingCards, ...newCards]
  const unique = Array.from(
    new Map(candidates.map((card) => [card.cardKey, card])).values(),
  )

  if (/\b(all|everything|features?|tasks?|cards?)\b/i.test(message)) {
    return unique.slice(0, 8)
  }

  return unique.slice(0, 1)
}

function programmerCandidates(
  context?: ChatIntentContext,
  createdTodos: Array<{ id: string; title: string; agent: string }> = [],
) {
  const existingCards = (context?.cards ?? [])
    .filter((card) => card.tone === "todo")
    .filter((card) => {
      if (card.agent === "ENG") {
        return true
      }
      return inferAgent(`${card.title} ${(card.tags ?? []).join(" ")}`) === "ENG"
    })
    .map((card) => ({
      cardKey: card.cardKey ?? "",
      title: card.title,
    }))
    .filter((card) => card.cardKey)

  const newCards = createdTodos
    .filter((todo) => todo.agent === "ENG")
    .map((todo) => ({
      cardKey: todo.id,
      title: todo.title,
    }))

  return Array.from(
    new Map([...existingCards, ...newCards].map((card) => [card.cardKey, card])).values(),
  )
}

function qaCandidates(context?: ChatIntentContext) {
  return Array.from(
    new Map(
      (context?.cards ?? [])
        .filter((card) => (card.agent === "QA" && card.tone === "todo") || card.tone === "done")
        .map((card) => ({
          cardKey: card.cardKey ?? "",
          title: card.title,
        }))
        .filter((card) => card.cardKey)
        .map((card) => [card.cardKey, card]),
    ).values(),
  )
}

function pickAllowedCards(keys: string[], candidates: LaunchCard[]) {
  const allowed = new Map(candidates.map((card) => [card.cardKey, card]))
  const picked: LaunchCard[] = []
  const seen = new Set<string>()

  for (const key of keys) {
    const card = allowed.get(key)
    if (!card || seen.has(card.cardKey)) continue
    seen.add(card.cardKey)
    picked.push(card)
  }

  return picked
}

function fallbackAgentRoutingDecision(
  message: string,
  context?: ChatIntentContext,
  createdTodos: Array<{ id: string; title: string; agent: string }> = [],
): AgentRoutingDecision {
  const programmerLaunchCards = inferProgrammerLaunchCards(
    message,
    context,
    createdTodos,
  )
  const qaLaunchCards =
    programmerLaunchCards.length > 0 ? [] : inferQaLaunchCards(message, context)

  if (qaLaunchCards.length > 0) {
    return {
      replyAuthor: "QA",
      action: "start_qa",
      programmerLaunchCards: [],
      qaLaunchCards,
    }
  }

  if (
    programmerLaunchCards.length > 0 ||
    createdTodos.some((todo) => todo.agent === "ENG") ||
    isProgrammerExecutionIntent(message)
  ) {
    return {
      replyAuthor: "PROGRAMMER",
      action: "start_programmer",
      programmerLaunchCards,
      qaLaunchCards: [],
    }
  }

  return {
    replyAuthor: "BOSS",
    action: "respond_only",
    programmerLaunchCards: [],
    qaLaunchCards: [],
  }
}

function normalizeAgentRoutingDecision(
  draft: AgentRoutingDecisionDraft,
  programmerCards: LaunchCard[],
  qaCards: LaunchCard[],
) {
  const programmerLaunchCards =
    draft.action === "start_programmer"
      ? pickAllowedCards(draft.programmerCardKeys, programmerCards)
      : []
  const qaLaunchCards =
    draft.action === "start_qa" ? pickAllowedCards(draft.qaCardKeys, qaCards) : []

  if (qaLaunchCards.length > 0) {
    return {
      replyAuthor: "QA" as const,
      action: "start_qa" as const,
      programmerLaunchCards: [],
      qaLaunchCards,
    }
  }

  if (programmerLaunchCards.length > 0) {
    return {
      replyAuthor: "PROGRAMMER" as const,
      action: "start_programmer" as const,
      programmerLaunchCards,
      qaLaunchCards: [],
    }
  }

  return {
    replyAuthor: draft.responseAgent,
    action: "respond_only" as const,
    programmerLaunchCards: [],
    qaLaunchCards: [],
  }
}

function buildAgentRoutingPrompt(
  userMessage: string,
  context?: ChatIntentContext,
  createdTodos: Array<{ id: string; title: string; agent: string }> = [],
) {
  const recentMessages = (context?.messages ?? [])
    .slice(-10)
    .map((message) => `${message.author}: ${message.content}`)
    .join("\n")
  const programmerCards = programmerCandidates(context, createdTodos)
  const qaCards = qaCandidates(context)
  const otherCards = (context?.cards ?? [])
    .filter((card) => {
      const key = card.cardKey ?? ""
      return (
        key &&
        !programmerCards.some((candidate) => candidate.cardKey === key) &&
        !qaCards.some((candidate) => candidate.cardKey === key)
      )
    })
    .map((card) => `- ${card.cardKey}: ${card.title} (${card.tone}, ${card.agent ?? "unknown"})`)
    .join("\n")

  return [
    "Decide which project agent should respond to the latest user message and whether an execution should start now.",
    "",
    "Agents:",
    "- BOSS: product manager. Use for planning, clarification, prioritization, and non-execution replies.",
    "- PROGRAMMER: FIXER. Use when the user wants building/coding/implementation to start or continue.",
    "- QA: TESTEES. Use when the user wants checking/testing/review, or when explicit QA cards or review-ready cards should run next.",
    "",
    "Execution rules:",
    "- If the user asks to build, start building, code, implement, execute, run the work, or continue implementation, choose PROGRAMMER and start_programmer with relevant To Do build cards.",
    "- If the user asks to proceed/continue and there are remaining To Do build cards, prefer PROGRAMMER and start_programmer.",
    "- Only choose QA on proceed/continue when there is no remaining To Do build work, or when the user explicitly asks to test, verify, review, or QA.",
    '- Short confirmations such as "start now", "go ahead", "proceed", "continue", "you can start", or "begin" usually mean execution should start if executable cards already exist.',
    "- If the user is still discussing scope, choices, or priorities, choose BOSS and respond_only.",
    "- Do not choose BOSS when the user clearly asks to start execution and executable cards are available.",
    "- Only select card keys from the candidate lists below. Never invent card keys.",
    "",
    `Project: ${context?.project?.name ?? "Unknown"} (${context?.project?.slug ?? "unknown"})`,
    `Project goal: ${context?.project?.description || "(none)"}`,
    "",
    "Programmer To Do candidates:",
    programmerCards.length > 0
      ? programmerCards.map((card) => `- ${card.cardKey}: ${card.title}`).join("\n")
      : "none",
    "",
    "QA candidates:",
    qaCards.length > 0
      ? qaCards.map((card) => `- ${card.cardKey}: ${card.title}`).join("\n")
      : "none",
    "",
    "Other board cards:",
    otherCards || "none",
    "",
    "Recent conversation:",
    recentMessages || "(none)",
    "",
    `Latest user message: ${userMessage}`,
    "",
    "Examples:",
    '- If the latest user message is "Alright, you can start now" and there are programmer To Do candidates, return PROGRAMMER with start_programmer and the relevant card keys.',
    '- If the latest user message is "Please test it now" and there are QA candidates, return QA with start_qa and the relevant card keys.',
    '- If the latest user message is "Which option is better?" return BOSS with respond_only.',
    "",
    "Return JSON only with this shape:",
    '{"responseAgent":"BOSS|PROGRAMMER|QA","action":"respond_only|start_programmer|start_qa","programmerCardKeys":["CARD-1"],"qaCardKeys":["CARD-2"],"rationale":"short reason"}',
  ].join("\n")
}

function buildExecutionNudgePrompt(
  userMessage: string,
  programmerCards: LaunchCard[],
  qaCards: LaunchCard[],
  context?: ChatIntentContext,
) {
  const recentMessages = (context?.messages ?? [])
    .slice(-8)
    .map((message) => `${message.author}: ${message.content}`)
    .join("\n")

  return [
    "Decide whether the latest user message means execution should start right now.",
    "This is only for ambiguous follow-up messages after tasks already exist.",
    "Prefer start_programmer when the message is a brief confirmation to begin queued build work.",
    "Prefer start_qa when the message is a brief confirmation to begin queued QA work.",
    'Phrases like "start now", "go ahead", "proceed", "continue", "crack on", "carry on", "you can start", and "begin" usually mean execution should start if relevant queued cards exist.',
    "Return respond_only only if the message is not actually authorizing execution.",
    "",
    `Project: ${context?.project?.name ?? "Unknown"} (${context?.project?.slug ?? "unknown"})`,
    "",
    "Programmer candidates:",
    programmerCards.length > 0
      ? programmerCards.map((card) => `- ${card.cardKey}: ${card.title}`).join("\n")
      : "none",
    "",
    "QA candidates:",
    qaCards.length > 0
      ? qaCards.map((card) => `- ${card.cardKey}: ${card.title}`).join("\n")
      : "none",
    "",
    "Recent conversation:",
    recentMessages || "(none)",
    "",
    `Latest user message: ${userMessage}`,
    "",
    "Examples:",
    '- "Alright, crack on" with programmer candidates -> start_programmer.',
    '- "Go ahead and test it" with QA candidates -> start_qa.',
    '- "What is left?" -> respond_only.',
    "",
    "Return JSON only with this shape:",
    '{"action":"respond_only|start_programmer|start_qa","programmerCardKeys":["CARD-1"],"qaCardKeys":["CARD-2"],"rationale":"short reason"}',
  ].join("\n")
}

async function maybeNudgeExecutionStart(
  userMessage: string,
  context: ChatIntentContext | undefined,
  programmerCards: LaunchCard[],
  qaCards: LaunchCard[],
  decision: AgentRoutingDecision,
) {
  if (decision.programmerLaunchCards.length > 0 || decision.qaLaunchCards.length > 0) {
    return decision
  }

  if (decision.replyAuthor !== "BOSS") {
    return decision
  }

  if (programmerCards.length === 0 && qaCards.length === 0) {
    return decision
  }

  try {
    const result = await generateObject({
      model: getGlmLanguageModel(),
      temperature: getGlmTemperature(),
      schema: executionNudgeSchema,
      prompt: buildExecutionNudgePrompt(
        userMessage,
        programmerCards,
        qaCards,
        context,
      ),
    })

    const draft: ExecutionNudgeDraft = result.object
    const programmerLaunchCards =
      draft.action === "start_programmer"
        ? pickAllowedCards(draft.programmerCardKeys, programmerCards)
        : []
    const qaLaunchCards =
      draft.action === "start_qa"
        ? pickAllowedCards(draft.qaCardKeys, qaCards)
        : []

    if (qaLaunchCards.length > 0) {
      return {
        replyAuthor: "QA" as const,
        action: "start_qa" as const,
        programmerLaunchCards: [],
        qaLaunchCards,
      }
    }

    if (programmerLaunchCards.length > 0) {
      return {
        replyAuthor: "PROGRAMMER" as const,
        action: "start_programmer" as const,
        programmerLaunchCards,
        qaLaunchCards: [],
      }
    }
  } catch {
    return decision
  }

  return decision
}

function preferProgrammerForGenericContinue(
  userMessage: string,
  programmerCards: LaunchCard[],
  qaCards: LaunchCard[],
  decision: AgentRoutingDecision,
) {
  if (!isGenericContinueRequest(userMessage)) {
    return decision
  }

  if (isExplicitQaRequest(userMessage)) {
    return decision
  }

  if (programmerCards.length === 0) {
    return decision
  }

  if (decision.programmerLaunchCards.length > 0) {
    return decision
  }

  return {
    replyAuthor: "PROGRAMMER" as const,
    action: "start_programmer" as const,
    programmerLaunchCards: [programmerCards[0]],
    qaLaunchCards: [],
  }
}

function forceExecutionStartFromConfirmation(
  userMessage: string,
  programmerCards: LaunchCard[],
  qaCards: LaunchCard[],
  decision: AgentRoutingDecision,
) {
  if (decision.programmerLaunchCards.length > 0 || decision.qaLaunchCards.length > 0) {
    return decision
  }

  const trimmed = userMessage.trim()
  if (!EXECUTION_CONFIRMATION.test(trimmed)) {
    return decision
  }

  if (programmerCards.length > 0) {
  return {
    replyAuthor: "PROGRAMMER" as const,
    action: "start_programmer" as const,
    programmerLaunchCards: [programmerCards[0]],
    qaLaunchCards: [],
  }
}

  if (qaCards.length > 0) {
    return {
      replyAuthor: "QA" as const,
      action: "start_qa" as const,
      programmerLaunchCards: [],
      qaLaunchCards: [qaCards[0]],
    }
  }

  return decision
}

export async function generateAgentRoutingDecision(
  userMessage: string,
  context?: ChatIntentContext,
  createdTodos: Array<{ id: string; title: string; agent: string }> = [],
): Promise<AgentRoutingDecision> {
  const programmerCards = programmerCandidates(context, createdTodos)
  const qaCards = qaCandidates(context)

  try {
    const result = await generateObject({
      model: getGlmLanguageModel(),
      temperature: getGlmTemperature(),
      schema: agentRoutingDecisionSchema,
      prompt: buildAgentRoutingPrompt(userMessage, context, createdTodos),
    })

    const decision = normalizeAgentRoutingDecision(
      result.object,
      programmerCards,
      qaCards,
    )

    const nudgedDecision = await maybeNudgeExecutionStart(
      userMessage,
      context,
      programmerCards,
      qaCards,
      decision,
    )

    return forceExecutionStartFromConfirmation(
      userMessage,
      programmerCards,
      qaCards,
      preferProgrammerForGenericContinue(
        userMessage,
        programmerCards,
        qaCards,
        nudgedDecision,
      ),
    )
  } catch {
    return forceExecutionStartFromConfirmation(
      userMessage,
      programmerCards,
      qaCards,
      preferProgrammerForGenericContinue(
        userMessage,
        programmerCards,
        qaCards,
        fallbackAgentRoutingDecision(userMessage, context, createdTodos),
      ),
    )
  }
}

function fallbackProgrammerLaunchGroups(
  cards: Array<{ cardKey: string; title: string }>,
) {
  if (cards.length <= 1) {
    return cards.map((card) => [card.cardKey])
  }

  const largeTask =
    /\b(auth|database|backend|payment|migration|redesign|architecture|integration|api|security|admin|dashboard|workflow)\b/i

  const groups: string[][] = []
  let currentSmallGroup: string[] = []

  for (const card of cards) {
    if (largeTask.test(card.title)) {
      if (currentSmallGroup.length > 0) {
        groups.push(currentSmallGroup)
        currentSmallGroup = []
      }
      groups.push([card.cardKey])
      continue
    }

    currentSmallGroup.push(card.cardKey)
    if (currentSmallGroup.length >= 4) {
      groups.push(currentSmallGroup)
      currentSmallGroup = []
    }
  }

  if (currentSmallGroup.length > 0) {
    groups.push(currentSmallGroup)
  }

  return groups
}

function normalizeProgrammerLaunchGroups(
  value: unknown,
  cards: Array<{ cardKey: string; title: string }>,
) {
  const allowed = new Set(cards.map((card) => card.cardKey))
  const seen = new Set<string>()
  const parsed = programmerLaunchGroupsSchema.safeParse(value)
  if (!parsed.success) {
    return fallbackProgrammerLaunchGroups(cards)
  }

  const groups = parsed.data.groups
    .map((group) =>
      group.filter((cardKey) => {
        if (!allowed.has(cardKey) || seen.has(cardKey)) {
          return false
        }
        seen.add(cardKey)
        return true
      }),
    )
    .filter((group) => group.length > 0)

  for (const card of cards) {
    if (!seen.has(card.cardKey)) {
      groups.push([card.cardKey])
    }
  }

  return groups.length > 0 ? groups : fallbackProgrammerLaunchGroups(cards)
}

export async function generateProgrammerLaunchGroups(
  userMessage: string,
  cards: Array<{ cardKey: string; title: string }>,
) {
  if (cards.length <= 1) {
    return fallbackProgrammerLaunchGroups(cards)
  }

  const prompt = [
    "You are the programmer agent deciding how to group work into implementation branches.",
    "Group small, related tasks into the same branch so they can be built together.",
    "Keep large, risky, unrelated, or cross-cutting tasks in their own branch.",
    "Prefer 2-4 tasks per group when tasks are clearly related.",
    "Return only JSON matching this shape:",
    '{"groups":[["CARD-1","CARD-2"],["CARD-3"]]}',
    "",
    `User command: ${userMessage}`,
    "",
    "Candidate cards:",
    cards.map((card) => `- ${card.cardKey}: ${card.title}`).join("\n"),
  ].join("\n")

  try {
    const result = await generateObject({
      model: getGlmLanguageModel(),
      temperature: getGlmTemperature(),
      schema: programmerLaunchGroupsSchema,
      prompt,
    })

    return normalizeProgrammerLaunchGroups(result.object, cards)
  } catch {
    return fallbackProgrammerLaunchGroups(cards)
  }
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
        agent: inferAgent(confirmedTitle),
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
    agent: inferAgent(trimmed),
  }
}

function shouldInferTodoCards(message: string, context?: ChatIntentContext) {
  const trimmed = message.trim()
  if (!trimmed) {
    return false
  }

  if (isProgrammerExecutionIntent(trimmed) && (context?.cards ?? []).length > 0) {
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
    "- agent: ENG for building or changing the product, QA for checking/testing.",
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
    "Use ENG for building or changing the product, and QA for checking/testing.",
    "Do not create PM cards. BOSS handles planning in chat instead of assigning work to itself.",
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
    '{"todos":[{"title":"short action title","description":"plain language outcome","acceptanceCriteria":["simple user-verifiable checklist item"],"priority":"low|medium|high","tags":["lowercase-kebab-case"],"agent":"ENG|QA"}]}',
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
      model: getGlmLanguageModel(),
      temperature: getGlmTemperature(),
      schema: generatedCardSchema,
      prompt,
    })

    return normalizeGeneratedCardDraft(result.object, userMessage, intent)
  } catch {
    const result = await generateText({
      model: getGlmLanguageModel(),
      temperature: getGlmTemperature(),
      maxOutputTokens: 1_200,
      messages: [
        {
          role: "system",
          content:
            "Return only one valid JSON object. No markdown. No prose outside JSON.",
        },
        {
          role: "user",
          content: `${prompt}\n\nJSON shape:\n{"title":"string","description":"plain language outcome","acceptanceCriteria":["simple user-verifiable checklist item"],"priority":"low|medium|high","tags":["lowercase-kebab-case"],"agent":"ENG|QA"}`,
        },
      ],
    })

    const parsed = await parseJsonObjectWithRepair(
      result.text,
      '{"title":"string","description":"string","acceptanceCriteria":["string"],"priority":"low|medium|high","tags":["lowercase-kebab-case"],"agent":"ENG|QA"}',
    )
    return normalizeGeneratedCardDraft(parsed, userMessage, intent)
  }
}

export async function generateChatCardDrafts(
  userMessage: string,
  context?: ChatIntentContext,
): Promise<GeneratedCardDraft[]> {
  const prompt = buildCardDraftsPrompt(userMessage, context)
  const fallbackIntent = inferChatTodoIntent(userMessage, context)

  try {
    const result = await generateObject({
      model: getGlmLanguageModel(),
      temperature: getGlmTemperature(),
      schema: generatedCardsSchema,
      prompt,
    })

    return uniqueNewDrafts(
      result.object.todos.map((todo) =>
        normalizeGeneratedCardDraft(todo, userMessage, fallbackIntent),
      ),
      context,
    )
  } catch {
    if (!shouldInferTodoCards(userMessage, context)) {
      return []
    }

    const result = await generateText({
      model: getGlmLanguageModel(),
      temperature: getGlmTemperature(),
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

    const parsed = await parseJsonObjectWithRepair(
      result.text,
      '{"todos":[{"title":"string","description":"string","acceptanceCriteria":["string"],"priority":"low|medium|high","tags":["lowercase-kebab-case"],"agent":"ENG|QA"}]}',
    )
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
          agent: fallbackIntent.agent,
        }),
      ),
      context,
    )
  }
}
