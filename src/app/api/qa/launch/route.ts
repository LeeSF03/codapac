import { NextResponse } from "next/server"
import { z } from "zod"

import {
  deleteVercelDeploymentByUrl,
  ensureVercelProject,
} from "@/lib/boss/vercel"
import { embedText } from "@/lib/boss/embeddings"
import { fetchAuthMutation, getAuthUser } from "@/lib/auth-server"
import { runQaIntegration } from "@/lib/qa/integration"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

export const runtime = "nodejs"

const launchBodySchema = z.object({
  projectId: z.string().min(1),
  cardKey: z.string().trim().min(1).optional(),
  cardKeys: z.array(z.string().trim().min(1)).min(1).max(5).optional(),
  recoveryDepth: z.number().int().min(0).max(3).optional(),
}).refine((value) => Boolean(value.cardKey || value.cardKeys?.length), {
  message: "cardKey or cardKeys is required.",
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

function deploymentUrlsMatch(left: string, right: string) {
  try {
    const normalize = (value: string) => {
      const trimmed = value.trim()
      const withProtocol = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`
      return new URL(withProtocol).origin
    }

    return normalize(left) === normalize(right)
  } catch {
    return left.trim() === right.trim()
  }
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
  const cardKeys = Array.from(
    new Set([
      ...(parsedBody.data.cardKeys ?? []),
      ...(parsedBody.data.cardKey ? [parsedBody.data.cardKey] : []),
    ]),
  )
  const recoveryDepth = parsedBody.data.recoveryDepth ?? 0
  const externalRunId = `qa-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`

  const claims = (
    await Promise.all(
      cardKeys.map((cardKey) =>
        fetchAuthMutation(api.projects.claimQaExecution, {
          projectId,
          cardKey,
          externalRunId,
        }),
      ),
    )
  ).filter((claim) => claim !== null)

  if (claims.length === 0) {
    return NextResponse.json({ status: "noop" }, { status: 202 })
  }

  const claim = claims[0]
  const previousDeploymentUrl = claim.project.latestPreviewDeploymentUrl
  const taskLabel =
    claims.length === 1
      ? `${claim.card.cardKey}: ${claim.card.title}`
      : `${claims.length} grouped tasks (${claims.map((item) => item.card.cardKey).join(", ")})`

  await saveQaMessage(
    projectId,
    `I'm checking ${taskLabel}. I'll write integration tests and report back when the review is done.`,
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
      cards: claims.map((item) => item.card),
      branchName: claim.branchName,
      onStarted: async ({ sandboxId, commandId }) => {
        for (const item of claims) {
          await fetchAuthMutation(api.projects.markQaExecutionStarted, {
            projectId,
            jobId: item.jobId,
            sandboxId,
            commandId,
            notes:
              claims.length === 1
                ? "QA is writing and running integration tests."
                : "QA is writing and running integration tests for this grouped change.",
          })
        }
      },
    })

    stage = "saving QA results"
    for (const item of claims) {
      await fetchAuthMutation(api.projects.completeQaExecution, {
        projectId,
        jobId: item.jobId,
        previewDeploymentUrl: result.previewDeploymentUrl,
        summary: result.summary.slice(0, 1_500),
      })
    }

    let previousDeploymentDeleted = false
    if (
      previousDeploymentUrl &&
      !deploymentUrlsMatch(previousDeploymentUrl, result.previewDeploymentUrl)
    ) {
      try {
        await deleteVercelDeploymentByUrl(previousDeploymentUrl)
        previousDeploymentDeleted = true
      } catch (cleanupError) {
        console.error("Unable to delete previous Vercel deployment", cleanupError)
      }
    }

    await saveQaMessage(
      projectId,
      `I finished checking ${taskLabel}. The tests passed and the preview is ready.`,
    )

    return NextResponse.json({
      status: "completed",
      previewDeploymentUrl: result.previewDeploymentUrl,
      previousDeploymentDeleted,
      cardKeys: claims.map((item) => item.card.cardKey),
    })
  } catch (error) {
    const message = `QA launch failed while ${stage}: ${errorMessage(error)}`
    const handBackToProgrammer = shouldHandBackToProgrammer(message)
    const canAutoRecover = recoveryDepth < 2

    try {
      const failures = []
      for (const item of claims) {
        failures.push(
          await fetchAuthMutation(api.projects.failQaExecution, {
            projectId,
            jobId: item.jobId,
            error: message.slice(0, 1_500),
            reassignToProgrammer: handBackToProgrammer && canAutoRecover,
          }),
        )
      }

      if (failures.some((failure) => failure.reassignedToProgrammer)) {
        await saveQaMessage(
          projectId,
          `I found a problem while checking ${taskLabel}. I'm sending it back to FIXER now, and I'll check it again after the fix is ready.`,
        )

        return NextResponse.json(
          {
            status: "reassigned_to_programmer",
            cardKeys: failures.map((failure) => failure.cardKey),
          },
          { status: 202 },
        )
      }

      await saveQaMessage(
        projectId,
        canAutoRecover
          ? `I hit a problem while checking ${taskLabel}. I'll keep it in review so QA can retry instead of stopping the workflow.`
          : `I couldn't approve ${taskLabel}. It is still waiting for review until the issue is fixed and checked again.`,
      )
    } catch (failureUpdateError) {
      console.error("Unable to record QA failure", failureUpdateError)
    }

    return NextResponse.json(
      {
        status: canAutoRecover ? "qa_retry_needed" : "qa_failed",
        error: message,
        cardKeys: claims.map((item) => item.card.cardKey),
      },
      { status: 202 },
    )
  }
}
