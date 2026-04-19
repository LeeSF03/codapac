"server-only"

import { Sandbox } from "@vercel/sandbox"

import { getGitHubToken } from "@/lib/boss/github"
import { getKimiModel, getKimiToken } from "@/lib/boss/kimi"

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
}

type ProgrammerRunInput = {
  externalRunId: string
  project: ProgrammerProject
  card: ProgrammerCard
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

function buildBranchName(card: ProgrammerCard, externalRunId: string) {
  const title = safeBranchSegment(card.title) || "task"
  const suffix = safeBranchSegment(externalRunId).slice(-10) || Date.now().toString(36)
  return `codapac/${card.cardKey.toLowerCase()}-${title}-${suffix}`.slice(0, 120)
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

function opencodeModelId(providerId: string, kimiModel: string) {
  return `${providerId}/${kimiModel}`
}

function buildOpencodeConfig(kimiToken: string, kimiModel: string) {
  const providerId = "moonshot"

  return JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      enabled_providers: [providerId],
      provider: {
        [providerId]: {
          npm: "@ai-sdk/openai-compatible",
          name: "Moonshot AI",
          options: {
            apiKey: kimiToken,
            baseURL: "https://api.moonshot.ai/v1",
          },
          models: {
            [kimiModel]: {
              name: `Kimi ${kimiModel}`,
            },
          },
        },
      },
      model: opencodeModelId(providerId, kimiModel),
    },
    null,
    2,
  )
}

function buildPrompt(project: ProgrammerProject, card: ProgrammerCard) {
  const criteria =
    card.acceptanceCriteria.length > 0
      ? card.acceptanceCriteria.map((item) => `- ${item}`).join("\n")
      : "- The requested result is visible and ready to review."

  return [
    "You are the programmer agent for this repository.",
    "Implement exactly one task. Do not ask follow-up questions.",
    "Keep the change focused, practical, and complete enough for review.",
    "Run relevant checks if the repository makes them obvious.",
    "Do not commit or push. The host application will handle git after you finish.",
    "",
    `Project: ${project.name}`,
    `Project goal: ${project.description || "(none provided)"}`,
    "",
    `Task: ${card.cardKey} - ${card.title}`,
    `Priority: ${card.priority}`,
    `Labels: ${card.tags.length > 0 ? card.tags.join(", ") : "none"}`,
    "",
    "Task description:",
    card.description || card.title,
    "",
    "Acceptance checklist:",
    criteria,
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

  const stderr = "stderr" in command ? await command.stderr() : ""
  const stdout = "stdout" in command ? await command.stdout() : ""
  const details = redactSensitiveOutput([stderr, stdout].filter(Boolean).join("\n"))
    .slice(0, 1_500)
  throw new Error(`${label} failed.${details ? ` ${details}` : ""}`)
}

function redactSensitiveOutput(value: string) {
  const secrets = [
    process.env.GITHUB_TOKEN,
    process.env.KIMI_TOKEN,
    process.env.MOONSHOT_API_KEY,
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
  const kimiToken = getKimiToken()
  const kimiModel = getKimiModel()
  const modelId = opencodeModelId("moonshot", kimiModel)
  const branchName = buildBranchName(input.card, input.externalRunId)
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
          content: Buffer.from(buildOpencodeConfig(kimiToken, kimiModel)),
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
          `${input.card.cardKey} programmer task`,
          "--dangerously-skip-permissions",
          buildPrompt(input.project, input.card),
        ],
        cwd: WORKDIR,
        env: {
          OPENCODE_CONFIG: OPENCODE_CONFIG_PATH,
        },
      }),
    )
    await assertCommand(run, "Running OpenCode")
    const opencodeOutput = "stdout" in run ? (await run.stdout()).trim() : ""

    const status = await sandboxStep("Checking repository changes", () =>
      sandbox.runCommand({
        cmd: "git",
        args: ["status", "--short"],
        cwd: WORKDIR,
      }),
    )
    await assertCommand(status, "Checking repository changes")
    const changedFiles = "stdout" in status ? (await status.stdout()).trim() : ""
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
          args: ["commit", "-m", `Implement ${input.card.cardKey}: ${input.card.title}`],
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

    return {
      branchName,
      branchUrl: publicBranchUrl(input.project.repoUrl, branchName),
      summary: opencodeOutput.slice(-2_000) || "Programmer finished the task.",
    }
  } finally {
    await sandbox.stop().catch(() => null)
  }
}
