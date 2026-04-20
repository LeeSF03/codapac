import { NextResponse } from "next/server"
import { z } from "zod"

import { ensureVercelProject } from "@/lib/boss/vercel"
import { fetchAuthMutation, getAuthUser } from "@/lib/auth-server"
import { runQaIntegration } from "@/lib/qa/integration"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

export const runtime = "nodejs"

const launchBodySchema = z.object({
  projectId: z.string().min(1),
  cardKey: z.string().trim().min(1),
})

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "QA failed."
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
  const cardKey = parsedBody.data.cardKey
  const externalRunId = `qa-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`

  const claim = await fetchAuthMutation(api.projects.claimQaExecution, {
    projectId,
    cardKey,
    externalRunId,
  })

  if (!claim) {
    return NextResponse.json({ status: "noop" }, { status: 202 })
  }

  let stage = "preparing QA"

  try {
    stage = "checking the Vercel project"
    await ensureVercelProject({
      name: claim.project.name,
      slug: claim.project.slug,
      repoUrl: claim.project.repoUrl,
    })

    stage = "writing and running integration tests"
    const result = await runQaIntegration({
      externalRunId,
      project: {
        name: claim.project.name,
        slug: claim.project.slug,
        description: claim.project.description,
        repoUrl: claim.project.repoUrl,
        vercelProjectId: claim.project.vercelProjectId,
      },
      card: claim.card,
      branchName: claim.branchName,
      onStarted: async ({ sandboxId, commandId }) => {
        await fetchAuthMutation(api.projects.markQaExecutionStarted, {
          projectId,
          jobId: claim.jobId,
          sandboxId,
          commandId,
          notes: "QA is writing and running integration tests.",
        })
      },
    })

    stage = "saving QA results"
    await fetchAuthMutation(api.projects.completeQaExecution, {
      projectId,
      jobId: claim.jobId,
      previewDeploymentUrl: result.previewDeploymentUrl,
      summary: result.summary.slice(0, 1_500),
    })

    return NextResponse.json({
      status: "completed",
      previewDeploymentUrl: result.previewDeploymentUrl,
    })
  } catch (error) {
    const message = `QA launch failed while ${stage}: ${errorMessage(error)}`

    try {
      await fetchAuthMutation(api.projects.failQaExecution, {
        projectId,
        jobId: claim.jobId,
        error: message.slice(0, 1_500),
      })
    } catch (failureUpdateError) {
      console.error("Unable to record QA failure", failureUpdateError)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
