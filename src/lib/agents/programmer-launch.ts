"server-only"

import {
  buildExecutionContextQuery,
  buildExecutionFeatureContext,
} from "@/lib/agents/execution-context"
import { fetchAuthAction, fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server"
import { createProjectRepository } from "@/lib/boss/github"
import { ensureVercelProject } from "@/lib/boss/vercel"
import { embedText } from "@/lib/boss/embeddings"
import { runProgrammerWithOpencode } from "@/lib/programmer/opencode"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Programmer failed."
}

async function saveProgrammerMessage(
  projectId: Id<"projects">,
  content: string,
) {
  try {
    await fetchAuthMutation(api.projectChat.saveMessage, {
      projectId,
      role: "assistant",
      author: "PROGRAMMER",
      content,
      embedding: embedText(content),
    })
  } catch (error) {
    console.error("Unable to save Programmer chat message", error)
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

export async function launchProgrammerExecution(input: {
  projectId: Id<"projects">
  cardKeys: string[]
}) {
  const externalRunId = `programmer-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
  const retryWorkspace =
    input.cardKeys.length === 1
      ? await fetchAuthQuery(api.projects.getCardState, {
          projectId: input.projectId,
          cardKey: input.cardKeys[0],
        }).then((state) => {
          if (!state) {
            return null
          }

          const latestFailedProgrammerJob = state.programmerJobs.find(
            (job) =>
              job.status === "failed" &&
              typeof job.sandboxId === "string" &&
              job.sandboxId.length > 0,
          )

          if (!latestFailedProgrammerJob) {
            return null
          }

          return {
            sandboxId: latestFailedProgrammerJob.sandboxId,
            branchName:
              typeof latestFailedProgrammerJob.branchName === "string" &&
              latestFailedProgrammerJob.branchName.length > 0
                ? latestFailedProgrammerJob.branchName
                : null,
          }
        })
      : null

  const claims = (
    await Promise.all(
      input.cardKeys.map((cardKey) =>
        fetchAuthMutation(api.projects.claimProgrammerExecution, {
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
  const taskLabel =
    claims.length === 1
      ? `${claim.card.cardKey}: ${claim.card.title}`
      : `${claims.length} grouped tasks (${claims.map((item) => item.card.cardKey).join(", ")})`

  await saveProgrammerMessage(
    input.projectId,
    `I'm starting ${taskLabel}. I'll merge it when the work is ready and post an update here when it's done.`,
  )

  let repoUrl = claim.project.repoUrl
  let vercelProjectId = claim.project.vercelProjectId ?? null
  let stage = "preparing the Programmer run"
  const cards = claims.map((item) => item.card)

  try {
    if (!repoUrl) {
      stage = "creating the project repository"
      repoUrl = await createProjectRepository({
        name: claim.project.name,
        slug: claim.project.slug,
        description: claim.project.description,
        visibility: claim.project.visibility,
      })
    }

    stage = "creating the Vercel project"
    const vercelProject = await ensureVercelProject({
      name: claim.project.name,
      slug: claim.project.slug,
      repoUrl,
    })
    vercelProjectId = vercelProject.id
    const readyRepoUrl = repoUrl
    const readyVercelProjectId = vercelProject.id
    const executionContext = await loadExecutionContext(
      input.projectId,
      {
        name: claim.project.name,
        description: claim.project.description,
      },
      cards,
    )

    stage = "running OpenCode in the Vercel Sandbox"
    const result = await runProgrammerWithOpencode({
      externalRunId,
      project: {
        name: claim.project.name,
        slug: claim.project.slug,
        description: claim.project.description,
        repoUrl: readyRepoUrl,
        vercelProjectId: readyVercelProjectId,
        vercelTeamId: vercelProject.teamId,
        vercelToken: vercelProject.token,
      },
      cards,
      context: executionContext,
      reuseSandboxId: retryWorkspace?.sandboxId ?? null,
      reuseBranchName: retryWorkspace?.branchName ?? null,
      onStarted: async ({ sandboxId, commandId, branchName }) => {
        await Promise.all(
          claims.map((item) =>
            fetchAuthMutation(api.projects.markProgrammerExecutionStarted, {
              projectId: input.projectId,
              jobId: item.jobId,
              repoUrl: readyRepoUrl,
              vercelProjectId: readyVercelProjectId,
              branchName,
              sandboxId,
              commandId,
              notes:
                claims.length === 1
                  ? "Programmer is working on the task."
                  : "Programmer is working on this grouped change.",
            }),
          ),
        )
      },
    })

    stage = "saving the Programmer result"
    await Promise.all(
      claims.map((item) =>
        fetchAuthMutation(api.projects.completeProgrammerExecution, {
          projectId: input.projectId,
          jobId: item.jobId,
          repoUrl: readyRepoUrl,
          vercelProjectId: readyVercelProjectId,
          branchName: result.branchName,
          summary: result.summary.slice(0, 1_500),
        }),
      ),
    )

    await saveProgrammerMessage(
      input.projectId,
      `I finished ${taskLabel} and merged it. The next step can continue from here.`,
    )

    return {
      status: "completed" as const,
      repoUrl,
      vercelProjectId,
      branchName: result.branchName,
      branchUrl: result.branchUrl,
      cardKeys: claims.map((item) => item.card.cardKey),
    }
  } catch (error) {
    const message = `Programmer launch failed while ${stage}: ${errorMessage(error)}`
    const keepInProgress = /workspace was kept alive/i.test(message)

    try {
      await Promise.all(
        claims.map((item) =>
          fetchAuthMutation(api.projects.failProgrammerExecution, {
            projectId: input.projectId,
            jobId: item.jobId,
            repoUrl,
            vercelProjectId,
            keepInProgress,
            error: message.slice(0, 1_500),
          }),
        ),
      )
      await saveProgrammerMessage(
        input.projectId,
        /workspace was kept alive/i.test(message)
          ? `I couldn't finish ${taskLabel}, but I kept the workspace alive so ${claims.length === 1 ? "it" : "they"} can continue from the same sandbox on retry.`
          : `I couldn't finish ${taskLabel}. I moved the task${claims.length === 1 ? "" : "s"} back to To Do so ${claims.length === 1 ? "it" : "they"} can be retried.`,
      )
    } catch (failureUpdateError) {
      console.error("Unable to record Programmer failure", failureUpdateError)
    }

    return {
      status: keepInProgress ? ("programmer_retry_needed" as const) : ("failed" as const),
      error: message,
      cardKeys: claims.map((item) => item.card.cardKey),
    }
  }
}
