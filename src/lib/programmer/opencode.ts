"server-only"

import { Sandbox } from "@vercel/sandbox"
import type { Command, CommandFinished } from "@vercel/sandbox"

import { DEFAULT_APP_STACK_GUIDANCE } from "@/lib/agents/default-stack"
import type { ExecutionFeatureContext } from "@/lib/agents/execution-context"
import { getGitHubToken, mergeProjectBranchIntoMain } from "@/lib/boss/github"
import { getGlmModel, getGlmToken } from "@/lib/boss/glm"

const OPENCODE_BIN = "/home/vercel-sandbox/.opencode/bin/opencode"
const OPENCODE_CONFIG_PATH = "/tmp/codapac-opencode.json"
const OPENCODE_TASK_PATH = "/tmp/codapac-programmer-task.md"
const OPENCODE_MAX_ATTEMPTS = 3
const OPENCODE_CHUNK_TIMEOUT_MS = 45 * 60 * 1000
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
  context?: ExecutionFeatureContext
  reuseSandboxId?: string | null
  reuseBranchName?: string | null
  onStarted?: (details: {
    sandboxId: string
    commandId: string | null
    branchName: string
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

function buildPrompt(
  project: ProgrammerProject,
  cards: ProgrammerCard[],
  context?: ExecutionFeatureContext,
) {
  return [
    "You are the programmer agent for this repository.",
    cards.length === 1
      ? "Implement exactly one task. Do not ask follow-up questions."
      : "Implement the grouped tasks together in one cohesive change. Do not ask follow-up questions.",
    "Keep the change focused, practical, and complete enough for review.",
    "You must modify tracked repository files for this task. Do not stop after only analyzing, planning, or describing the work.",
    "If the requested work already appears to exist, verify that in the codebase and then make the smallest necessary implementation or test change so this run still leaves a meaningful diff for review.",
    "Do not exit until you have either changed tracked project files or hit a concrete repository-level blocker that you describe explicitly in your final summary.",
    DEFAULT_APP_STACK_GUIDANCE,
    "Run relevant checks if the repository makes them obvious.",
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

async function collectGitStatusSummary(sandbox: Sandbox) {
  const [statusCommand, diffStatCommand] = await Promise.all([
    sandboxStep("Checking git status", () =>
      sandbox.runCommand({
        cmd: "git",
        args: ["status", "--short"],
        cwd: WORKDIR,
      }),
    ),
    sandboxStep("Checking git diff stat", () =>
      sandbox.runCommand({
        cmd: "git",
        args: ["diff", "--stat"],
        cwd: WORKDIR,
      }),
    ),
  ])

  await assertCommand(statusCommand, "Checking git status")
  await assertCommand(diffStatCommand, "Checking git diff stat")

  const status =
    "stdout" in statusCommand
      ? redactSensitiveOutput(await safeCommandOutput(statusCommand, "stdout")).trim()
      : ""
  const diffStat =
    "stdout" in diffStatCommand
      ? redactSensitiveOutput(await safeCommandOutput(diffStatCommand, "stdout")).trim()
      : ""

  return { status, diffStat }
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

  const branchName =
    input.reuseBranchName?.trim() || buildBranchName(cards, input.externalRunId)
  const authRepoUrl = authenticatedRepoUrl(input.project.repoUrl, githubToken)
  const sourceRepoUrl = gitSourceUrl(input.project.repoUrl)
  let sandbox: Sandbox | null = null
  let stopSandboxOnExit = true
  let reusedSandbox = false

  try {
    if (input.reuseSandboxId?.trim()) {
      try {
        sandbox = await sandboxStep("Reopening the Vercel Sandbox", () =>
          Sandbox.get({
            sandboxId: input.reuseSandboxId!.trim(),
            token: input.project.vercelToken,
            teamId: input.project.vercelTeamId,
          }),
        )
        reusedSandbox = true
        console.log(
          `[FIXER:${cards.map((card) => card.cardKey).join(",")}] reusing sandbox ${input.reuseSandboxId}`,
        )
      } catch (error) {
        console.error(
          `[FIXER:${cards.map((card) => card.cardKey).join(",")}] unable to reopen sandbox ${input.reuseSandboxId}: ${describeSandboxError(error)}`,
        )
        sandbox = null
      }
    }

    if (!sandbox) {
      sandbox = await sandboxStep("Creating the Vercel Sandbox", () =>
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
      console.log(
        `[FIXER:${cards.map((card) => card.cardKey).join(",")}] created new sandbox ${sandbox.sandboxId}`,
      )
    }

    const activeSandbox = sandbox

    await assertCommand(
      await sandboxStep(
        reusedSandbox ? "Opening the task branch" : "Creating the task branch",
        () =>
          activeSandbox.runCommand({
            cmd: "bash",
            args: [
              "-lc",
              'git checkout "$BRANCH_NAME" || git checkout -B "$BRANCH_NAME"',
            ],
            cwd: WORKDIR,
            env: {
              BRANCH_NAME: branchName,
            },
          }),
      ),
      reusedSandbox ? "Opening the task branch" : "Creating the task branch",
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
      await sandboxStep("Preparing OpenCode config directory", () =>
        activeSandbox.runCommand({
          cmd: "mkdir",
          args: ["-p", "/tmp"],
        }),
      ),
      "Preparing OpenCode config",
    )

    await sandboxStep("Writing OpenCode config", () =>
      activeSandbox.writeFiles([
        {
          path: OPENCODE_CONFIG_PATH,
          content: Buffer.from(buildOpencodeConfig(glmToken, glmModel)),
        },
        {
          path: OPENCODE_TASK_PATH,
          content: Buffer.from(buildPrompt(input.project, cards, input.context)),
        },
      ]),
    )

    let opencodeOutput = ""
    let changedFiles = ""
    let lastStatusSummary = ""
    let lastDiffStat = ""
    let opencodeAttempt = 0

    while (opencodeAttempt < OPENCODE_MAX_ATTEMPTS) {
      opencodeAttempt += 1

      try {
        const run = await runLoggedCommand({
          sandbox: activeSandbox,
          label:
            opencodeAttempt === 1
              ? "Running OpenCode"
              : `Continuing OpenCode (attempt ${opencodeAttempt})`,
          prefix: `[FIXER:${cards.map((card) => card.cardKey).join(",")}:attempt-${opencodeAttempt}]`,
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
            cards.length === 1
              ? `${cards[0].cardKey} programmer task`
              : `${cards.length} grouped programmer tasks`,
            "--dangerously-skip-permissions",
            opencodeAttempt === 1
              ? "Read the attached task brief, implement the requested work in this repository, modify the necessary tracked files now, run any obvious checks, and then summarize exactly what changed."
              : "Continue implementing from the current repository state and any partial changes already present. You must leave tracked repository file changes behind before exiting unless there is a concrete blocker. Finish the requested work, run any obvious checks, and then summarize exactly what changed.",
          ],
          cwd: WORKDIR,
          env: {
            OPENCODE_CONFIG: OPENCODE_CONFIG_PATH,
          },
        })
        await input.onStarted?.({
          sandboxId: sandbox.sandboxId,
          commandId: run.command.cmdId,
          branchName,
        })
        await assertCommand(run.finished, "Running OpenCode")
        opencodeOutput = await run.finished.stdout()
          .then((output) => output.trim())
          .catch((error) => describeSandboxError(error))

        const gitSummary = await collectGitStatusSummary(activeSandbox)
        changedFiles = gitSummary.status
        lastStatusSummary = gitSummary.status
        lastDiffStat = gitSummary.diffStat
        if (changedFiles) {
          break
        }

        if (opencodeAttempt < OPENCODE_MAX_ATTEMPTS) {
          continue
        }

        throw new Error(
          [
            "Programmer finished without creating any file changes.",
            opencodeOutput ? `Last OpenCode output:\n${opencodeOutput.slice(-1_200)}` : "",
            lastStatusSummary
              ? `Last git status:\n${lastStatusSummary}`
              : "Last git status: (clean working tree)",
            lastDiffStat ? `Last git diff stat:\n${lastDiffStat}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        )
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
      throw new Error(
        [
          "Programmer finished without creating any file changes.",
          opencodeOutput ? `Last OpenCode output:\n${opencodeOutput.slice(-1_200)}` : "",
          lastStatusSummary
            ? `Last git status:\n${lastStatusSummary}`
            : "Last git status: (clean working tree)",
          lastDiffStat ? `Last git diff stat:\n${lastDiffStat}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      )
    }

    await assertCommand(
      await sandboxStep("Configuring git user name", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["config", "user.name", "Codapac Programmer"],
          cwd: WORKDIR,
        }),
      ),
      "Configuring git user name",
    )
    await assertCommand(
      await sandboxStep("Configuring git user email", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["config", "user.email", "codapac-programmer@users.noreply.github.com"],
          cwd: WORKDIR,
        }),
      ),
      "Configuring git user email",
    )
    await assertCommand(
      await sandboxStep("Preparing repository push access", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["remote", "set-url", "origin", authRepoUrl],
          cwd: WORKDIR,
        }),
      ),
      "Preparing repository push access",
    )
    await assertCommand(
      await sandboxStep("Staging programmer changes", () =>
        activeSandbox.runCommand({
          cmd: "git",
          args: ["add", "-A"],
          cwd: WORKDIR,
        }),
      ),
      "Staging programmer changes",
    )
    await assertCommand(
      await sandboxStep("Committing programmer changes", () =>
        activeSandbox.runCommand({
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
        activeSandbox.runCommand({
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
  } catch (error) {
    const message = describeSandboxError(error)
    if (sandbox && isRetryableOpencodeTermination(message)) {
      stopSandboxOnExit = false
      throw new Error(
        `OpenCode terminated before finishing. The workspace was kept alive in sandbox ${sandbox.sandboxId} so the task can continue from the same files on retry.`,
      )
    }

    throw error
  } finally {
    if (sandbox && stopSandboxOnExit) {
      await sandbox.stop({ blocking: true }).catch(() => null)
    }
  }
}
