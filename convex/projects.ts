import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"

const projectColorValidator = v.union(
  v.literal("amber"),
  v.literal("sky"),
  v.literal("emerald"),
  v.literal("violet"),
  v.literal("rose"),
  v.literal("slate"),
)

const projectVisibilityValidator = v.union(
  v.literal("private"),
  v.literal("public"),
)

const projectRoleValidator = v.union(
  v.literal("PM"),
  v.literal("ENG"),
  v.literal("QA"),
)

const projectPriorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
)

type ProjectRole = "PM" | "ENG" | "QA"
type BoardTone = "todo" | "progress" | "done" | "merged"

const toneOrder: BoardTone[] = ["todo", "progress", "done", "merged"]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s/._-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
}

function normalizeTags(tags: string[]): string[] {
  return tags
    .map((tag) =>
      tag
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter((tag) => tag.length > 0)
    .slice(0, 4)
}

function normalizeAcceptanceCriteria(criteria: string[]): string[] {
  return criteria
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 8)
}

function formatTimeLabel(timestamp: number): string {
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function projectPrefix(slug: string): string {
  const match = /[A-Za-z]+/.exec(slug.replace(/^.*\//, "").toUpperCase())
  return (match?.[0] ?? "CDP").slice(0, 4)
}

async function requireViewer(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("You must be signed in.")
  }
  return identity
}

async function getOwnedProjectOrThrow(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const identity = await requireViewer(ctx)
  const project = await ctx.db.get(projectId)
  if (!project || project.ownerTokenIdentifier !== identity.tokenIdentifier) {
    throw new Error("Project not found.")
  }
  return { identity, project }
}

async function appendActivity(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  who: ProjectRole | "SYSTEM" | "USER",
  text: string,
  createdAt: number,
) {
  await ctx.db.insert("projectActivity", {
    projectId,
    who,
    text,
    createdAt,
  })
}

function serializeProject(project: Doc<"projects">) {
  return {
    id: project._id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    emoji: project.emoji,
    color: project.color,
    visibility: project.visibility,
    status: project.status,
    repoUrl: project.repoUrl ?? undefined,
    vercelProjectId: project.vercelProjectId ?? undefined,
    createdAt: project._creationTime,
    updatedAt: project.updatedAt,
    starred: project.starred,
    stats: {
      openIssues: project.openIssueCount,
      prsThisWeek: 0,
      cycleTime: "—",
    },
    planning: {
      status: project.latestPlanningStatus,
      prompt: project.latestPlanningPrompt ?? undefined,
      requestedAt: project.latestPlanningRequestedAt ?? undefined,
    },
  }
}

function cardActivityText(cardKey: string, title: string, nextTone: BoardTone) {
  void title
  if (nextTone === "progress") {
    return {
      who: "ENG" as const,
      text: `Started working on ${cardKey}.`,
    }
  }
  if (nextTone === "done") {
    return {
      who: "ENG" as const,
      text: `Finished the first pass for ${cardKey}.`,
    }
  }
  if (nextTone === "merged") {
    return {
      who: "QA" as const,
      text: `${cardKey} has been approved.`,
    }
  }
  return {
    who: "PM" as const,
    text: `Moved ${cardKey} back to To Do for another pass.`,
  }
}

function projectCountPatch(
  previousTone: BoardTone,
  nextTone: BoardTone,
  project: Doc<"projects">,
) {
  let openIssueCount = project.openIssueCount
  let mergedCount = project.mergedCount

  if (previousTone !== "merged" && nextTone === "merged") {
    openIssueCount = Math.max(0, openIssueCount - 1)
    mergedCount += 1
  } else if (previousTone === "merged" && nextTone !== "merged") {
    openIssueCount += 1
    mergedCount = Math.max(0, mergedCount - 1)
  }

  return { openIssueCount, mergedCount }
}

async function getCardOrThrow(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  cardKey: string,
) {
  const card = await ctx.db
    .query("projectCards")
    .withIndex("by_projectId_and_cardKey", (q) =>
      q.eq("projectId", projectId).eq("cardKey", cardKey),
    )
    .unique()

  if (!card) {
    throw new Error("Issue not found.")
  }

  return card
}

async function getPlanningJobOrThrow(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  jobId: Id<"projectPlanningJobs">,
) {
  const job = await ctx.db.get(jobId)
  if (!job || job.projectId !== projectId) {
    throw new Error("Planning job not found.")
  }
  return job
}

async function getProgrammerJobOrThrow(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  jobId: Id<"projectProgrammerJobs">,
) {
  const job = await ctx.db.get(jobId)
  if (!job || job.projectId !== projectId) {
    throw new Error("Programmer job not found.")
  }
  return job
}

async function queuePlanningJob(
  ctx: MutationCtx,
  project: Doc<"projects">,
  ownerTokenIdentifier: string,
  prompt: string,
) {
  const now = Date.now()

  await ctx.db.insert("projectPlanningJobs", {
    projectId: project._id,
    ownerTokenIdentifier,
    prompt,
    status: "queued",
    provider: "hosted-boss",
    externalRunId: null,
    notes: "Waiting for BOSS to pick up the planning brief.",
    error: null,
    updatedAt: now,
  })

  await ctx.db.patch(project._id, {
    latestPlanningStatus: "queued",
    latestPlanningPrompt: prompt,
    latestPlanningRequestedAt: now,
    updatedAt: now,
    lastActivityAt: now,
  })

  await appendActivity(
    ctx,
    project._id,
    "SYSTEM",
    "BOSS planning request queued. The backlog will stay empty until BOSS posts the generated cards back.",
    now,
  )
}

export const listForViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_ownerTokenIdentifier_and_updatedAt", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .take(100)

    return projects.map(serializeProject)
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_ownerTokenIdentifier_and_slug", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("slug", args.slug),
      )
      .unique()

    return project ? serializeProject(project) : null
  },
})

