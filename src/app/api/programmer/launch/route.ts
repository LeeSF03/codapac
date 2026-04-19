import { NextResponse } from "next/server"
import { z } from "zod"

import { createProjectRepository } from "@/lib/boss/github"
import { ensureVercelProject } from "@/lib/boss/vercel"
import { runProgrammerWithOpencode } from "@/lib/programmer/opencode"
import { fetchAuthMutation, getAuthUser } from "@/lib/auth-server"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

export const runtime = "nodejs"

const launchBodySchema = z.object({
  projectId: z.string().min(1),
  cardKey: z.string().trim().min(1),
})

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Programmer failed."
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
  const externalRunId = `programmer-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`

  const claim = await fetchAuthMutation(api.projects.claimProgrammerExecution, {
    projectId,
    cardKey,
    externalRunId,
  })

  if (!claim) {
    return NextResponse.json({ status: "noop" }, { status: 202 })
  }

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
      card: claim.card,
      onStarted: async ({ sandboxId, commandId, branchName }) => {
        await fetchAuthMutation(api.projects.markProgrammerExecutionStarted, {
          projectId,
          jobId: claim.jobId,
          repoUrl: readyRepoUrl,
          vercelProjectId: readyVercelProjectId,
          branchName,
          sandboxId,
          commandId,
          notes: "Programmer is working on the task.",
        })
      },
    })

    stage = "saving the Programmer result"
    await fetchAuthMutation(api.projects.completeProgrammerExecution, {
      projectId,
      jobId: claim.jobId,
      repoUrl: readyRepoUrl,
      vercelProjectId: readyVercelProjectId,
      branchName: result.branchName,
      summary: result.summary.slice(0, 1_500),
    })

    return NextResponse.json({
      status: "completed",
      repoUrl,
      vercelProjectId,
      branchName: result.branchName,
      branchUrl: result.branchUrl,
    })
  } catch (error) {
    const message = `Programmer launch failed while ${stage}: ${errorMessage(error)}`

    try {
      await fetchAuthMutation(api.projects.failProgrammerExecution, {
        projectId,
        jobId: claim.jobId,
        repoUrl,
        vercelProjectId,
        error: message.slice(0, 1_500),
      })
    } catch (failureUpdateError) {
      console.error("Unable to record Programmer failure", failureUpdateError)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
