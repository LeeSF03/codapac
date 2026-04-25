import { NextResponse } from "next/server"
import { z } from "zod"

import { getAuthUser } from "@/lib/auth-server"
import { runProjectLoop } from "@/lib/agents/orchestrator"
import { launchQaExecution } from "@/lib/agents/qa-launch"

import type { Id } from "~/convex/_generated/dataModel"

export const runtime = "nodejs"

const launchBodySchema = z
  .object({
    projectId: z.string().min(1),
    cardKey: z.string().trim().min(1).optional(),
    cardKeys: z.array(z.string().trim().min(1)).min(1).max(5).optional(),
    recoveryDepth: z.number().int().min(0).max(3).optional(),
  })
  .refine((value) => Boolean(value.cardKey || value.cardKeys?.length), {
    message: "cardKey or cardKeys is required.",
  })

export async function POST(request: Request) {
  if (!(await getAuthUser())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const parsedBody = launchBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const projectId = parsedBody.data.projectId as Id<"projects">
  const cardKeys = Array.from(
    new Set([
      ...(parsedBody.data.cardKeys ?? []),
      ...(parsedBody.data.cardKey ? [parsedBody.data.cardKey] : []),
    ]),
  )

  const result = await launchQaExecution({
    projectId,
    cardKeys,
    recoveryDepth: parsedBody.data.recoveryDepth,
  })

  if (result.status === "noop") {
    return NextResponse.json({ status: "noop" }, { status: 202 })
  }

  if (result.status === "completed") {
    const continuation = await runProjectLoop({
      projectId,
      trigger: "qa_finished",
      maxSteps: 6,
    })

    return NextResponse.json({
      ...result,
      continuation,
    })
  }

  if (result.status === "reassigned_to_programmer") {
    const continuation = await runProjectLoop({
      projectId,
      trigger: "qa_failed",
      preferredCardKeys: result.cardKeys,
      maxSteps: 6,
    })

    return NextResponse.json(
      {
        ...result,
        continuation,
      },
      { status: 202 },
    )
  }

  if (result.status === "qa_retry_needed") {
    return NextResponse.json(
      result,
      { status: 202 },
    )
  }

  return NextResponse.json(result, { status: 202 })
}