export const getBoard = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)

    const cards = await ctx.db
      .query("projectCards")
      .withIndex("by_projectId_and_updatedAt", (q) =>
        q.eq("projectId", project._id),
      )
      .order("desc")
      .take(200)

    const activity = await ctx.db
      .query("projectActivity")
      .withIndex("by_projectId_and_createdAt", (q) =>
        q.eq("projectId", project._id),
      )
      .order("desc")
      .take(50)

    return {
      cards: cards.map((card) => ({
        id: card.cardKey,
        title: card.title,
        issueNumber: card.issueNumber,
        agent: card.agent,
        tags: card.tags,
        tone: card.tone,
        createdAt: card._creationTime,
        updatedAt: card.updatedAt,
      })),
      activity: activity
        .slice()
        .reverse()
        .map((entry) => ({
          id: entry._id,
          who: entry.who,
          time: formatTimeLabel(entry.createdAt),
          text: entry.text,
          createdAt: entry.createdAt,
        })),
      typing: null,
    }
  },
})

export const createProject = mutation({
  args: {
    name: v.string(),
    slug: v.union(v.string(), v.null()),
    description: v.union(v.string(), v.null()),
    emoji: v.union(v.string(), v.null()),
    color: v.union(projectColorValidator, v.null()),
    visibility: v.union(projectVisibilityValidator, v.null()),
    repoUrl: v.union(v.string(), v.null()),
    kickoffPrompt: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await requireViewer(ctx)
    const name = args.name.trim()
    if (!name) {
      throw new Error("Project name is required.")
    }

    const slug = slugify(args.slug?.trim() || name)
    if (!slug) {
      throw new Error("Project slug is required.")
    }

    const existing = await ctx.db
      .query("projects")
      .withIndex("by_ownerTokenIdentifier_and_slug", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier).eq("slug", slug),
      )
      .unique()

    if (existing) {
      throw new Error("You already have a project with that slug.")
    }

    const now = Date.now()
    const kickoffPrompt = args.kickoffPrompt?.trim() || null
    const projectId = await ctx.db.insert("projects", {
      ownerTokenIdentifier: identity.tokenIdentifier,
      name,
      slug,
      description: args.description?.trim() || "",
      emoji: args.emoji?.trim() || "📦",
      color: args.color ?? "slate",
      visibility: args.visibility ?? "private",
      status: "active",
      repoUrl: args.repoUrl?.trim() || null,
      vercelProjectId: null,
      starred: false,
      nextCardSeq: 1,
      nextIssueSeq: 1,
      openIssueCount: 0,
      mergedCount: 0,
      updatedAt: now,
      lastActivityAt: now,
      latestPlanningStatus: kickoffPrompt ? "queued" : "idle",
      latestPlanningPrompt: kickoffPrompt,
      latestPlanningRequestedAt: kickoffPrompt ? now : null,
    })

    await appendActivity(
      ctx,
      projectId,
      "SYSTEM",
      "Board created. Drop an issue or ask BOSS to plan the backlog.",
      now,
    )

    if (kickoffPrompt) {
      const project = await ctx.db.get(projectId)
      if (project) {
        await queuePlanningJob(
          ctx,
          project,
          identity.tokenIdentifier,
          kickoffPrompt,
        )
      }
    }

    return { id: projectId, slug }
  },
})

