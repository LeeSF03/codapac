"server-only"

import { Sandbox } from "@vercel/sandbox"

import { getGitHubToken } from "@/lib/boss/github"
import { getGlmModel, getGlmToken } from "@/lib/boss/glm"
import { getVercelTeamId, getVercelToken } from "@/lib/boss/vercel"

const OPENCODE_BIN = "/home/vercel-sandbox/.opencode/bin/opencode"
const OPENCODE_CONFIG_PATH = "/tmp/codapac-qa-opencode.json"
const INTEGRATION_SCRIPT_PATH = "/tmp/codapac-run-integration.sh"
const SANDBOX_TIMEOUT_MS = 45 * 60 * 1000
const WORKDIR = "/vercel/sandbox"

type QaProject = {
  name: string
  slug: string
  description: string
  repoUrl: string
  vercelProjectId: string
}

type QaCard = {
  cardKey: string
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: "low" | "medium" | "high"
  tags: string[]
}

type QaRunInput = {
  externalRunId: string
  project: QaProject
  cards: QaCard[]
  branchName: string
  onStarted?: (details: {
    sandboxId: string
    commandId: string | null
  }) => Promise<void>
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

function safeBranchSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80)
}

function buildQaBranchName(cards: QaCard[], externalRunId: string) {
  const firstCard = cards[0]
  const suffix = safeBranchSegment(externalRunId).slice(-10) || Date.now().toString(36)
  const scope =
    cards.length === 1
      ? safeBranchSegment(firstCard.cardKey)
      : `${safeBranchSegment(firstCard.cardKey)}-${cards.length}-tasks`
  return `codapac/qa-${scope}-${suffix}`.slice(0, 120)
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
            baseURL: process.env.GLM_BASE_URL?.trim() || "https://api.ilmu.ai/v1",
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

function formatQaTask(card: QaCard) {
  const criteria =
    card.acceptanceCriteria.length > 0
      ? card.acceptanceCriteria.map((item) => `  - ${item}`).join("\n")
      : "  - The requested result is visible and ready to review."

  return [
    `Task: ${card.cardKey} - ${card.title}`,
    `Priority: ${card.priority}`,
    `Labels: ${card.tags.length > 0 ? card.tags.join(", ") : "none"}`,
    "",
    "Task description:",
    card.description || card.title,
    "",
    "Acceptance checklist:",
    criteria,
  ].join("\n")
}

function buildQaPrompt(project: QaProject, cards: QaCard[]) {
  const taskList = cards.map(formatQaTask).join("\n\n---\n\n")

  return [
    "You are the QA agent for this repository.",
    cards.length === 1
      ? "Write integration tests for exactly one completed task."
      : `Write integration tests for this grouped change covering ${cards.length} completed tasks.`,
    "Do not write browser, end-to-end, Playwright, visual, or video-recording tests yet.",
    "Prefer the repository's existing test framework. If no integration test setup exists, add a minimal integration test setup and a package script named test:integration.",
    "Keep tests deterministic and local. Do not require external services, secrets, paid APIs, or production credentials.",
    "Do not merge branches. Do not deploy. Do not commit or push. The host application handles git and preview deployment after tests pass.",
    "The programmer's work has already been merged into main. Test the current main branch.",
    "",
    `Project: ${project.name}`,
    `Project goal: ${project.description || "(none provided)"}`,
    "",
    "Completed work to verify:",
    taskList,
    "",
    "When done, summarize the integration test files or scripts you added.",
  ].join("\n")
}

function buildIntegrationScript() {
  return `#!/usr/bin/env bash
set -euo pipefail

if [ ! -f package.json ]; then
  echo "No package.json found. QA integration tests need a JavaScript project root."
  exit 42
fi

if [ -f bun.lock ] || [ -f bun.lockb ]; then
  bun install --frozen-lockfile || bun install
  RUN_CMD=(bun run)
elif [ -f pnpm-lock.yaml ]; then
  corepack enable
  pnpm install --frozen-lockfile || pnpm install
  RUN_CMD=(pnpm run)
elif [ -f yarn.lock ]; then
  corepack enable
  yarn install --immutable || yarn install --frozen-lockfile || yarn install
  RUN_CMD=(yarn)
elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
  npm ci || npm install
  RUN_CMD=(npm run)
else
  npm install
  RUN_CMD=(npm run)
fi

SCRIPT_NAME="$(node - <<'NODE'
const scripts = require("./package.json").scripts || {};
const candidates = [
  "test:integration",
  "integration",
  "test:integrations",
  "integrations",
  "test:int",
  "int:test"
];
const found = candidates.find((name) => scripts[name]);
if (!found) {
  console.error("No integration test script found. QA expected a package script named test:integration or integration.");
  process.exit(42);
}
console.log(found);
NODE
)"

"\${RUN_CMD[@]}" "$SCRIPT_NAME"
`
}

function buildVercelProjectConfig(projectId: string, teamId: string) {
  return JSON.stringify({ projectId, orgId: teamId }, null, 2)
}

function extractPreviewUrl(output: string) {
  const urls = output.match(/https:\/\/[^\s]+/g) ?? []
  return urls.find((url) => url.includes("vercel.app")) ?? urls.at(-1) ?? null
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

function isRetryableQaAuthoringError(error: unknown) {
  const message = errorMessage(error).toLowerCase()
  return (
    message.includes("stream ended before command finished") ||
    message.includes("connection closed") ||
    message.includes("socket hang up") ||
    message.includes("terminated")
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function qaAuthoringArgs(
  modelId: string,
  cards: QaCard[],
  project: QaProject,
  format: "json" | "text",
) {
  const firstCard = cards[0]
  const title =
    cards.length === 1
      ? `${firstCard.cardKey} QA integration tests`
      : `${firstCard.cardKey} plus ${cards.length - 1} QA integration tests`
  const args = [
    "run",
    "--model",
    modelId,
    "--title",
    title,
    "--dangerously-skip-permissions",
  ]

  if (format === "json") {
    args.splice(3, 0, "--format", "json")
  }

  args.push(buildQaPrompt(project, cards))
  return args
}

async function runQaAuthoring(
  sandbox: Sandbox,
  modelId: string,
  project: QaProject,
  cards: QaCard[],
) {
  try {
    return await sandboxStep("Writing integration tests", () =>
      sandbox.runCommand({
        cmd: OPENCODE_BIN,
        args: qaAuthoringArgs(modelId, cards, project, "json"),
        cwd: WORKDIR,
        env: {
          OPENCODE_CONFIG: OPENCODE_CONFIG_PATH,
        },
      }),
    )
  } catch (error) {
    if (!isRetryableQaAuthoringError(error)) {
      throw error
    }

    return await sandboxStep("Retrying integration test authoring", () =>
      sandbox.runCommand({
        cmd: OPENCODE_BIN,
        args: qaAuthoringArgs(modelId, cards, project, "text"),
        cwd: WORKDIR,
        env: {
          OPENCODE_CONFIG: OPENCODE_CONFIG_PATH,
        },
      }),
    )
  }
}

export async function runQaIntegration(input: QaRunInput) {
  const githubToken = getGitHubToken()
  const glmToken = getGlmToken()
  const glmModel = getGlmModel()
  const vercelToken = getVercelToken()
  const vercelTeamId = getVercelTeamId()
  const modelId = opencodeModelId("glm", glmModel)
  const authRepoUrl = authenticatedRepoUrl(input.project.repoUrl, githubToken)
  const sourceRepoUrl = gitSourceUrl(input.project.repoUrl)
  const qaBranchName = buildQaBranchName(input.cards, input.externalRunId)

  const sandbox = await sandboxStep("Creating the QA sandbox", () =>
    Sandbox.create({
      token: vercelToken,
      teamId: vercelTeamId,
      projectId: input.project.vercelProjectId,
      runtime: "node22",
      source: {
        type: "git",
        url: sourceRepoUrl,
        username: "x-access-token",
        password: githubToken,
        revision: "main",
        depth: 1,
      },
      timeout: SANDBOX_TIMEOUT_MS,
      resources: { vcpus: 2 },
    }),
  )

  try {
    await assertCommand(
      await sandboxStep("Creating the QA branch from main", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["checkout", "-B", qaBranchName],
          cwd: WORKDIR,
        }),
      ),
      "Creating the QA branch from main",
    )

    await input.onStarted?.({
      sandboxId: sandbox.sandboxId,
      commandId: null,
    })

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
      await sandboxStep("Preparing QA files", () =>
        sandbox.runCommand({
          cmd: "mkdir",
          args: ["-p", "/tmp", ".vercel"],
          cwd: WORKDIR,
        }),
      ),
      "Preparing QA files",
    )

    await sandboxStep("Writing QA config files", () =>
      sandbox.writeFiles([
        {
          path: OPENCODE_CONFIG_PATH,
          content: Buffer.from(buildOpencodeConfig(glmToken, glmModel)),
        },
        {
          path: INTEGRATION_SCRIPT_PATH,
          content: Buffer.from(buildIntegrationScript()),
          mode: 0o755,
        },
        {
          path: `${WORKDIR}/.vercel/project.json`,
          content: Buffer.from(
            buildVercelProjectConfig(input.project.vercelProjectId, vercelTeamId),
          ),
        },
      ]),
    )
    await assertCommand(
      await sandboxStep("Ignoring sandbox deployment metadata", () =>
        sandbox.runCommand({
          cmd: "bash",
          args: ["-lc", "printf '\\n.vercel/\\n' >> .git/info/exclude"],
          cwd: WORKDIR,
        }),
      ),
      "Ignoring sandbox deployment metadata",
    )

    const qaAuthoring = await runQaAuthoring(
      sandbox,
      modelId,
      input.project,
      input.cards,
    )
    await assertCommand(qaAuthoring, "Writing integration tests")
    const qaSummary = "stdout" in qaAuthoring
      ? (await safeCommandOutput(qaAuthoring, "stdout")).trim()
      : ""

    const integration = await sandboxStep("Running integration tests", () =>
      sandbox.runCommand({
        cmd: "bash",
        args: [INTEGRATION_SCRIPT_PATH],
        cwd: WORKDIR,
      }),
    )
    await assertCommand(integration, "Running integration tests")
    const integrationOutput =
      "stdout" in integration ? await safeCommandOutput(integration, "stdout") : ""

    const status = await sandboxStep("Checking QA changes", () =>
      sandbox.runCommand({
        cmd: "git",
        args: ["status", "--short"],
        cwd: WORKDIR,
      }),
    )
    await assertCommand(status, "Checking QA changes")
    const changedFiles = "stdout" in status
      ? (await safeCommandOutput(status, "stdout")).trim()
      : ""

    await assertCommand(
      await sandboxStep("Configuring QA git user name", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["config", "user.name", "Codapac QA"],
          cwd: WORKDIR,
        }),
      ),
      "Configuring QA git user name",
    )
    await assertCommand(
      await sandboxStep("Configuring QA git user email", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["config", "user.email", "codapac-qa@users.noreply.github.com"],
          cwd: WORKDIR,
        }),
      ),
      "Configuring QA git user email",
    )
    await assertCommand(
      await sandboxStep("Preparing QA git access", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["remote", "set-url", "origin", authRepoUrl],
          cwd: WORKDIR,
        }),
      ),
      "Preparing QA git access",
    )

    if (changedFiles) {
      await assertCommand(
        await sandboxStep("Staging QA changes", () =>
          sandbox.runCommand({
            cmd: "git",
            args: ["add", "-A"],
            cwd: WORKDIR,
          }),
        ),
        "Staging QA changes",
      )
      await assertCommand(
        await sandboxStep("Committing QA changes", () =>
          sandbox.runCommand({
            cmd: "git",
            args: [
              "commit",
              "-m",
              input.cards.length === 1
                ? `Add integration tests for ${input.cards[0].cardKey}`
                : `Add integration tests for ${input.cards.length} tasks`,
            ],
            cwd: WORKDIR,
          }),
        ),
        "Committing QA changes",
      )
      await assertCommand(
        await sandboxStep("Pushing QA changes", () =>
          sandbox.runCommand({
            cmd: "git",
            args: ["push", "origin", `HEAD:${qaBranchName}`],
            cwd: WORKDIR,
          }),
        ),
        "Pushing QA changes",
      )
    }

    await assertCommand(
      await sandboxStep("Checking out main for preview deployment", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["fetch", "origin", "main"],
          cwd: WORKDIR,
        }),
      ),
      "Checking out main for preview deployment",
    )
    await assertCommand(
      await sandboxStep("Preparing main preview", () =>
        sandbox.runCommand({
          cmd: "git",
          args: ["checkout", "--detach", "FETCH_HEAD"],
          cwd: WORKDIR,
        }),
      ),
      "Preparing main preview",
    )

    const deploy = await sandboxStep("Creating preview deployment", () =>
      sandbox.runCommand({
        cmd: "bash",
        args: [
          "-lc",
          "npx --yes vercel@latest deploy --yes --token \"$VERCEL_TOKEN\"",
        ],
        cwd: WORKDIR,
        env: {
          VERCEL_TOKEN: vercelToken,
        },
      }),
    )
    await assertCommand(deploy, "Creating preview deployment")
    const deployOutput = [
      "stdout" in deploy ? await safeCommandOutput(deploy, "stdout") : "",
      "stderr" in deploy ? await safeCommandOutput(deploy, "stderr") : "",
    ].join("\n")
    const previewDeploymentUrl = extractPreviewUrl(deployOutput)

    if (!previewDeploymentUrl) {
      throw new Error("Vercel preview deployment finished without returning a URL.")
    }

    return {
      previewDeploymentUrl,
      summary: [
        qaSummary.slice(-1_000),
        integrationOutput.slice(-1_000),
      ]
        .filter(Boolean)
        .join("\n\n")
        .trim() || "QA wrote and passed integration tests.",
    }
  } finally {
    await sandbox.stop({ blocking: true }).catch(() => null)
  }
}
