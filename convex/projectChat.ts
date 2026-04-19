import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"

const chatRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
)

const chatAuthorValidator = v.union(
  v.literal("USER"),
  v.literal("BOSS"),
  v.literal("SYSTEM"),
)

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

function formatTimeLabel(timestamp: number): string {
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

export const listMessages = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await getOwnedProjectOrThrow(ctx, args.projectId)

    const messages = await ctx.db
      .query("projectChatMessages")
      .withIndex("by_projectId_and_createdAt", (q) =>
        q.eq("projectId", args.projectId),
      )
      .order("asc")
      .take(200)

    return messages.map((message) => ({
      id: message._id,
      role: message.role,
      author: message.author,
      content: message.content,
      createdAt: message.createdAt,
      time: formatTimeLabel(message.createdAt),
    }))
  },
})

export const listRecentForContext = query({
  args: {
    projectId: v.id("projects"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    await getOwnedProjectOrThrow(ctx, args.projectId)

    const messages = await ctx.db
      .query("projectChatMessages")
      .withIndex("by_projectId_and_createdAt", (q) =>
        q.eq("projectId", args.projectId),
      )
      .order("desc")
      .take(Math.max(1, Math.min(args.limit, 32)))

    return messages.slice().reverse().map((message) => ({
      id: message._id,
      role: message.role,
      author: message.author,
      content: message.content,
      createdAt: message.createdAt,
    }))
  },
})

export const getMessagesByIds = query({
  args: {
    projectId: v.id("projects"),
    messageIds: v.array(v.id("projectChatMessages")),
  },
  handler: async (ctx, args) => {
    await getOwnedProjectOrThrow(ctx, args.projectId)

    const uniqueIds = Array.from(new Set(args.messageIds))
    const messages = await Promise.all(
      uniqueIds.map(async (messageId) => {
        const message = await ctx.db.get(messageId)
        if (!message || message.projectId !== args.projectId) {
          return null
        }
        return {
          id: message._id,
          role: message.role,
          author: message.author,
          content: message.content,
          createdAt: message.createdAt,
        }
      }),
    )

    return messages
      .filter((message) => message !== null)
      .sort((left, right) => left.createdAt - right.createdAt)
  },
})

export const getEmbeddingsByIds = query({
  args: {
    projectId: v.id("projects"),
    embeddingIds: v.array(v.id("projectChatEmbeddings")),
  },
  handler: async (ctx, args) => {
    await getOwnedProjectOrThrow(ctx, args.projectId)

    const uniqueIds = Array.from(new Set(args.embeddingIds))
    const embeddings = await Promise.all(
      uniqueIds.map(async (embeddingId) => {
        const embedding = await ctx.db.get(embeddingId)
        if (!embedding || embedding.projectId !== args.projectId) {
          return null
        }
        return {
          id: embedding._id,
          messageId: embedding.messageId,
        }
      }),
    )

    return embeddings.filter((embedding) => embedding !== null)
  },
})

export const getProjectContext = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { project } = await getOwnedProjectOrThrow(ctx, args.projectId)

    const cards = await ctx.db
      .query("projectCards")
      .withIndex("by_projectId_and_updatedAt", (q) =>
        q.eq("projectId", args.projectId),
      )
      .order("desc")
      .take(12)

    return {
      project: {
        id: project._id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        repoUrl: project.repoUrl,
        planningStatus: project.latestPlanningStatus,
      },
      cards: cards.map((card) => ({
        cardKey: card.cardKey,
        title: card.title,
        tone: card.tone,
        agent: card.agent,
        priority: card.priority,
        tags: card.tags,
      })),
    }
  },
})

export const saveMessage = mutation({
  args: {
    projectId: v.id("projects"),
    role: chatRoleValidator,
    author: chatAuthorValidator,
    content: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await getOwnedProjectOrThrow(ctx, args.projectId)
    const content = args.content.trim()
    if (!content) {
      throw new Error("Message content is required.")
    }

    const createdAt = Date.now()
    const authorTokenIdentifier =
      args.author === "USER" ? identity.tokenIdentifier : null

    const messageId = await ctx.db.insert("projectChatMessages", {
      projectId: project._id,
      role: args.role,
      author: args.author,
      authorTokenIdentifier,
      content,
      createdAt,
    })

    await ctx.db.insert("projectChatEmbeddings", {
      projectId: project._id,
      messageId,
      content,
      embedding: args.embedding,
      createdAt,
    })

    await ctx.db.patch(project._id, {
      updatedAt: createdAt,
      lastActivityAt: createdAt,
    })

    return {
      id: messageId,
      createdAt,
    }
  },
})
