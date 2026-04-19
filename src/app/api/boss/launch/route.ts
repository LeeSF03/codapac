import { NextResponse } from "next/server"
import { z } from "zod"

import { createProjectRepository } from "@/lib/boss/github"
import { generateBossPlan } from "@/lib/boss/planner"
import { getAuthUser, fetchAuthMutation } from "@/lib/auth-server"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

const launchBodySchema = z.object({
  projectId: z.string().min(1),
})

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "BOSS planning failed."
}

export async function POST(request: Request) {
  if (!(await getAuthUser())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const parsedBody = launchBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const projectId = parsedBody.data.projectId as Id<"projects">
  const externalRunId = `boss-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`

  const claim = await fetchAuthMutation(api.projects.claimBossPlanning, {
    projectId,
    externalRunId,
  })

  if (!claim) {
    return NextResponse.json({ status: "noop" }, { status: 202 })
  }

  let repoUrl = claim.project.repoUrl

  try {
    if (!repoUrl) {
      repoUrl = await createProjectRepository({
        name: claim.project.name,
        slug: claim.project.slug,
        description: claim.project.description,
        visibility: claim.project.visibility,
      })
    }

    const plan = await generateBossPlan({
      name: claim.project.name,
      slug: claim.project.slug,
      description: claim.project.description,
      visibility: claim.project.visibility,
      repoUrl,
      prompt: claim.prompt,
    })

    const completion = await fetchAuthMutation(api.projects.completeBossPlanning, {
      projectId,
      jobId: claim.jobId,
      repoUrl,
      summary: plan.projectSummary,
      todos: plan.todos,
    })

    return NextResponse.json({
      status: "completed",
      createdCount: completion.createdCount,
      repoUrl,
    })
  } catch (error) {
    const message = errorMessage(error)

    await fetchAuthMutation(api.projects.failBossPlanning, {
      projectId,
      jobId: claim.jobId,
      repoUrl,
      error: message.slice(0, 1_500),
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
