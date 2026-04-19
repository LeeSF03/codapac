"server-only"

type VercelProject = {
  id: string
  name: string
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
}

function getVercelToken() {
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

export async function ensureVercelProject(args: EnsureVercelProjectArgs) {
  const token = getVercelToken()
  const teamId = getVercelTeamId()
  const projectName = normalizeProjectName(args.slug, args.name)

  const existing = await findVercelProject(token, teamId, projectName)
  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
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
    return {
      id: created.data.id,
      name: created.data.name,
      teamId,
      token,
    }
  }

  if (created.status === 409 || created.status === 400) {
    const raced = await findVercelProject(token, teamId, projectName)
    if (raced) {
      return {
        id: raced.id,
        name: raced.name,
        teamId,
        token,
      }
    }
  }

  throw new Error(`Unable to create the Vercel project: ${created.error}`)
}
