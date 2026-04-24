import { NextResponse } from "next/server"
import { z } from "zod"

import { runProjectLoop, type ProjectLoopTrigger } from "@/lib/agents/orchestrator"
import { getAuthUser } from "@/lib/auth-server"

import type { Id } from "~/convex/_generated/dataModel"

export const runtime = "nodejs"

const requestSchema = z.object({
  projectId: z.string().min(1),
  trigger: z.enum([
    "chat_continue",
    "manual_start",
    "manual_advance",
    "programmer_finished",
    "qa_finished",
    "qa_failed",
  ]),
  preferredCardKeys: z.array(z.string().trim().min(1)).max(5).optional(),
  maxSteps: z.number().int().min(1).max(8).optional(),
})

export async function POST(request: Request) {
  if (!(await getAuthUser())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const body = requestSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const result = await runProjectLoop({
    projectId: body.data.projectId as Id<"projects">,
    trigger: body.data.trigger as ProjectLoopTrigger,
    preferredCardKeys: body.data.preferredCardKeys,
    maxSteps: body.data.maxSteps,
  })

  return NextResponse.json(result)
}
