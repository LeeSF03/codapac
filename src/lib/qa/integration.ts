"server-only"

import { Sandbox } from "@vercel/sandbox"
import type { Command, CommandFinished } from "@vercel/sandbox"

import { DEFAULT_APP_STACK_GUIDANCE } from "@/lib/agents/default-stack"
import type { ExecutionFeatureContext } from "@/lib/agents/execution-context"
import {
  getGitHubToken,
  mergeProjectBranchIntoMain,
} from "@/lib/boss/github"
import { getGlmModel, getGlmToken } from "@/lib/boss/glm"
import { getVercelTeamId, getVercelToken } from "@/lib/boss/vercel"

const OPENCODE_BIN = "/home/vercel-sandbox/.opencode/bin/opencode"
const OPENCODE_CONFIG_PATH = "/tmp/codapac-qa-opencode.json"
const OPENCODE_TASK_PATH = "/tmp/codapac-qa-task.md"
const OPENCODE_MAX_ATTEMPTS = 3
const OPENCODE_CHUNK_TIMEOUT_MS = 45 * 60 * 1000
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
  context?: ExecutionFeatureContext
  reuseSandboxId?: string | null
  reuseBranchName?: string | null
  onStarted?: (details: {
    sandboxId: string
    commandId: string | null
  }) => Promise<void>
}

function isRetryableOpencodeTermination(message: string) {
  return /\b(terminated|stream ended|stream_ended_early|connection closed|command failed to finish)\b/i.test(
    message,
  )
}

