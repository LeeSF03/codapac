"server-only"

import { Sandbox } from "@vercel/sandbox"

import { getGitHubToken, mergeProjectBranchIntoMain } from "@/lib/boss/github"
import { getGlmModel, getGlmToken } from "@/lib/boss/glm"

const OPENCODE_BIN = "/home/vercel-sandbox/.opencode/bin/opencode"
const OPENCODE_CONFIG_PATH = "/tmp/codapac-opencode.json"
const SANDBOX_TIMEOUT_MS = 45 * 60 * 1000
const WORKDIR = "/vercel/sandbox"

type ProgrammerProject = {
  name: string
  slug: string
  description: string
  repoUrl: string
  vercelProjectId: string
  vercelTeamId: string
  vercelToken: string
}

type ProgrammerCard = {
  cardKey: string
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: "low" | "medium" | "high"
  tags: string[]
  qaFeedback?: string | null
}

type ProgrammerRunInput = {
  externalRunId: string
  project: ProgrammerProject
  cards: ProgrammerCard[]
  onStarted?: (details: {
    sandboxId: string
    commandId: string | null
    branchName: string
  }) => Promise<void>
}

function safeBranchSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 48)
}

function buildBranchName(cards: ProgrammerCard[], externalRunId: string) {
  const firstCard = cards[0]
  const title = safeBranchSegment(firstCard?.title ?? "task") || "task"
  const key =
    cards.length === 1
      ? firstCard?.cardKey.toLowerCase()
      : `group-${firstCard?.cardKey.toLowerCase() ?? "task"}-${cards.length}`
  const suffix = safeBranchSegment(externalRunId).slice(-10) || Date.now().toString(36)
  return `codapac/${key}-${title}-${suffix}`.slice(0, 120)
}

function parseGitHubRepoPath(repoUrl: string) {
  const url = new URL(repoUrl)
  const path = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "")
  if (!path || path.split("/").length < 2) {
    throw new Error("Project repository URL is not a valid GitHub repository URL.")
  }
  return path
}

function authenticatedRepoUrl(repoUrl: string, token: string) {
  const repoPath = parseGitHubRepoPath(repoUrl)
  return `https://x-access-token:${encodeURIComponent(token)}@github.com/${repoPath}.git`
}

function gitSourceUrl(repoUrl: string) {
  const repoPath = parseGitHubRepoPath(repoUrl)
  return `https://github.com/${repoPath}.git`
}

function publicBranchUrl(repoUrl: string, branchName: string) {
  const cleanRepoUrl = repoUrl.replace(/\.git$/, "")
  return `${cleanRepoUrl}/tree/${encodeURIComponent(branchName)}`
}

function opencodeModelId(providerId: string, glmModel: string) {
  return `${providerId}/${glmModel}`
}

function buildOpencodeConfig(glmToken: string, glmModel: string) {
  const providerId = "glm"

  return JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      enabled_providers: [providerId],
      provider: {
        [providerId]: {
          npm: "@ai-sdk/openai-compatible",
          name: "GLM",
          options: {
            apiKey: glmToken,
            baseURL: "https://api.moonshot.ai/v1",
          },
          models: {
            [glmModel]: {
              name: `GLM ${glmModel}`,
            },
          },
        },
      },
      model: opencodeModelId(providerId, glmModel),
    },
    null,
    2,
  )
}

function formatTaskForPrompt(card: ProgrammerCard, index: number) {
  const criteria =
    card.acceptanceCriteria.length > 0
      ? card.acceptanceCriteria.map((item) => `  - ${item}`).join("\n")
      : "  - The requested result is visible and ready to review."

  return [
    `Task ${index + 1}: ${card.cardKey} - ${card.title}`,
    `Priority: ${card.priority}`,
    `Labels: ${card.tags.length > 0 ? card.tags.join(", ") : "none"}`,
    "Description:",
    card.description || card.title,
    card.qaFeedback
      ? ["QA feedback to fix:", card.qaFeedback.slice(0, 1_200)].join("\n")
      : "",
    "Acceptance checklist:",
    criteria,
  ]
    .filter(Boolean)
    .join("\n")
}