export const toggleStar = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    await ctx.db.patch(project._id, {
      starred: !project.starred,
      updatedAt: Date.now(),
    })
    return { starred: !project.starred }
  },
})

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)

    while (true) {
      const cards = await ctx.db
        .query("projectCards")
        .withIndex("by_projectId_and_updatedAt", (q) =>
          q.eq("projectId", project._id),
        )
        .take(128)

      if (cards.length === 0) {
        break
      }

      for (const card of cards) {
        await ctx.db.delete(card._id)
      }
    }

    while (true) {
      const activity = await ctx.db
        .query("projectActivity")
        .withIndex("by_projectId_and_createdAt", (q) =>
          q.eq("projectId", project._id),
        )
        .take(128)

      if (activity.length === 0) {
        break
      }

      for (const entry of activity) {
        await ctx.db.delete(entry._id)
      }
    }

    while (true) {
      const jobs = await ctx.db
        .query("projectPlanningJobs")
        .withIndex("by_projectId_and_updatedAt", (q) =>
          q.eq("projectId", project._id),
        )
        .take(128)

      if (jobs.length === 0) {
        break
      }

      for (const job of jobs) {
        await ctx.db.delete(job._id)
      }
    }

    while (true) {
      const jobs = await ctx.db
        .query("projectProgrammerJobs")
        .withIndex("by_projectId_and_updatedAt", (q) =>
          q.eq("projectId", project._id),
        )
        .take(128)

      if (jobs.length === 0) {
        break
      }

      for (const job of jobs) {
        await ctx.db.delete(job._id)
      }
    }

    await ctx.db.delete(project._id)
    return null
  },
})

export const createIssue = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    agent: v.union(projectRoleValidator, v.null()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const title = args.title.trim()
    if (!title) {
      throw new Error("Issue title is required.")
    }

    const now = Date.now()
    const cardKey = `${projectPrefix(project.slug)}-${project.nextCardSeq}`
    const issueNumber = project.nextIssueSeq
    const agent = args.agent ?? "PM"
    const tags = normalizeTags(args.tags)

    await ctx.db.insert("projectCards", {
      projectId: project._id,
      cardKey,
      title,
      description: "",
      acceptanceCriteria: [],
      issueNumber,
      agent,
      priority: "medium",
      tags,
      tone: "todo",
      createdByTokenIdentifier: identity.tokenIdentifier,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      nextCardSeq: project.nextCardSeq + 1,
      nextIssueSeq: project.nextIssueSeq + 1,
      openIssueCount: project.openIssueCount + 1,
      updatedAt: now,
      lastActivityAt: now,
    })

    await appendActivity(
      ctx,
      project._id,
      "PM",
      `Filed ${cardKey} from issue #${issueNumber} — queued in To Do.`,
      now,
    )

    return { id: cardKey }
  },
})