function isRetryableNoChanges(message: string) {
  return /without creating any file changes/i.test(message)
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
            timeout: false,
            chunkTimeout: OPENCODE_CHUNK_TIMEOUT_MS,
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

function buildQaPrompt(
  project: QaProject,
  cards: QaCard[],
  context?: ExecutionFeatureContext,
) {
  return [
    "You are TESTEES, the QA agent for this repository.",
    "Write or update Vitest integration tests only.",
    "Do not write Playwright, browser E2E, visual, or video tests.",
    DEFAULT_APP_STACK_GUIDANCE,
    "Use Bun tooling by default when the repository does not clearly require another package manager.",
    "Ensure the repository has a runnable integration test command named test:integration.",
    "If needed, add or update Vitest config, jsdom setup, and testing-library dependencies to support the integration tests.",
    "Keep the QA change focused on test coverage and the minimal supporting test configuration required to run it.",
    "Do not commit or push. The host application will handle git after you finish.",
    "",
    `Project: ${project.name}`,
    `Project goal: ${project.description || "(none provided)"}`,
    "",
    "Feature brief:",
    context?.featureSummary || project.description || "(none provided)",
    context?.recentConversationSummary
      ? ["", "Recent conversation summary:", context.recentConversationSummary].join("\n")
      : "",
    context?.groupedTaskRationale
      ? ["", "Grouped-task rationale:", context.groupedTaskRationale].join("\n")
      : "",
    "",
    "Completed work to verify:",
    cards.map(formatQaTask).join("\n\n---\n\n"),
    "",
    "When done, summarize what tests and supporting configuration you added or updated.",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildIntegrationScript() {
  return `#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="\${PROJECT_ROOT:-.}"
cd "$PROJECT_ROOT"

if [ ! -f package.json ]; then
  echo "No package.json found in $PROJECT_ROOT. QA integration tests need a JavaScript project root."
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
  bun install
  RUN_CMD=(bun run)
fi

SCRIPT_NAME="$(node - <<'NODE'
const scripts = require("./package.json").scripts || {};
const candidates = ["test:integration", "integration"];
const found = candidates.find((name) => scripts[name]);
if (!found) {
  console.error("No integration test script found. QA expected test:integration or integration.");
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

async function streamCommandLogs(command: Command, prefix: string) {
  for await (const log of command.logs()) {
    const line = `${prefix} ${log.data}`
    if (log.stream === "stdout") {
      console.log(line)
    } else {
      console.error(line)
    }
  }
}

async function runLoggedCommand(params: {
  sandbox: Sandbox
  label: string
  prefix: string
  cmd: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}) {
  const command = await sandboxStep(params.label, () =>
    params.sandbox.runCommand({
      cmd: params.cmd,
      args: params.args,
      cwd: params.cwd,
      env: params.env,
      detached: true,
    }),
  )

  const logTask = streamCommandLogs(command, params.prefix)
  let finished: CommandFinished
  try {
    finished = await command.wait()
  } finally {
    await logTask.catch((error) => {
      console.error(`${params.prefix} [log-stream-error] ${describeSandboxError(error)}`)
    })
  }

  return {
    command,
    finished,
  }
}

async function detectProjectRoot(sandbox: Sandbox) {
  const command = await sandboxStep("Detecting project root", () =>
    sandbox.runCommand({
      cmd: "bash",
      args: [
        "-lc",
        [
          "set -euo pipefail",
          'ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"',
          'node - "$ROOT" <<\'NODE\'',
          'const fs = require("node:fs")',
          'const path = require("node:path")',
          'const root = process.argv[2]',
          'const skip = new Set(["node_modules", ".git", ".next", "dist", "build", ".turbo", ".vercel"])',
          'function hasDir(base, name) {',
          '  try {',
          '    return fs.statSync(path.join(base, name)).isDirectory()',
          '  } catch {',
          '    return false',
          '  }',
          '}',
          'function score(dir) {',
          '  const rel = path.relative(root, dir).replace(/\\\\/g, "/")',
          '  const depth = rel ? rel.split("/").length : 0',
          '  let value = depth * 10',
          '  if (hasDir(dir, "src")) value -= 3',
          '  if (hasDir(dir, "app")) value -= 3',
          '  if (hasDir(dir, "pages")) value -= 2',
          '  if (hasDir(dir, "components")) value -= 1',
          '  return value',
          '}',
          'const matches = []',
          'const queue = [root]',
          'while (queue.length > 0) {',
          '  const dir = queue.shift()',
          '  let entries = []',
          '  try {',
          '    entries = fs.readdirSync(dir, { withFileTypes: true })',
          '  } catch {',
          '    continue',
          '  }',
          '  for (const entry of entries) {',
          '    const fullPath = path.join(dir, entry.name)',
          '    if (entry.isDirectory()) {',
          '      if (!skip.has(entry.name)) {',
          '        queue.push(fullPath)',
          '      }',
          '      continue',
          '    }',
          '    if (entry.isFile() && entry.name === "package.json") {',
          '      matches.push(dir)',
          '    }',
          '  }',
          '}',
          'if (fs.existsSync(path.join(root, "package.json"))) {',
          '  process.stdout.write(root)',
          '  process.exit(0)',
          '}',
          'if (matches.length > 0) {',
          '  matches.sort((left, right) => score(left) - score(right) || left.localeCompare(right))',
          '  process.stdout.write(matches[0])',
          '  process.exit(0)',
          '}',
          'process.stdout.write(root)',
          'NODE',
        ].join("\n"),
      ],
      cwd: WORKDIR,
    }),
  )

  await assertCommand(command, "Detecting project root")
  const output = (await safeCommandOutput(command, "stdout")).trim()
  if (!output) {
    throw new Error("Could not determine the application root for QA.")
  }

  return output
}

export async function runQaIntegration(input: QaRunInput) {
  const githubToken = getGitHubToken()
  const vercelToken = getVercelToken()
  const vercelTeamId = getVercelTeamId()
  const glmToken = getGlmToken()
  const glmModel = getGlmModel()
  const modelId = opencodeModelId("glm", glmModel)
  const authRepoUrl = authenticatedRepoUrl(input.project.repoUrl, githubToken)
  const sourceRepoUrl = gitSourceUrl(input.project.repoUrl)
  const qaBranchName =
    input.reuseBranchName?.trim() || buildQaBranchName(input.cards, input.externalRunId)

  let sandbox: Sandbox | null = null
  let stopSandboxOnExit = true
  let reusedSandbox = false

  try {
    if (input.reuseSandboxId?.trim()) {
      try {
        sandbox = await sandboxStep("Reopening the QA sandbox", () =>
          Sandbox.get({
            sandboxId: input.reuseSandboxId!.trim(),
            token: vercelToken,
            teamId: vercelTeamId,
          }),
        )
        reusedSandbox = true
        console.log(
          `[TESTEES:${input.cards.map((card) => card.cardKey).join(",")}] reusing sandbox ${input.reuseSandboxId}`,
        )
      } catch (error) {
        console.error(
          `[TESTEES:${input.cards.map((card) => card.cardKey).join(",")}] unable to reopen sandbox ${input.reuseSandboxId}: ${describeSandboxError(error)}`,
        )
        sandbox = null
      }
    }

    if (!sandbox) {
      sandbox = await sandboxStep("Creating the QA sandbox", () =>
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
      console.log(
        `[TESTEES:${input.cards.map((card) => card.cardKey).join(",")}] created new sandbox ${sandbox.sandboxId}`,
      )
    }

    const activeSandbox = sandbox

    await assertCommand(
      await sandboxStep(
        reusedSandbox ? "Opening the QA branch" : "Creating the QA branch from main",
        () =>
          activeSandbox.runCommand({
            cmd: "bash",
            args: [
              "-lc",
              'git checkout "$BRANCH_NAME" || git checkout -B "$BRANCH_NAME"',
            ],
            cwd: WORKDIR,
            env: {
              BRANCH_NAME: qaBranchName,
            },
          }),
      ),
      reusedSandbox ? "Opening the QA branch" : "Creating the QA branch from main",
    )

    await assertCommand(
      await sandboxStep("Installing OpenCode", () =>
        activeSandbox.runCommand({
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
      await sandboxStep("Preparing QA config directory", () =>
        activeSandbox.runCommand({
          cmd: "mkdir",
          args: ["-p", "/tmp", ".vercel"],
        }),
      ),
      "Preparing QA config directory",
    )

    await sandboxStep("Writing QA config", () =>
      activeSandbox.writeFiles([
        {
          path: OPENCODE_CONFIG_PATH,
          content: Buffer.from(buildOpencodeConfig(glmToken, glmModel)),
        },
        {
          path: OPENCODE_TASK_PATH,
          content: Buffer.from(buildQaPrompt(input.project, input.cards, input.context)),
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

    let opencodeOutput = ""
    let changedFiles = ""
    let opencodeAttempt = 0

    while (opencodeAttempt < OPENCODE_MAX_ATTEMPTS) {
      opencodeAttempt += 1

      try {
        const run = await runLoggedCommand({
          sandbox: activeSandbox,
          label:
            opencodeAttempt === 1
              ? "Running QA OpenCode"
              : `Continuing QA OpenCode (attempt ${opencodeAttempt})`,
          prefix: `[TESTEES:${input.cards.map((card) => card.cardKey).join(",")}:attempt-${opencodeAttempt}]`,
          cmd: OPENCODE_BIN,
          args: [
            "run",
            "--model",
            modelId,
            "--print-logs",
            "--file",
            OPENCODE_TASK_PATH,
            "--format",
            "default",
            "--title",
            input.cards.length === 1
              ? `${input.cards[0].cardKey} qa task`
              : `${input.cards.length} grouped qa tasks`,
            "--dangerously-skip-permissions",
            opencodeAttempt === 1
              ? "Read the attached QA brief, write or update the required Vitest integration tests and any minimal supporting test configuration, then summarize what changed."
              : "Continue the QA work from the current repository state and any partial test changes already present. Finish the Vitest integration coverage and summarize what changed.",
          ],
          cwd: WORKDIR,
          env: {
            OPENCODE_CONFIG: OPENCODE_CONFIG_PATH,
          },
        })
        await input.onStarted?.({
          sandboxId: activeSandbox.sandboxId,
          commandId: run.command.cmdId,
        })
        await assertCommand(run.finished, "Running QA OpenCode")
        opencodeOutput = await run.finished.stdout()
          .then((output) => output.trim())
          .catch((error) => describeSandboxError(error))

        const status = await sandboxStep("Checking QA changes", () =>
          activeSandbox.runCommand({
            cmd: "git",
            args: ["status", "--short"],
            cwd: WORKDIR,
          }),
        )
        await assertCommand(status, "Checking QA changes")
        changedFiles = "stdout" in status
          ? (await safeCommandOutput(status, "stdout")).trim()
          : ""
        if (changedFiles) {
          break
        }

        if (opencodeAttempt < OPENCODE_MAX_ATTEMPTS) {
          continue
        }

        throw new Error("QA finished without creating any file changes.")
      } catch (error) {
        const message = describeSandboxError(error)
        if (
          opencodeAttempt < OPENCODE_MAX_ATTEMPTS &&
          (isRetryableOpencodeTermination(message) || isRetryableNoChanges(message))
        ) {
          continue
        }

        throw error
      }
    }

    if (!changedFiles) {
      throw new Error("QA finished without creating any file changes.")
    }

    await assertCommand(
      await sandboxStep("Ignoring sandbox deployment metadata", () =>
        activeSandbox.runCommand({
          cmd: "bash",
          args: ["-lc", "printf '\\n.vercel/\\n' >> .git/info/exclude"],
          cwd: WORKDIR,
        }),
      ),
      "Ignoring sandbox deployment metadata",
    )

    const projectRoot = await detectProjectRoot(activeSandbox)
    const integration = await sandboxStep("Running integration tests", () =>
      activeSandbox.runCommand({
        cmd: "bash",
        args: [INTEGRATION_SCRIPT_PATH],
        cwd: WORKDIR,
        env: {
          PROJECT_ROOT: projectRoot,
        },
      }),
    )
    await assertCommand(integration, "Running integration tests")
    const integrationOutput =
      "stdout" in integration ? await safeCommandOutput(integration, "stdout") : ""

    await assertCommand(
      await sandboxStep("Configuring QA git user name", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["config", "user.name", "Codapac QA"],
          cwd: WORKDIR,
        }),
      ),
      "Configuring QA git user name",
    )
    await assertCommand(
      await sandboxStep("Configuring QA git user email", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["config", "user.email", "codapac-qa@users.noreply.github.com"],
          cwd: WORKDIR,
        }),
      ),
      "Configuring QA git user email",
    )
    await assertCommand(
      await sandboxStep("Preparing QA git access", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["remote", "set-url", "origin", authRepoUrl],
          cwd: WORKDIR,
        }),
      ),
      "Preparing QA git access",
    )
    await assertCommand(
      await sandboxStep("Staging QA changes", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["add", "-A"],
          cwd: WORKDIR,
        }),
      ),
      "Staging QA changes",
    )
    await assertCommand(
      await sandboxStep("Committing QA changes", () =>
        activeSandbox.runCommand({
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
        activeSandbox.runCommand({
          cmd: "git",
          args: ["push", "origin", `HEAD:${qaBranchName}`],
          cwd: WORKDIR,
        }),
      ),
      "Pushing QA changes",
    )

    await sandboxStep("Merging QA changes into main", () =>
      mergeProjectBranchIntoMain({
        repoUrl: input.project.repoUrl,
        branchName: qaBranchName,
        baseBranch: "main",
        title:
          input.cards.length === 1
            ? `Add integration tests for ${input.cards[0].cardKey}`
            : `Add integration tests for ${input.cards.length} tasks`,
        body: [
          "QA completed integration coverage for:",
          ...input.cards.map((card) => `- ${card.cardKey}: ${card.title}`),
        ].join("\n"),
        commitMessage:
          input.cards.length === 1
            ? `Merge QA tests for ${input.cards[0].cardKey}`
            : `Merge QA tests for ${input.cards.length} tasks`,
      }),
    )

    await assertCommand(
      await sandboxStep("Checking out main for preview deployment", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["fetch", "origin", "main"],
          cwd: WORKDIR,
        }),
      ),
      "Checking out main for preview deployment",
    )
    await assertCommand(
      await sandboxStep("Preparing main preview", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["checkout", "--detach", "FETCH_HEAD"],
          cwd: WORKDIR,
        }),
      ),
      "Preparing main preview",
    )

    const deploy = await sandboxStep("Creating preview deployment", () =>
      activeSandbox.runCommand({
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
      branchName: qaBranchName,
      summary: [opencodeOutput.slice(-1_000), integrationOutput.slice(-1_000)]
        .filter(Boolean)
        .join("\n\n")
        .trim() || "QA wrote and passed integration tests.",
    }
  } catch (error) {
    const message = describeSandboxError(error)
    if (sandbox && (isRetryableOpencodeTermination(message) || isRetryableNoChanges(message))) {
      stopSandboxOnExit = false
      throw new Error(
        `OpenCode terminated before QA finished. The QA workspace was kept alive in sandbox ${sandbox.sandboxId} so the task can continue from the same files on retry.`,
      )
    }

    throw error
  } finally {
    if (sandbox && stopSandboxOnExit) {
      await sandbox.stop({ blocking: true }).catch(() => null)
    }
  }
}