function buildPrompt(project: ProgrammerProject, cards: ProgrammerCard[]) {
  return [
    "You are the programmer agent for this repository.",
    cards.length === 1
      ? "Implement exactly one task. Do not ask follow-up questions."
      : "Implement the grouped tasks together in one cohesive change. Do not ask follow-up questions.",
    "Keep the change focused, practical, and complete enough for review.",
    "Run relevant checks if the repository makes them obvious.",
    "Do not commit or push. The host application will handle git after you finish.",
    "",
    `Project: ${project.name}`,
    `Project goal: ${project.description || "(none provided)"}`,
    "",
    "Tasks to implement:",
    cards.map(formatTaskForPrompt).join("\n\n"),
    "",
    "When done, summarize what changed and what you checked.",
  ].join("\n")
}

async function assertCommand(
  command: Awaited<ReturnType<Sandbox["runCommand"]>>,
  label: string,
) {
  if ("exitCode" in command && command.exitCode === 0) {
    return
  }

  const stderr = "stderr" in command ? await safeCommandOutput(command, "stderr") : ""
  const stdout = "stdout" in command ? await safeCommandOutput(command, "stdout") : ""
  const details = redactSensitiveOutput([stderr, stdout].filter(Boolean).join("\n"))
    .slice(0, 1_500)
  throw new Error(`${label} failed.${details ? ` ${details}` : ""}`)
}

async function safeCommandOutput(
  command: Awaited<ReturnType<Sandbox["runCommand"]>>,
  stream: "stdout" | "stderr",
) {
  if (!(stream in command)) {
    return ""
  }

  try {
    return await command[stream]()
  } catch (error) {
    return describeSandboxError(error)
  }
}

function redactSensitiveOutput(value: string) {
  const secrets = [
    process.env.GITHUB_TOKEN,
    process.env.GLM_TOKEN,
    process.env.VERCEL_TOKEN,
  ]
    .map((secret) => secret?.trim())
    .filter((secret): secret is string => Boolean(secret))

  return secrets.reduce(
    (text, secret) => text.split(secret).join("[redacted]"),
    value,
  )
}

function describeSandboxError(error: unknown) {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : String(error)
  }

  const message = error instanceof Error ? error.message : "Sandbox API error"
  const details = [
    "text" in error && typeof error.text === "string" ? error.text : null,
    "json" in error ? JSON.stringify(error.json) : null,
  ]
    .filter((detail): detail is string => Boolean(detail))
    .join(" ")

  const safeDetails = redactSensitiveOutput(details).slice(0, 1_500)
  return safeDetails ? `${message}. ${safeDetails}` : message
}

async function sandboxStep<T>(label: string, operation: () => Promise<T>) {
  try {
    return await operation()
  } catch (error) {
    throw new Error(`${label} failed. ${describeSandboxError(error)}`)
  }
}