export const createIssueFromBoss = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.string(),
    acceptanceCriteria: v.array(v.string()),
    agent: v.union(projectRoleValidator, v.null()),
    priority: v.union(projectPriorityValidator, v.null()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const title = args.title.trim()
    if (!title) {
      throw new Error("Issue title is required.")
    }

    const now = Date.now()
    const cardKey = `${projectPrefix(project.slug)}-${project.nextCardSeq}`
    const issueNumber = project.nextIssueSeq
    const agent = args.agent ?? "PM"
    const priority = args.priority ?? "medium"
    const tags = normalizeTags(args.tags)

    await ctx.db.insert("projectCards", {
      projectId: project._id,
      cardKey,
      title,
      description: args.description.trim(),
      acceptanceCriteria: normalizeAcceptanceCriteria(args.acceptanceCriteria),
      issueNumber,
      agent,
      priority,
      tags,
      tone: "todo",
      createdByTokenIdentifier: identity.tokenIdentifier,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      nextCardSeq: project.nextCardSeq + 1,
      nextIssueSeq: project.nextIssueSeq + 1,
      openIssueCount: project.openIssueCount + 1,
      updatedAt: now,
      lastActivityAt: now,
    })

    await appendActivity(
      ctx,
      project._id,
      "PM",
      `BOSS filed ${cardKey} from chat — queued in To Do.`,
      now,
    )

    return { id: cardKey }
  },
})

