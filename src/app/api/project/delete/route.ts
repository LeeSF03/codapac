import { NextResponse } from "next/server"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

import { fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server"
import { deleteProjectRepository } from "@/lib/boss/github"
import { deleteVercelProject } from "@/lib/boss/vercel"

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as
      | { projectId?: string }
      | null
    const projectId = payload?.projectId?.trim()

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required." },
        { status: 400 },
      )
    }

    const typedProjectId = projectId as Id<"projects">
    const project = await fetchAuthQuery(api.projects.getDeletionContext, {
      projectId: typedProjectId,
    })

    if (project.repoUrl) {
      await deleteProjectRepository(project.repoUrl)
    }

    if (project.vercelProjectId) {
      await deleteVercelProject(project.vercelProjectId)
    }

    await fetchAuthMutation(api.projects.deleteProject, {
      projectId: project.id,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete project.",
      },
      { status: 500 },
    )
  }
}
