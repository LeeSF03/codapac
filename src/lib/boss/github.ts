"server-only"

type GitHubViewer = {
  login: string
}

type GitHubRepository = {
  html_url: string
}

type CreateProjectRepositoryArgs = {
  name: string
  slug: string
  description: string
  visibility: "private" | "public"
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

function normalizeRepoName(slug: string) {
  return slug
    .replace(/^.*\//, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 90)
}

export function getGitHubToken() {
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is required to create or update the project repository.",
    )
  }
  return token
}

function summarizeGitHubError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "GitHub returned an unexpected error."
  }

  const message =
    "message" in payload && typeof payload.message === "string"
      ? payload.message
      : "GitHub returned an unexpected error."
  const errors =
    "errors" in payload && Array.isArray(payload.errors)
      ? payload.errors
          .map((entry) => {
            if (typeof entry === "string") {
              return entry
            }
            if (
              entry &&
              typeof entry === "object" &&
              "message" in entry &&
              typeof entry.message === "string"
            ) {
              return entry.message
            }
            return null
          })
          .filter((entry) => entry !== null)
      : []

  return errors.length > 0 ? `${message} (${errors.join("; ")})` : message
}

async function githubJson<T>(
  input: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const response = await fetch(input, init)
  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: summarizeGitHubError(payload),
    }
  }

  return { ok: true, data: payload as T }
}

async function getViewer(token: string) {
  const response = await githubJson<GitHubViewer>("https://api.github.com/user", {
    method: "GET",
    headers: githubHeaders(token),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Unable to read the GitHub account for GITHUB_TOKEN: ${response.error}`)
  }

  return response.data
}

async function getExistingRepository(token: string, owner: string, repo: string) {
  const response = await githubJson<GitHubRepository>(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      method: "GET",
      headers: githubHeaders(token),
      cache: "no-store",
    },
  )

  if (!response.ok) {
    return null
  }

  return response.data
}

export async function createProjectRepository(args: CreateProjectRepositoryArgs) {
  const token = getGitHubToken()
  const repoName = normalizeRepoName(args.slug)
  if (!repoName) {
    throw new Error("Unable to derive a valid GitHub repository name from the project slug.")
  }

  const viewer = await getViewer(token)
  const response = await githubJson<GitHubRepository>(
    "https://api.github.com/user/repos",
    {
      method: "POST",
      headers: githubHeaders(token),
      body: JSON.stringify({
        name: repoName,
        description: args.description.trim().slice(0, 350) || args.name.trim(),
        private: args.visibility === "private",
        auto_init: true,
      }),
      cache: "no-store",
    },
  )

  if (response.ok) {
    return response.data.html_url
  }

  if (response.status === 422) {
    const existing = await getExistingRepository(token, viewer.login, repoName)
    if (existing) {
      return existing.html_url
    }
  }

  throw new Error(`Unable to create the GitHub repository: ${response.error}`)
}
