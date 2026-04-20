"server-only"

type VercelProject = {
  id: string
  name: string
  link?: {
    type?: string
    repo?: string
  } | null
}

type VercelError = {
  error?: {
    message?: string
    code?: string
  }
}

type EnsureVercelProjectArgs = {
  name: string
  slug: string
  repoUrl?: string | null
}

export function getVercelToken() {
  const token = process.env.VERCEL_TOKEN?.trim()
  if (!token) {
    throw new Error("VERCEL_TOKEN is required to create a Vercel project.")
  }
  return token
}

export function getVercelTeamId() {
  const teamId = process.env.VERCEL_TEAM_ID?.trim()
  if (!teamId) {
    throw new Error("VERCEL_TEAM_ID is required to create Vercel Sandboxes.")
  }
  return teamId
}

function vercelHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

function normalizeProjectName(slug: string, name: string) {
  const source = slug || name
  const normalized = source
    .replace(/^.*\//, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)

  return `codapac-${normalized || Date.now().toString(36)}`.slice(0, 100)
}

function parseGitHubRepoPath(repoUrl: string) {
  const url = new URL(repoUrl)
  const path = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "")
  if (!path || path.split("/").length < 2) {
    throw new Error("Project repository URL is not a valid GitHub repository URL.")
  }
  return path
}

function summarizeVercelError(payload: unknown) {
  const error = payload as VercelError | null
  const message = error?.error?.message?.trim()
  const code = error?.error?.code?.trim()
  if (message && code) return `${message} (${code})`
  if (message) return message
  return "Vercel returned an unexpected error."
}

async function vercelJson<T>(
  input: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const response = await fetch(input, init)
  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: summarizeVercelError(payload),
    }
  }

  return { ok: true, data: payload as T }
}

async function findVercelProject(token: string, teamId: string, name: string) {
  const url = new URL(`https://api.vercel.com/v9/projects/${encodeURIComponent(name)}`)
  url.searchParams.set("teamId", teamId)

  const response = await vercelJson<VercelProject>(url.toString(), {
    method: "GET",
    headers: vercelHeaders(token),
    cache: "no-store",
  })

  if (response.ok) return response.data
  if (response.status === 404) return null

  throw new Error(`Unable to read the Vercel project: ${response.error}`)
}

async function linkVercelProjectToGitHub(
  token: string,
  teamId: string,
  projectIdOrName: string,
  repoUrl?: string | null,
) {
  void token
  void teamId
  void projectIdOrName
  if (!repoUrl) return
  void parseGitHubRepoPath(repoUrl)
  // Vercel's Projects PATCH endpoint rejects `gitRepository` for this API
  // shape. Agents deploy from checked-out source, so Git linking is optional.
}

async function ensurePublicPreviewAccess(
  token: string,
  teamId: string,
  projectId: string,
) {
  const url = new URL(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`,
  )
  url.searchParams.set("teamId", teamId)

  const response = await vercelJson<VercelProject>(url.toString(), {
    method: "PATCH",
    headers: vercelHeaders(token),
    body: JSON.stringify({
      ssoProtection: null,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(
      `Unable to make preview deployments public by default: ${response.error}`,
    )
  }

  return response.data
}

export async function ensureVercelProject(args: EnsureVercelProjectArgs) {
  const token = getVercelToken()
  const teamId = getVercelTeamId()
  const projectName = normalizeProjectName(args.slug, args.name)

  const existing = await findVercelProject(token, teamId, projectName)
  if (existing) {
    if (args.repoUrl && existing.link?.repo !== parseGitHubRepoPath(args.repoUrl)) {
      await linkVercelProjectToGitHub(token, teamId, existing.id, args.repoUrl)
    }
    const configured = await ensurePublicPreviewAccess(token, teamId, existing.id)

    return {
      id: configured.id,
      name: configured.name,
      teamId,
      token,
    }
  }

  const url = new URL("https://api.vercel.com/v11/projects")
  url.searchParams.set("teamId", teamId)

  const created = await vercelJson<VercelProject>(url.toString(), {
    method: "POST",
    headers: vercelHeaders(token),
    body: JSON.stringify({
      name: projectName,
      skipGitConnectDuringLink: true,
    }),
    cache: "no-store",
  })

  if (created.ok) {
    const configured = await ensurePublicPreviewAccess(
      token,
      teamId,
      created.data.id,
    )

    return {
      id: configured.id,
      name: configured.name,
      teamId,
      token,
    }
  }

  if (args.repoUrl && created.status === 400) {
    console.warn(`Unable to create a Git-linked Vercel project: ${created.error}`)

    const fallback = await vercelJson<VercelProject>(url.toString(), {
      method: "POST",
      headers: vercelHeaders(token),
      body: JSON.stringify({
        name: projectName,
        skipGitConnectDuringLink: true,
      }),
      cache: "no-store",
    })

    if (fallback.ok) {
      await linkVercelProjectToGitHub(token, teamId, fallback.data.id, args.repoUrl)
      const configured = await ensurePublicPreviewAccess(
        token,
        teamId,
        fallback.data.id,
      )

      return {
        id: configured.id,
        name: configured.name,
        teamId,
        token,
      }
    }
  }

  if (created.status === 409 || created.status === 400) {
    const raced = await findVercelProject(token, teamId, projectName)
    if (raced) {
      await linkVercelProjectToGitHub(token, teamId, raced.id, args.repoUrl)
      const configured = await ensurePublicPreviewAccess(token, teamId, raced.id)

      return {
        id: configured.id,
        name: configured.name,
        teamId,
        token,
      }
    }
  }

  throw new Error(`Unable to create the Vercel project: ${created.error}`)
}

export async function deleteVercelProject(projectId: string) {
  const token = getVercelToken()
  const teamId = getVercelTeamId()
  const url = new URL(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`,
  )
  url.searchParams.set("teamId", teamId)

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: vercelHeaders(token),
    cache: "no-store",
  })

  if (response.status === 204 || response.status === 404) {
    return
  }

  const payload = (await response.json().catch(() => null)) as unknown
  throw new Error(
    `Unable to delete the Vercel project: ${summarizeVercelError(payload)}`,
  )
}
