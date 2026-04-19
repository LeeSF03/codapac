"server-only"

import { z } from "zod"

const bossTodoSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(2_000),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(240)).max(8),
  labels: z.array(z.string().trim().min(1).max(32)).max(6),
  priority: z.enum(["low", "medium", "high"]),
  agent: z.enum(["PM", "ENG", "QA"]),
})

export const bossPlanSchema = z.object({
  projectSummary: z.string().trim().min(1).max(600),
  todos: z.array(bossTodoSchema).min(1).max(20),
})

export type BossTodo = z.infer<typeof bossTodoSchema>
export type BossPlan = z.infer<typeof bossPlanSchema>
