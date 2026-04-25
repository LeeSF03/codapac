import { NextResponse } from "next/server"
import { z } from "zod"

import { getAuthUser } from "@/lib/auth-server"
import { runProjectLoop } from "@/lib/agents/orchestrator"
import { launchProgrammerExecution } from "@/lib/agents/programmer-launch"

import type { Id } from "~/convex/_generated/dataModel"

export const runtime = "nodejs"

const launchBodySchema = z
  .object({
    projectId: z.string().min(1),
    cardKey: z.string().trim().min(1).optional(),
    cardKeys: z.array(z.string().trim().min(1)).min(1).max(5).optional(),
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

  const result = await launchProgrammerExecution({
    projectId,
    cardKeys,
  })

  if (result.status === "failed") {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (result.status === "noop") {
    return NextResponse.json({ status: "noop" }, { status: 202 })
  }

  if (result.status === "programmer_retry_needed") {
    return NextResponse.json(
      result,
      { status: 202 },
    )
  }

  const continuation = await runProjectLoop({
    projectId,
    trigger: "programmer_finished",
    maxSteps: 6,
  })

  return NextResponse.json({
    ...result,
    continuation,
  })
}