export async function runProgrammerWithOpencode(input: ProgrammerRunInput) {
  const githubToken = getGitHubToken()
  const glmToken = getGlmToken()
  const glmModel = getGlmModel()
  const modelId = opencodeModelId("glm", glmModel)
  const cards = input.cards
  if (cards.length === 0) {
    throw new Error("Programmer needs at least one task to run.")
  }

  const branchName = buildBranchName(cards, input.externalRunId)
  const authRepoUrl = authenticatedRepoUrl(input.project.repoUrl, githubToken)
  const sourceRepoUrl = gitSourceUrl(input.project.repoUrl)

  const sandbox = await sandboxStep("Creating the Vercel Sandbox", () =>
    Sandbox.create({
      token: input.project.vercelToken,
      teamId: input.project.vercelTeamId,
      projectId: input.project.vercelProjectId,
      runtime: "node22",
      source: {
        type: "git",
        url: sourceRepoUrl,
        username: "x-access-token",
        password: githubToken,
        depth: 1,
      },
      timeout: SANDBOX_TIMEOUT_MS,
      resources: { vcpus: 2 },
    }),
  )

  try {
    await assertCommand(
      await sandboxStep("Creating the task branch", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["checkout", "-B", branchName],
          cwd: WORKDIR,
        }),
      ),
      "Creating the task branch",
    )

    await assertCommand(
      await sandboxStep("Installing OpenCode", () =>
        sandbox.runCommand({
          cmd: "bash",
          args: ["-lc", "curl -fsSL https://opencode.ai/install | bash"],
          env: {
            OPENCODE_INSTALL_DIR: "/home/vercel-sandbox/.opencode/bin",
          },
        }),
      ),
      "Installing OpenCode",
    )

    await assertCommand(
      await sandboxStep("Preparing OpenCode config directory", () =>
        sandbox.runCommand({
          cmd: "mkdir",
          args: ["-p", "/tmp"],
        }),
      ),
      "Preparing OpenCode config",
    )

    await sandboxStep("Writing OpenCode config", () =>
      sandbox.writeFiles([
        {
          path: OPENCODE_CONFIG_PATH,
          content: Buffer.from(buildOpencodeConfig(glmToken, glmModel)),
        },
      ]),
    )

    await input.onStarted?.({
      sandboxId: sandbox.sandboxId,
      commandId: null,
      branchName,
    })

    const run = await sandboxStep("Running OpenCode", () =>
      sandbox.runCommand({
        cmd: OPENCODE_BIN,
        args: [
          "run",
          "--model",
          modelId,
          "--format",
          "json",
          "--title",
          cards.length === 1
            ? `${cards[0].cardKey} programmer task`
            : `${cards.length} grouped programmer tasks`,
          "--dangerously-skip-permissions",
          buildPrompt(input.project, cards),
        ],
        cwd: WORKDIR,
        env: {
          OPENCODE_CONFIG: OPENCODE_CONFIG_PATH,
        },
      }),
    )
    await assertCommand(run, "Running OpenCode")
    const opencodeOutput = "stdout" in run
      ? (await safeCommandOutput(run, "stdout")).trim()
      : ""

    const status = await sandboxStep("Checking repository changes", () =>
      sandbox.runCommand({
        cmd: "git",
        args: ["status", "--short"],
        cwd: WORKDIR,
      }),
    )
    await assertCommand(status, "Checking repository changes")
    const changedFiles = "stdout" in status
      ? (await safeCommandOutput(status, "stdout")).trim()
      : ""
    if (!changedFiles) {
      throw new Error("Programmer finished without creating any file changes.")
    }

    await assertCommand(
      await sandboxStep("Configuring git user name", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["config", "user.name", "Codapac Programmer"],
          cwd: WORKDIR,
        }),
      ),
      "Configuring git user name",
    )
    await assertCommand(
      await sandboxStep("Configuring git user email", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["config", "user.email", "codapac-programmer@users.noreply.github.com"],
          cwd: WORKDIR,
        }),
      ),
      "Configuring git user email",
    )
    await assertCommand(
      await sandboxStep("Preparing repository push access", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["remote", "set-url", "origin", authRepoUrl],
          cwd: WORKDIR,
        }),
      ),
      "Preparing repository push access",
    )
    await assertCommand(
      await sandboxStep("Staging programmer changes", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["add", "-A"],
          cwd: WORKDIR,
        }),
      ),
      "Staging programmer changes",
    )
    await assertCommand(
      await sandboxStep("Committing programmer changes", () =>
        sandbox.runCommand({
          cmd: "git",
          args: [
            "commit",
            "-m",
            cards.length === 1
              ? `Implement ${cards[0].cardKey}: ${cards[0].title}`
              : `Implement grouped tasks: ${cards.map((card) => card.cardKey).join(", ")}`,
          ],
          cwd: WORKDIR,
        }),
      ),
      "Committing programmer changes",
    )
    await assertCommand(
      await sandboxStep("Pushing programmer changes", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["push", "-u", "origin", branchName],
          cwd: WORKDIR,
        }),
      ),
      "Pushing programmer changes",
    )

    await sandboxStep("Merging programmer changes into main", () =>
      mergeProjectBranchIntoMain({
        repoUrl: input.project.repoUrl,
        branchName,
        baseBranch: "main",
        title:
          cards.length === 1
            ? `Implement ${cards[0].cardKey}: ${cards[0].title}`
            : `Implement grouped tasks: ${cards.map((card) => card.cardKey).join(", ")}`,
        body: [
          "Programmer completed these tasks:",
          ...cards.map((card) => `- ${card.cardKey}: ${card.title}`),
        ].join("\n"),
        commitMessage:
          cards.length === 1
            ? `Merge ${cards[0].cardKey}: ${cards[0].title}`
            : `Merge grouped tasks: ${cards.map((card) => card.cardKey).join(", ")}`,
      }),
    )

    return {
      branchName,
      branchUrl: publicBranchUrl(input.project.repoUrl, branchName),
      summary:
        opencodeOutput.slice(-2_000) ||
        "Programmer finished the task and merged it into main.",
    }
  } finally {
    await sandbox.stop({ blocking: true }).catch(() => null)
  }
}