export const queueBossPlanning = mutation({
  args: {
    projectId: v.id("projects"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const prompt = args.prompt.trim()
    if (!prompt) {
      throw new Error("Planning prompt is required.")
    }

    await queuePlanningJob(ctx, project, identity.tokenIdentifier, prompt)
    return null
  },
})

export const claimBossPlanning = mutation({
  args: {
    projectId: v.id("projects"),
    externalRunId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const [job] = await ctx.db
      .query("projectPlanningJobs")
      .withIndex("by_projectId_and_status_and_updatedAt", (q) =>
        q.eq("projectId", project._id).eq("status", "queued"),
      )
      .order("desc")
      .take(1)

    if (!job) {
      return null
    }

    const now = Date.now()
    await ctx.db.patch(job._id, {
      status: "running",
      provider: "hosted-boss",
      externalRunId: args.externalRunId,
      notes: "BOSS is reviewing the product brief and preparing the initial backlog.",
      error: null,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      latestPlanningStatus: "running",
      updatedAt: now,
      lastActivityAt: now,
    })

    await appendActivity(
      ctx,
      project._id,
      "SYSTEM",
      "BOSS started planning the initial backlog.",
      now,
    )

    return {
      jobId: job._id,
      project: {
        id: project._id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        visibility: project.visibility,
        repoUrl: project.repoUrl,
      },
      prompt: job.prompt,
    }
  },
})

export const completeBossPlanning = mutation({
  args: {
    projectId: v.id("projects"),
    jobId: v.id("projectPlanningJobs"),
    repoUrl: v.union(v.string(), v.null()),
    summary: v.string(),
    todos: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        acceptanceCriteria: v.array(v.string()),
        labels: v.array(v.string()),
        priority: projectPriorityValidator,
        agent: projectRoleValidator,
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const job = await getPlanningJobOrThrow(ctx, project._id, args.jobId)
    if (job.status !== "running") {
      throw new Error("Planning job is not running.")
    }

    const summary = args.summary.trim()
    if (!summary) {
      throw new Error("Planning summary is required.")
    }

    const now = Date.now()
    let nextCardSeq = project.nextCardSeq
    let nextIssueSeq = project.nextIssueSeq

    for (const todo of args.todos) {
      const title = todo.title.trim()
      if (!title) {
        continue
      }

      const cardKey = `${projectPrefix(project.slug)}-${nextCardSeq}`
      const issueNumber = nextIssueSeq
      nextCardSeq += 1
      nextIssueSeq += 1

      await ctx.db.insert("projectCards", {
        projectId: project._id,
        cardKey,
        title,
        description: todo.description.trim(),
        acceptanceCriteria: normalizeAcceptanceCriteria(todo.acceptanceCriteria),
        issueNumber,
        agent: todo.agent,
        priority: todo.priority,
        tags: normalizeTags(todo.labels),
        tone: "todo",
        createdByTokenIdentifier: identity.tokenIdentifier,
        updatedAt: now,
      })
    }

    const createdCount = nextIssueSeq - project.nextIssueSeq
    const normalizedRepoUrl = args.repoUrl?.trim() || null

    await ctx.db.patch(job._id, {
      status: "completed",
      provider: "hosted-boss",
      notes: summary,
      error: null,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      repoUrl: normalizedRepoUrl ?? project.repoUrl,
      nextCardSeq,
      nextIssueSeq,
      openIssueCount: project.openIssueCount + createdCount,
      latestPlanningStatus: "completed",
      updatedAt: now,
      lastActivityAt: now,
    })

    if (normalizedRepoUrl && normalizedRepoUrl !== project.repoUrl) {
      await appendActivity(
        ctx,
        project._id,
        "SYSTEM",
        `Repository linked: ${normalizedRepoUrl}`,
        now,
      )
    }

    await appendActivity(
      ctx,
      project._id,
      "PM",
      `BOSS planned ${createdCount} backlog item${createdCount === 1 ? "" : "s"}. ${summary}`,
      now + 1,
    )

    return { createdCount }
  },
})

export const failBossPlanning = mutation({
  args: {
    projectId: v.id("projects"),
    jobId: v.id("projectPlanningJobs"),
    repoUrl: v.union(v.string(), v.null()),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const job = await getPlanningJobOrThrow(ctx, project._id, args.jobId)
    const message = args.error.trim()
    if (!message) {
      throw new Error("Planning error is required.")
    }

    const now = Date.now()
    const normalizedRepoUrl = args.repoUrl?.trim() || null

    await ctx.db.patch(job._id, {
      status: "failed",
      provider: "hosted-boss",
      notes: null,
      error: message,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      repoUrl: normalizedRepoUrl ?? project.repoUrl,
      latestPlanningStatus: "failed",
      updatedAt: now,
      lastActivityAt: now,
    })

    if (normalizedRepoUrl && normalizedRepoUrl !== project.repoUrl) {
      await appendActivity(
        ctx,
        project._id,
        "SYSTEM",
        `Repository linked: ${normalizedRepoUrl}`,
        now,
      )
    }

    await appendActivity(
      ctx,
      project._id,
      "SYSTEM",
      `BOSS planning failed: ${message}`,
      now + 1,
    )

    return null
  },
})

export const claimProgrammerExecution = mutation({
  args: {
    projectId: v.id("projects"),
    cardKey: v.string(),
    externalRunId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const cardKey = args.cardKey.trim()
    if (!cardKey) {
      throw new Error("Card key is required.")
    }

    const card = await getCardOrThrow(ctx, project._id, cardKey)
    if (card.tone === "done" || card.tone === "merged") {
      throw new Error("This task is already past active development.")
    }

    const [activeJob] = await ctx.db
      .query("projectProgrammerJobs")
      .withIndex("by_projectId_and_cardKey_and_status_and_updatedAt", (q) =>
        q.eq("projectId", project._id).eq("cardKey", card.cardKey).eq("status", "running"),
      )
      .order("desc")
      .take(1)

    if (activeJob) {
      return null
    }

    const now = Date.now()
    const jobId = await ctx.db.insert("projectProgrammerJobs", {
      projectId: project._id,
      ownerTokenIdentifier: identity.tokenIdentifier,
      cardKey: card.cardKey,
      status: "running",
      provider: "opencode-vercel-sandbox",
      externalRunId: args.externalRunId,
      sandboxId: null,
      commandId: null,
      repoUrl: project.repoUrl,
      vercelProjectId: project.vercelProjectId,
      branchName: null,
      notes: "Programmer is preparing the workspace.",
      error: null,
      updatedAt: now,
    })

    if (card.tone !== "progress") {
      await ctx.db.patch(card._id, {
        tone: "progress",
        updatedAt: now,
      })
    }

    await ctx.db.patch(project._id, {
      updatedAt: now,
      lastActivityAt: now,
    })

    await appendActivity(
      ctx,
      project._id,
      "ENG",
      `Programmer started working on ${card.cardKey}.`,
      now,
    )

    return {
      jobId,
      project: {
        id: project._id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        visibility: project.visibility,
        repoUrl: project.repoUrl,
        vercelProjectId: project.vercelProjectId,
      },
      card: {
        cardKey: card.cardKey,
        title: card.title,
        description: card.description,
        acceptanceCriteria: card.acceptanceCriteria,
        priority: card.priority,
        tags: card.tags,
      },
    }
  },
})

export const markProgrammerExecutionStarted = mutation({
  args: {
    projectId: v.id("projects"),
    jobId: v.id("projectProgrammerJobs"),
    repoUrl: v.string(),
    vercelProjectId: v.string(),
    branchName: v.string(),
    sandboxId: v.union(v.string(), v.null()),
    commandId: v.union(v.string(), v.null()),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const job = await getProgrammerJobOrThrow(ctx, project._id, args.jobId)
    if (job.status !== "running") {
      throw new Error("Programmer job is not running.")
    }

    const now = Date.now()
    await ctx.db.patch(job._id, {
      repoUrl: args.repoUrl.trim(),
      vercelProjectId: args.vercelProjectId.trim(),
      branchName: args.branchName.trim(),
      sandboxId: args.sandboxId,
      commandId: args.commandId,
      notes: args.notes.trim() || "Programmer is working on the task.",
      error: null,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      repoUrl: args.repoUrl.trim() || project.repoUrl,
      vercelProjectId: args.vercelProjectId.trim() || project.vercelProjectId,
      updatedAt: now,
      lastActivityAt: now,
    })

    return null
  },
})

export const completeProgrammerExecution = mutation({
  args: {
    projectId: v.id("projects"),
    jobId: v.id("projectProgrammerJobs"),
    repoUrl: v.string(),
    vercelProjectId: v.string(),
    branchName: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const job = await getProgrammerJobOrThrow(ctx, project._id, args.jobId)
    if (job.status !== "running") {
      throw new Error("Programmer job is not running.")
    }

    const card = await getCardOrThrow(ctx, project._id, job.cardKey)
    const now = Date.now()
    const nextCounts = projectCountPatch(card.tone, "done", project)

    await ctx.db.patch(card._id, {
      tone: "done",
      updatedAt: now,
    })

    await ctx.db.patch(job._id, {
      status: "completed",
      repoUrl: args.repoUrl.trim(),
      vercelProjectId: args.vercelProjectId.trim(),
      branchName: args.branchName.trim(),
      notes: args.summary.trim() || "Programmer finished the task.",
      error: null,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      ...nextCounts,
      repoUrl: args.repoUrl.trim() || project.repoUrl,
      vercelProjectId: args.vercelProjectId.trim() || project.vercelProjectId,
      updatedAt: now,
      lastActivityAt: now,
    })

    await appendActivity(
      ctx,
      project._id,
      "ENG",
      `Programmer finished ${card.cardKey}. It is ready for review.`,
      now,
    )

    return null
  },
})

export const failProgrammerExecution = mutation({
  args: {
    projectId: v.id("projects"),
    jobId: v.id("projectProgrammerJobs"),
    repoUrl: v.union(v.string(), v.null()),
    vercelProjectId: v.union(v.string(), v.null()),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const job = await getProgrammerJobOrThrow(ctx, project._id, args.jobId)
    const message = args.error.trim()
    if (!message) {
      throw new Error("Programmer error is required.")
    }

    const card = await getCardOrThrow(ctx, project._id, job.cardKey)
    const now = Date.now()

    await ctx.db.patch(card._id, {
      tone: "todo",
      updatedAt: now,
    })

    await ctx.db.patch(job._id, {
      status: "failed",
      repoUrl: args.repoUrl?.trim() || job.repoUrl,
      vercelProjectId: args.vercelProjectId?.trim() || job.vercelProjectId,
      notes: null,
      error: message,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      repoUrl: args.repoUrl?.trim() || project.repoUrl,
      vercelProjectId: args.vercelProjectId?.trim() || project.vercelProjectId,
      updatedAt: now,
      lastActivityAt: now,
    })

    await appendActivity(
      ctx,
      project._id,
      "SYSTEM",
      `Programmer could not finish ${card.cardKey}. The task is back in To Do.`,
      now,
    )

    return null
  },
})

export const advanceCard = mutation({
  args: {
    projectId: v.id("projects"),
    cardKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const card = await getCardOrThrow(ctx, project._id, args.cardKey)
    const toneIndex = toneOrder.indexOf(card.tone)
    if (toneIndex === -1 || toneIndex === toneOrder.length - 1) {
      return null
    }

    const nextTone = toneOrder[toneIndex + 1]
    const now = Date.now()
    const nextCounts = projectCountPatch(card.tone, nextTone, project)

    await ctx.db.patch(card._id, {
      tone: nextTone,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      ...nextCounts,
      updatedAt: now,
      lastActivityAt: now,
    })

    const activity = cardActivityText(card.cardKey, card.title, nextTone)
    await appendActivity(ctx, project._id, activity.who, activity.text, now)
    return null
  },
})

export const regressCard = mutation({
  args: {
    projectId: v.id("projects"),
    cardKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const card = await getCardOrThrow(ctx, project._id, args.cardKey)
    const toneIndex = toneOrder.indexOf(card.tone)
    if (toneIndex <= 0) {
      return null
    }

    const nextTone = toneOrder[toneIndex - 1]
    const now = Date.now()
    const nextCounts = projectCountPatch(card.tone, nextTone, project)

    await ctx.db.patch(card._id, {
      tone: nextTone,
      updatedAt: now,
    })

    await ctx.db.patch(project._id, {
      ...nextCounts,
      updatedAt: now,
      lastActivityAt: now,
    })

    const activity = cardActivityText(card.cardKey, card.title, nextTone)
    await appendActivity(ctx, project._id, activity.who, activity.text, now)
    return null
  },
})

export const deleteCard = mutation({
  args: {
    projectId: v.id("projects"),
    cardKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const card = await getCardOrThrow(ctx, project._id, args.cardKey)
    const now = Date.now()

    await ctx.db.delete(card._id)

    await ctx.db.patch(project._id, {
      openIssueCount:
        card.tone === "merged"
          ? project.openIssueCount
          : Math.max(0, project.openIssueCount - 1),
      mergedCount:
        card.tone === "merged"
          ? Math.max(0, project.mergedCount - 1)
          : project.mergedCount,
      updatedAt: now,
      lastActivityAt: now,
    })

    await appendActivity(ctx, project._id, "PM", `Archived ${card.cardKey}.`, now)
    return null
  },
})
