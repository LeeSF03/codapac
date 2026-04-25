import { v } from "convex/values"

import { api } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { action } from "./_generated/server"

type ContextMessage = {
  id: Id<"projectChatMessages">
  role: "user" | "assistant" | "system"
  author: "USER" | "BOSS" | "PROGRAMMER" | "QA" | "SYSTEM"
  content: string
  createdAt: number
}

type ProjectContext = {
  project: {
    id: Id<"projects">
    name: string
    slug: string
    description: string
    repoUrl: string | null
    planningStatus: string
  }
  cards: Array<{
    cardKey: string
    title: string
    tone: string
    agent: string
    priority: string
    tags: string[]
  }>
}

type EmbeddingLookup = {
  id: Id<"projectChatEmbeddings">
  messageId: Id<"projectChatMessages">
}

export const buildReplyContext = action({
  args: {
    projectId: v.id("projects"),
    embedding: v.array(v.number()),
    recentLimit: v.number(),
    semanticLimit: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    project: ProjectContext["project"]
    cards: ProjectContext["cards"]
    messages: ContextMessage[]
  }> => {
    const projectContext: ProjectContext = await ctx.runQuery(
      api.projectChat.getProjectContext,
      {
        projectId: args.projectId,
      },
    )

    const recentMessages: ContextMessage[] = await ctx.runQuery(
      api.projectChat.listRecentForContext,
      {
        projectId: args.projectId,
        limit: Math.max(1, Math.min(args.recentLimit, 24)),
      },
    )

    const semanticResults = await ctx.vectorSearch(
      "projectChatEmbeddings",
      "by_embedding",
      {
        vector: args.embedding,
        limit: Math.max(1, Math.min(args.semanticLimit, 12)),
        filter: (q) => q.eq("projectId", args.projectId),
      },
    )

    const embeddingDocs: EmbeddingLookup[] = semanticResults.length
      ? await ctx.runQuery(api.projectChat.getEmbeddingsByIds, {
          projectId: args.projectId,
          embeddingIds: semanticResults.map((result) => result._id),
        })
      : []

    const semanticMessages: ContextMessage[] = embeddingDocs.length
      ? await ctx.runQuery(api.projectChat.getMessagesByIds, {
          projectId: args.projectId,
          messageIds: embeddingDocs.map(
            (embedding: EmbeddingLookup) => embedding.messageId,
          ),
        })
      : []

    const deduped = new Map<string, ContextMessage>()

    for (const message of [...semanticMessages, ...recentMessages]) {
      deduped.set(message.id, message)
    }

    const messages = Array.from(deduped.values()).sort(
      (left, right) => left.createdAt - right.createdAt,
    )

    return {
      project: projectContext.project,
      cards: projectContext.cards,
      messages,
    }
  },
})
