"server-only"

import { generateText } from "ai"

import {
  getGlmLanguageModel,
  getGlmTemperature,
} from "@/lib/boss/glm"
import { bossPlanSchema, type BossPlan } from "@/lib/boss/schema"

type PlanningProjectContext = {
  name: string
  slug: string
  description: string
  visibility: "private" | "public"
  repoUrl: string | null
  prompt: string
}

function buildSystemPrompt() {
  return [
    "You are BOSS, the product manager agent for a software delivery workspace.",
    "Turn the project brief into an initial task list.",
    "Use plain, non-technical language because the project owner may not be technical.",
    "Return a single JSON object and nothing else.",
    "The JSON object must match this shape exactly:",
    "{",
    '  "projectSummary": "one concise paragraph",',
    '  "todos": [',
    "    {",
    '      "title": "short actionable title",',
    '      "description": "why this task matters and what to build",',
    '      "acceptanceCriteria": ["testable outcome"],',
    '      "labels": ["lowercase-kebab-case"],',
    '      "priority": "low|medium|high",',
    '      "agent": "ENG|QA"',
    "    }",
    "  ]",
    "}",
    "Rules:",
    "- Output between 5 and 12 todos unless the brief is extremely small.",
    "- Focus on the first implementation wave only.",
    "- Prefer tasks that can be executed independently.",
    "- Make acceptanceCriteria concrete and testable.",
    "- Use ENG for build tasks.",
    "- Use QA for validation, regression, and release-readiness tasks.",
    "- Do not create PM tasks. BOSS handles planning in chat instead of assigning work to itself.",
    "- labels must be lowercase kebab-case and short.",
    "- Do not mark missing setup details as blockers.",
    "- Do not ask the user for technical setup details unless they explicitly ask to provide them.",
    "- Do not mention deployment strategy, hosting providers, repositories, tokens, branches, file names, frameworks, environments, or technical scope in user-facing titles or descriptions.",
  ].join("\n")
}

function buildUserPrompt(project: PlanningProjectContext) {
  return [
    `Project name: ${project.name}`,
    `Project slug: ${project.slug}`,
    `Visibility: ${project.visibility}`,
    `Existing description: ${project.description || "(none provided)"}`,
    "Kickoff brief:",
    project.prompt,
  ].join("\n\n")
}

function parseJsonObject(value: string) {
  const trimmed = value.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  const source = fenced?.[1] ?? trimmed
  return JSON.parse(source) as unknown
}

export async function generateBossPlan(
  project: PlanningProjectContext,
): Promise<BossPlan> {
  const result = await generateText({
    model: getGlmLanguageModel(),
    temperature: getGlmTemperature(),
    maxOutputTokens: 4_000,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      {
        role: "user",
        content: buildUserPrompt(project),
      },
    ],
  })

  const content = result.text.trim()
  if (!content) {
    throw new Error("GLM did not return a JSON planning payload.")
  }

  if (result.finishReason === "length") {
    throw new Error(
      "GLM returned a truncated planning payload. Increase max_tokens or shorten the brief.",
    )
  }

  const parsed = parseJsonObject(content)
  return bossPlanSchema.parse(parsed)
}
