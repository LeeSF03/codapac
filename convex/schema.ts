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
const planningStatus = v.union(
  v.literal("idle"),
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("blocked"),
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
    issueNumber: v.number(),
    agent: projectRole,
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
    provider: v.union(v.literal("vercel-sandbox"), v.literal("manual")),
    externalRunId: v.union(v.string(), v.null()),
    notes: v.union(v.string(), v.null()),
    error: v.union(v.string(), v.null()),
    updatedAt: v.number(),
  }).index("by_projectId_and_updatedAt", ["projectId", "updatedAt"]),
})

export default schema
