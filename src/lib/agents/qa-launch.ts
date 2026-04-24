"server-only"

import {
  buildExecutionContextQuery,
  buildExecutionFeatureContext,
} from "@/lib/agents/execution-context"
import { fetchAuthAction, fetchAuthMutation } from "@/lib/auth-server"
import {
  deleteVercelDeploymentByUrl,
  ensureVercelProject,
} from "@/lib/boss/vercel"
import { embedText } from "@/lib/boss/embeddings"
import { runQaIntegration } from "@/lib/qa/integration"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

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

async function loadExecutionContext(
  projectId: Id<"projects">,
  project: {
    name: string
    description: string
  },
  cards: Array<{
    cardKey: string
    title: string
    description: string
  }>,
) {
  const query = buildExecutionContextQuery(project, cards)
  const context = await fetchAuthAction(api.projectChatActions.buildReplyContext, {
    projectId,
    embedding: embedText(query),
    recentLimit: 12,
    semanticLimit: 8,
  })

  return buildExecutionFeatureContext({
    project: {
      name: context.project.name,
      description: context.project.description || project.description,
    },
    cards,
    messages: context.messages,
  })
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

export async function launchQaExecution(input: {
  projectId: Id<"projects">
  cardKeys: string[]
  recoveryDepth?: number
}) {
  const recoveryDepth = input.recoveryDepth ?? 0
  const externalRunId = `qa-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`

  const claims = (
    await Promise.all(
      input.cardKeys.map((cardKey) =>
        fetchAuthMutation(api.projects.claimQaExecution, {
          projectId: input.projectId,
          cardKey,
          externalRunId,
        }),
      ),
    )
  ).filter((claim) => claim !== null)

  if (claims.length === 0) {
    return { status: "noop" as const }
  }

  const claim = claims[0]
  const previousDeploymentUrl = claim.project.latestPreviewDeploymentUrl
  const cards = claims.map((item) => item.card)
  const taskLabel =
    claims.length === 1
      ? `${claim.card.cardKey}: ${claim.card.title}`
      : `${claims.length} grouped tasks (${claims.map((item) => item.card.cardKey).join(", ")})`

  await saveQaMessage(
    input.projectId,
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
    const executionContext = await loadExecutionContext(
      input.projectId,
      {
        name: claim.project.name,
        description: claim.project.description,
      },
      cards,
    )

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
      cards,
      branchName: claim.branchName,
      context: executionContext,
      onStarted: async ({ sandboxId, commandId }) => {
        for (const item of claims) {
          await fetchAuthMutation(api.projects.markQaExecutionStarted, {
            projectId: input.projectId,
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
        projectId: input.projectId,
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
      input.projectId,
      `I finished checking ${taskLabel}. The tests passed and the preview is ready.`,
    )

    return {
      status: "completed" as const,
      previewDeploymentUrl: result.previewDeploymentUrl,
      previousDeploymentDeleted,
      cardKeys: claims.map((item) => item.card.cardKey),
    }
  } catch (error) {
    const message = `QA launch failed while ${stage}: ${errorMessage(error)}`
    const handBackToProgrammer = shouldHandBackToProgrammer(message)
    const canAutoRecover = recoveryDepth < 2

    try {
      const failures = []
      for (const item of claims) {
        failures.push(
          await fetchAuthMutation(api.projects.failQaExecution, {
            projectId: input.projectId,
            jobId: item.jobId,
            error: message.slice(0, 1_500),
            reassignToProgrammer: handBackToProgrammer && canAutoRecover,
          }),
        )
      }

      if (failures.some((failure) => failure.reassignedToProgrammer)) {
        await saveQaMessage(
          input.projectId,
          `I found a problem while checking ${taskLabel}. I'm sending it back to FIXER now, and I'll check it again after the fix is ready.`,
        )

        return {
          status: "reassigned_to_programmer" as const,
          cardKeys: failures.map((failure) => failure.cardKey),
        }
      }

      await saveQaMessage(
        input.projectId,
        canAutoRecover
          ? `I hit a problem while checking ${taskLabel}. I'll keep it in review so QA can retry instead of stopping the workflow.`
          : `I couldn't approve ${taskLabel}. It is still waiting for review until the issue is fixed and checked again.`,
      )
    } catch (failureUpdateError) {
      console.error("Unable to record QA failure", failureUpdateError)
    }

    return {
      status: canAutoRecover ? ("qa_retry_needed" as const) : ("qa_failed" as const),
      error: message,
      cardKeys: claims.map((item) => item.card.cardKey),
    }
  }
}
