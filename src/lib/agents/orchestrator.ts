"server-only"

import { fetchAuthQuery } from "@/lib/auth-server"
import { launchProgrammerExecution } from "@/lib/agents/programmer-launch"
import { launchQaExecution } from "@/lib/agents/qa-launch"

import { api } from "~/convex/_generated/api"
import type { Id } from "~/convex/_generated/dataModel"

export type ProjectLoopTrigger =
  | "chat_continue"
  | "manual_start"
  | "manual_advance"
  | "programmer_finished"
  | "qa_finished"
  | "qa_failed"

type NextWorkSummary = {
  programmer: Array<{ cardKey: string }>
  qaTodo: Array<{ cardKey: string }>
  qaReview: Array<{ cardKey: string }>
}

type ActiveJobsSummary = {
  programmer: Array<{ cardKey: string }>
  qa: Array<{ cardKey: string }>
}

type CardStateSummary = {
  card: {
    cardKey: string
    agent: "ENG" | "QA" | "PM"
    tone: "todo" | "progress" | "done" | "merged"
  }
  programmerJobs: unknown[]
  qaJobs: unknown[]
}

type WorkflowStep =
  | { kind: "programmer"; cardKeys: string[]; reason: string }
  | { kind: "qa"; cardKeys: string[]; reason: string }

function hasActiveJobs(activeJobs: ActiveJobsSummary) {
  return activeJobs.programmer.length > 0 || activeJobs.qa.length > 0
}

async function loadCardStates(
  projectId: Id<"projects">,
  cardKeys: string[],
) {
  const states = await Promise.all(
    cardKeys.map((cardKey) =>
      fetchAuthQuery(api.projects.getCardState, {
        projectId,
        cardKey,
      }),
    ),
  )

  return states.flatMap((state) => (state ? [state as CardStateSummary] : []))
}

async function choosePreferredStep(
  projectId: Id<"projects">,
  preferredCardKeys: string[] | undefined,
): Promise<WorkflowStep | null> {
  if (!preferredCardKeys || preferredCardKeys.length === 0) {
    return null
  }

  const states = await loadCardStates(projectId, preferredCardKeys)
  if (states.length === 0) {
    return null
  }

  const allProgrammerRunnable = states.every(
    (state) =>
      state.card.agent === "ENG" &&
      (state.card.tone === "todo" || state.card.tone === "progress"),
  )
  if (allProgrammerRunnable) {
    return {
      kind: "programmer",
      cardKeys: states.map((state) => state.card.cardKey),
      reason: "preferred_programmer_cards",
    }
  }

  const allExplicitQaRunnable = states.every(
    (state) =>
      state.card.agent === "QA" &&
      (state.card.tone === "todo" || state.card.tone === "progress"),
  )
  if (allExplicitQaRunnable) {
    return {
      kind: "qa",
      cardKeys: states.map((state) => state.card.cardKey),
      reason: "preferred_qa_cards",
    }
  }

  const allReviewReady = states.every((state) => state.card.tone === "done")
  if (allReviewReady) {
    return {
      kind: "qa",
      cardKeys: states.map((state) => state.card.cardKey),
      reason: "preferred_review_cards",
    }
  }

  return null
}

function chooseNextWorkStep(nextWork: NextWorkSummary): WorkflowStep | null {
  const nextProgrammerCard = nextWork.programmer[0]
  if (nextProgrammerCard) {
    return {
      kind: "programmer",
      cardKeys: [nextProgrammerCard.cardKey],
      reason: "next_programmer_todo",
    }
  }

  const nextQaTodoCard = nextWork.qaTodo[0]
  if (nextQaTodoCard) {
    return {
      kind: "qa",
      cardKeys: [nextQaTodoCard.cardKey],
      reason: "next_qa_todo",
    }
  }

  const nextQaReviewCard = nextWork.qaReview[0]
  if (nextQaReviewCard) {
    return {
      kind: "qa",
      cardKeys: [nextQaReviewCard.cardKey],
      reason: "next_review_ready_card",
    }
  }

  return null
}

export async function runProjectLoop(input: {
  projectId: Id<"projects">
  trigger: ProjectLoopTrigger
  preferredCardKeys?: string[]
  maxSteps?: number
}) {
  const maxSteps = Math.max(1, Math.min(input.maxSteps ?? 1, 8))
  const history: Array<{
    step: number
    kind: "programmer" | "qa"
    cardKeys: string[]
    reason: string
    status: string
  }> = []

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
    void input.trigger
    const activeJobs = await fetchAuthQuery(api.projects.getActiveJobs, {
      projectId: input.projectId,
    })

    if (hasActiveJobs(activeJobs)) {
      return {
        status: history.length > 0 ? "busy_after_progress" : "busy",
        history,
      }
    }

    const preferredStep =
      stepIndex === 0
        ? await choosePreferredStep(input.projectId, input.preferredCardKeys)
        : null

    const nextWork = await fetchAuthQuery(api.projects.getNextWork, {
      projectId: input.projectId,
    })
    const selectedStep = preferredStep ?? chooseNextWorkStep(nextWork)

    if (!selectedStep) {
      return {
        status: history.length > 0 ? "completed" : "idle",
        history,
      }
    }

    if (selectedStep.kind === "programmer") {
      const result = await launchProgrammerExecution({
        projectId: input.projectId,
        cardKeys: selectedStep.cardKeys,
      })

      history.push({
        step: stepIndex + 1,
        kind: "programmer",
        cardKeys: selectedStep.cardKeys,
        reason: selectedStep.reason,
        status: result.status,
      })

      if (result.status !== "completed") {
        return {
          status: result.status,
          history,
        }
      }

      continue
    }

    const result = await launchQaExecution({
      projectId: input.projectId,
      cardKeys: selectedStep.cardKeys,
    })

    history.push({
      step: stepIndex + 1,
      kind: "qa",
      cardKeys: selectedStep.cardKeys,
      reason: selectedStep.reason,
      status: result.status,
    })

    if (result.status === "completed" || result.status === "reassigned_to_programmer") {
      continue
    }

    return {
      status: result.status,
      history,
    }
  }

  return {
    status: "step_limit_reached",
    history,
  }
}
