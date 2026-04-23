import { NextResponse } from "next/server"
import { streamText } from "ai"
import { z } from "zod"

import {
  generateChatCardDrafts,
  generateAgentRoutingDecision,
  generateProgrammerLaunchGroups,
} from "@/lib/boss/chat-actions"
import {
  buildBossChatMessages,
  type ProjectChatAgentAuthor,
} from "@/lib/boss/chat"
import { embedText } from "@/lib/boss/embeddings"
import { getGlmLanguageModel, getGlmTemperature } from "@/lib/boss/glm"
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

function formatCreatedTodosReply(
  createdTodos: Array<{ id: string; title: string; agent: string }>,
) {
  if (createdTodos.length === 0) {
    return ""
  }

  const intro =
    createdTodos.length === 1
      ? "I created 1 task and added it to the To Do column:"
      : `I created ${createdTodos.length} tasks and added them to the To Do column:`
  const list = createdTodos
    .map((todo) => `- ${todo.id}: ${todo.title}`)
    .join("\n")

  return `${intro}\n\n${list}`
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
    const createdTodos: Array<{ id: string; title: string; agent: string }> = []

    for (const cardDraft of cardDrafts) {
      const created = await fetchAuthMutation(api.projects.createIssueFromBoss, {
        projectId,
        title: cardDraft.title,
        description: cardDraft.description,
        acceptanceCriteria: cardDraft.acceptanceCriteria,
        agent: cardDraft.agent,
        priority: cardDraft.priority,
        tags: cardDraft.tags,
      })

      createdTodos.push({
        id: created.id,
        title: cardDraft.title,
        agent: cardDraft.agent,
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

    const routingDecision = await generateAgentRoutingDecision(
      userMessage,
      context,
      createdTodos,
    )
    const programmerLaunchCards = routingDecision.programmerLaunchCards
    const programmerLaunchGroups = await generateProgrammerLaunchGroups(
      userMessage,
      programmerLaunchCards,
    )
    const programmerLaunchCardKeys = programmerLaunchGroups.flat()
    const qaLaunchCards =
      programmerLaunchCardKeys.length > 0
        ? []
        : routingDecision.qaLaunchCards
    const qaLaunchCardKeys = qaLaunchCards.map((card) => card.cardKey)
    const createdTodosReply = formatCreatedTodosReply(createdTodos)

    const replyAuthor: ProjectChatAgentAuthor =
      createdTodos.length > 0
        ? "BOSS"
        : qaLaunchCardKeys.length > 0
          ? "QA"
          : routingDecision.replyAuthor

    const messages = buildBossChatMessages(
      {
        ...context,
        createdTodos,
        launchingTodos: programmerLaunchCards.map((card) => ({
          id: card.cardKey,
          title: card.title,
        })),
        qaTodos: qaLaunchCards.map((card) => ({
          id: card.cardKey,
          title: card.title,
        })),
      },
      replyAuthor,
    )

    if (createdTodosReply) {
      await fetchAuthMutation(api.projectChat.saveMessage, {
        projectId,
        role: "assistant",
        author: "BOSS",
        content: createdTodosReply,
        embedding: embedText(createdTodosReply),
      })

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(createdTodosReply))
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-codapac-chat-author": "BOSS",
          "x-codapac-launch-card-groups": encodeURIComponent(
            JSON.stringify(programmerLaunchGroups),
          ),
          "x-codapac-launch-card-keys": programmerLaunchCardKeys.join(","),
          "x-codapac-qa-card-keys": qaLaunchCardKeys.join(","),
        },
      })
    }

    const result = streamText({
      model: getGlmLanguageModel(),
      temperature: getGlmTemperature(),
      maxOutputTokens: 1_000,
      messages,
      onFinish: async ({ text }) => {
        const reply = text.trim()
        if (!reply) return

        await fetchAuthMutation(api.projectChat.saveMessage, {
          projectId,
          role: "assistant",
          author: replyAuthor,
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

    return result.toTextStreamResponse({
      headers: {
        "x-codapac-chat-author": replyAuthor,
        "x-codapac-launch-card-groups": encodeURIComponent(
          JSON.stringify(programmerLaunchGroups),
        ),
        "x-codapac-launch-card-keys": programmerLaunchCardKeys.join(","),
        "x-codapac-qa-card-keys": qaLaunchCardKeys.join(","),
      },
    })
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
