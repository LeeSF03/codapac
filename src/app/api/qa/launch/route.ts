import { NextResponse } from "next/server"
import { z } from "zod"

import { ensureVercelProject } from "@/lib/boss/vercel"
import { embedText } from "@/lib/boss/embeddings"
import { fetchAuthMutation, getAuthUser } from "@/lib/auth-server"
import { runQaIntegration } from "@/lib/qa/integration"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

export const runtime = "nodejs"

const launchBodySchema = z.object({
  projectId: z.string().min(1),
  cardKey: z.string().trim().min(1),
  recoveryDepth: z.number().int().min(0).max(3).optional(),
})

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "QA failed."
}

async function saveQaMessage(projectId: Id<"projects">, content: string) {
  try {
    await fetchAuthMutation(api.projectChat.saveMessage, {
      projectId,
      role: "assistant",
      author: "QA",
      content,
      embedding: embedText(content),
    })
  } catch (error) {
    console.error("Unable to save QA chat message", error)
  }
}

function shouldHandBackToProgrammer(message: string) {
  return /\b(running integration tests failed|test failed|tests failed|assertion|expected|received|failing test|failed test|npm err!|bun test)\b/i.test(
    message,
  )
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
  const recoveryDepth = parsedBody.data.recoveryDepth ?? 0
  const externalRunId = `qa-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`

  const claim = await fetchAuthMutation(api.projects.claimQaExecution, {
    projectId,
    cardKey,
    externalRunId,
  })

  if (!claim) {
    return NextResponse.json({ status: "noop" }, { status: 202 })
  }

  await saveQaMessage(
    projectId,
    `I'm checking ${claim.card.cardKey}: ${claim.card.title}. I'll write integration tests and report back when the review is done.`,
  )

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

    await saveQaMessage(
      projectId,
      `I finished checking ${claim.card.cardKey}: ${claim.card.title}. The tests passed and the preview is ready.`,
    )

    return NextResponse.json({
      status: "completed",
      previewDeploymentUrl: result.previewDeploymentUrl,
    })
  } catch (error) {
    const message = `QA launch failed while ${stage}: ${errorMessage(error)}`
    const handBackToProgrammer = shouldHandBackToProgrammer(message)
    const canAutoRecover = recoveryDepth < 2

    try {
      const failure = await fetchAuthMutation(api.projects.failQaExecution, {
        projectId,
        jobId: claim.jobId,
        error: message.slice(0, 1_500),
        reassignToProgrammer: handBackToProgrammer && canAutoRecover,
      })

      if (failure.reassignedToProgrammer) {
        await saveQaMessage(
          projectId,
          `I found a problem while checking ${claim.card.cardKey}: ${claim.card.title}. I'm sending it back to FIXER now, and I'll check it again after the fix is ready.`,
        )

        return NextResponse.json(
          {
            status: "reassigned_to_programmer",
            cardKey: failure.cardKey,
          },
          { status: 202 },
        )
      }

      await saveQaMessage(
        projectId,
        canAutoRecover
          ? `I hit a problem while checking ${claim.card.cardKey}: ${claim.card.title}. I'll keep it in review so QA can retry instead of stopping the workflow.`
          : `I couldn't approve ${claim.card.cardKey}: ${claim.card.title}. It is still waiting for review until the issue is fixed and checked again.`,
      )
    } catch (failureUpdateError) {
      console.error("Unable to record QA failure", failureUpdateError)
    }

    return NextResponse.json(
      {
        status: canAutoRecover ? "qa_retry_needed" : "qa_failed",
        error: message,
      },
      { status: 202 },
    )
  }
}
