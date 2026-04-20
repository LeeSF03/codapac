import { NextResponse } from "next/server"
import { streamText } from "ai"
import { z } from "zod"

import {
  generateChatCardDrafts,
} from "@/lib/boss/chat-actions"
import { buildBossChatMessages } from "@/lib/boss/chat"
import { embedText } from "@/lib/boss/embeddings"
import { getKimiLanguageModel, getKimiTemperature } from "@/lib/boss/kimi"
import {
  fetchAuthAction,
  fetchAuthMutation,
  getAuthUser,
} from "@/lib/auth-server"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

const requestSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().trim().min(1).max(4_000),
})

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Project chat failed."
}

export async function POST(request: Request) {
  if (!(await getAuthUser())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const body = requestSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const projectId = body.data.projectId as Id<"projects">
  const userMessage = body.data.message.trim()
  const userEmbedding = embedText(userMessage)

  await fetchAuthMutation(api.projectChat.saveMessage, {
    projectId,
    role: "user",
    author: "USER",
    content: userMessage,
    embedding: userEmbedding,
  })

  try {
    let context = await fetchAuthAction(api.projectChatActions.buildReplyContext, {
      projectId,
      embedding: userEmbedding,
      recentLimit: 14,
      semanticLimit: 8,
    })

    const cardDrafts = await generateChatCardDrafts(userMessage, context)
    const createdTodos: Array<{ id: string; title: string }> = []

    for (const cardDraft of cardDrafts) {
      const created = await fetchAuthMutation(api.projects.createIssueFromBoss, {
        projectId,
        title: cardDraft.title,
        description: cardDraft.description,
        acceptanceCriteria: cardDraft.acceptanceCriteria,
        agent: "PM",
        priority: cardDraft.priority,
        tags: cardDraft.tags,
      })

      createdTodos.push({
        id: created.id,
        title: cardDraft.title,
      })
    }

    if (createdTodos.length > 0) {
      context = await fetchAuthAction(api.projectChatActions.buildReplyContext, {
        projectId,
        embedding: userEmbedding,
        recentLimit: 14,
        semanticLimit: 8,
      })
    }

    const messages = buildBossChatMessages({
      ...context,
      createdTodos,
    })

    const result = streamText({
      model: getKimiLanguageModel(),
      temperature: getKimiTemperature(),
      maxOutputTokens: 1_000,
      messages,
      onFinish: async ({ text }) => {
        const reply = text.trim()
        if (!reply) return

        await fetchAuthMutation(api.projectChat.saveMessage, {
          projectId,
          role: "assistant",
          author: "BOSS",
          content: reply,
          embedding: embedText(reply),
        })
      },
      onError: async ({ error }) => {
        const message = errorMessage(error)
        await fetchAuthMutation(api.projectChat.saveMessage, {
          projectId,
          role: "system",
          author: "SYSTEM",
          content: `Project chat failed: ${message}`,
          embedding: embedText(message),
        })
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    const message = errorMessage(error)
    await fetchAuthMutation(api.projectChat.saveMessage, {
      projectId,
      role: "system",
      author: "SYSTEM",
      content: `Project chat failed: ${message}`,
      embedding: embedText(message),
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
