import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const projectColor = v.union(
  v.literal("amber"),
  v.literal("sky"),
  v.literal("emerald"),
  v.literal("violet"),
  v.literal("rose"),
  v.literal("slate"),
)

const projectVisibility = v.union(v.literal("private"), v.literal("public"))
const projectStatus = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived"),
)
const projectRole = v.union(v.literal("PM"), v.literal("ENG"), v.literal("QA"))
const projectPriority = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
)
const boardTone = v.union(
  v.literal("todo"),
  v.literal("progress"),
  v.literal("done"),
  v.literal("merged"),
)
const activityActor = v.union(
  projectRole,
  v.literal("SYSTEM"),
  v.literal("USER"),
)
const chatRole = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
)
const chatAuthor = v.union(
  v.literal("USER"),
  v.literal("BOSS"),
  v.literal("SYSTEM"),
)
const planningStatus = v.union(
  v.literal("idle"),
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("blocked"),
)
const planningProvider = v.union(
  v.literal("hosted-boss"),
  v.literal("vercel-sandbox"),
  v.literal("manual"),
)
const executionStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
)
const executionProvider = v.union(
  v.literal("opencode-vercel-sandbox"),
  v.literal("manual"),
)
const qaProvider = v.union(
  v.literal("opencode-integration-vercel-sandbox"),
  v.literal("manual"),
)

const schema = defineSchema({
  projects: defineTable({
    ownerTokenIdentifier: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    emoji: v.string(),
    color: projectColor,
    visibility: projectVisibility,
    status: projectStatus,
    repoUrl: v.union(v.string(), v.null()),
    vercelProjectId: v.optional(v.union(v.string(), v.null())),
    starred: v.boolean(),
    nextCardSeq: v.number(),
    nextIssueSeq: v.number(),
    openIssueCount: v.number(),
    mergedCount: v.number(),
    updatedAt: v.number(),
    lastActivityAt: v.number(),
    latestPlanningStatus: planningStatus,
    latestPlanningPrompt: v.union(v.string(), v.null()),
    latestPlanningRequestedAt: v.union(v.number(), v.null()),
  })
    .index("by_ownerTokenIdentifier_and_updatedAt", [
      "ownerTokenIdentifier",
      "updatedAt",
    ])
    .index("by_ownerTokenIdentifier_and_slug", [
      "ownerTokenIdentifier",
      "slug",
    ]),
  projectCards: defineTable({
    projectId: v.id("projects"),
    cardKey: v.string(),
    title: v.string(),
    description: v.string(),
    acceptanceCriteria: v.array(v.string()),
    issueNumber: v.number(),
    agent: projectRole,
    priority: projectPriority,
    tags: v.array(v.string()),
    tone: boardTone,
    createdByTokenIdentifier: v.string(),
    updatedAt: v.number(),
  })
    .index("by_projectId_and_updatedAt", ["projectId", "updatedAt"])
    .index("by_projectId_and_cardKey", ["projectId", "cardKey"]),
  projectActivity: defineTable({
    projectId: v.id("projects"),
    who: activityActor,
    text: v.string(),
    createdAt: v.number(),
  }).index("by_projectId_and_createdAt", ["projectId", "createdAt"]),
  projectPlanningJobs: defineTable({
    projectId: v.id("projects"),
    ownerTokenIdentifier: v.string(),
    prompt: v.string(),
    status: planningStatus,
    provider: planningProvider,
    externalRunId: v.union(v.string(), v.null()),
    notes: v.union(v.string(), v.null()),
    error: v.union(v.string(), v.null()),
    updatedAt: v.number(),
  })
    .index("by_projectId_and_updatedAt", ["projectId", "updatedAt"])
    .index("by_projectId_and_status_and_updatedAt", [
      "projectId",
      "status",
      "updatedAt",
    ]),
  projectProgrammerJobs: defineTable({
    projectId: v.id("projects"),
    ownerTokenIdentifier: v.string(),
    cardKey: v.string(),
    status: executionStatus,
    provider: executionProvider,
    externalRunId: v.union(v.string(), v.null()),
    sandboxId: v.union(v.string(), v.null()),
    commandId: v.union(v.string(), v.null()),
    repoUrl: v.union(v.string(), v.null()),
    vercelProjectId: v.optional(v.union(v.string(), v.null())),
    branchName: v.union(v.string(), v.null()),
    notes: v.union(v.string(), v.null()),
    error: v.union(v.string(), v.null()),
    updatedAt: v.number(),
  })
    .index("by_projectId_and_updatedAt", ["projectId", "updatedAt"])
    .index("by_projectId_and_cardKey_and_updatedAt", [
      "projectId",
      "cardKey",
      "updatedAt",
    ])
    .index("by_projectId_and_cardKey_and_status_and_updatedAt", [
      "projectId",
      "cardKey",
      "status",
      "updatedAt",
    ]),
  projectQaJobs: defineTable({
    projectId: v.id("projects"),
    ownerTokenIdentifier: v.string(),
    cardKey: v.string(),
    status: executionStatus,
    provider: qaProvider,
    externalRunId: v.union(v.string(), v.null()),
    sandboxId: v.union(v.string(), v.null()),
    commandId: v.union(v.string(), v.null()),
    repoUrl: v.union(v.string(), v.null()),
    vercelProjectId: v.optional(v.union(v.string(), v.null())),
    branchName: v.union(v.string(), v.null()),
    previewDeploymentUrl: v.union(v.string(), v.null()),
    notes: v.union(v.string(), v.null()),
    error: v.union(v.string(), v.null()),
    updatedAt: v.number(),
  })
    .index("by_projectId_and_updatedAt", ["projectId", "updatedAt"])
    .index("by_projectId_and_cardKey_and_updatedAt", [
      "projectId",
      "cardKey",
      "updatedAt",
    ])
    .index("by_projectId_and_cardKey_and_status_and_updatedAt", [
      "projectId",
      "cardKey",
      "status",
      "updatedAt",
    ]),
  projectChatMessages: defineTable({
    projectId: v.id("projects"),
    role: chatRole,
    author: chatAuthor,
    authorTokenIdentifier: v.union(v.string(), v.null()),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_projectId_and_createdAt", ["projectId", "createdAt"]),
  projectChatEmbeddings: defineTable({
    projectId: v.id("projects"),
    messageId: v.id("projectChatMessages"),
    content: v.string(),
    embedding: v.array(v.float64()),
    createdAt: v.number(),
  })
    .index("by_projectId_and_createdAt", ["projectId", "createdAt"])
    .index("by_messageId", ["messageId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 256,
      filterFields: ["projectId"],
    }),
})

export default schema
