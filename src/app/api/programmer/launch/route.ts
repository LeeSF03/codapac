import { NextResponse } from "next/server"
import { z } from "zod"

import { createProjectRepository } from "@/lib/boss/github"
import { ensureVercelProject } from "@/lib/boss/vercel"
import { runProgrammerWithOpencode } from "@/lib/programmer/opencode"
import { fetchAuthMutation, getAuthUser } from "@/lib/auth-server"
import { embedText } from "@/lib/boss/embeddings"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

export const runtime = "nodejs"

const launchBodySchema = z.object({
  projectId: z.string().min(1),
  cardKey: z.string().trim().min(1).optional(),
  cardKeys: z.array(z.string().trim().min(1)).min(1).max(5).optional(),
}).refine((value) => Boolean(value.cardKey || value.cardKeys?.length), {
  message: "cardKey or cardKeys is required.",
})

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
  const externalRunId = `programmer-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`

  const claims = (
    await Promise.all(
      cardKeys.map((cardKey) =>
        fetchAuthMutation(api.projects.claimProgrammerExecution, {
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
  const taskLabel =
    claims.length === 1
      ? `${claim.card.cardKey}: ${claim.card.title}`
      : `${claims.length} grouped tasks (${claims.map((item) => item.card.cardKey).join(", ")})`

  await saveProgrammerMessage(
    projectId,
    `I'm starting ${taskLabel}. I'll merge it when the work is ready, then QA can check it.`,
  )

  let repoUrl = claim.project.repoUrl
  let vercelProjectId = claim.project.vercelProjectId ?? null
  let stage = "preparing the Programmer run"

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
      cards: claims.map((item) => item.card),
      onStarted: async ({ sandboxId, commandId, branchName }) => {
        await Promise.all(
          claims.map((item) =>
            fetchAuthMutation(api.projects.markProgrammerExecutionStarted, {
              projectId,
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
          projectId,
          jobId: item.jobId,
          repoUrl: readyRepoUrl,
          vercelProjectId: readyVercelProjectId,
          branchName: result.branchName,
          summary: result.summary.slice(0, 1_500),
        }),
      ),
    )

    await saveProgrammerMessage(
      projectId,
      `I finished ${taskLabel} and merged it. QA is ready to check it next.`,
    )

    return NextResponse.json({
      status: "completed",
      repoUrl,
      vercelProjectId,
      branchName: result.branchName,
      branchUrl: result.branchUrl,
      cardKeys: claims.map((item) => item.card.cardKey),
    })
  } catch (error) {
    const message = `Programmer launch failed while ${stage}: ${errorMessage(error)}`

    try {
      await Promise.all(
        claims.map((item) =>
          fetchAuthMutation(api.projects.failProgrammerExecution, {
            projectId,
            jobId: item.jobId,
            repoUrl,
            vercelProjectId,
            error: message.slice(0, 1_500),
          }),
        ),
      )
      await saveProgrammerMessage(
        projectId,
        `I couldn't finish ${taskLabel}. I moved the task${claims.length === 1 ? "" : "s"} back to To Do so ${claims.length === 1 ? "it" : "they"} can be retried.`,
      )
    } catch (failureUpdateError) {
      console.error("Unable to record Programmer failure", failureUpdateError)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
