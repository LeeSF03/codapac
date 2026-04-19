"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  AGENTS,
  AgentName,
  AgentStatusDot,
} from "@/components/agent-orb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AGENT_BY_ROLE,
  createCard,
  ROLES,
  type BoardCard,
  type Role,
} from "@/lib/mock-board"

export type NewIssueDialogInput = {
  title: string
  agent: Role
  tags: string[]
}

type Props = {
  open: boolean
  projectId?: string
  onClose: () => void
  onCreated?: (card: BoardCard) => void
  onCreateIssue?: (
    input: NewIssueDialogInput,
  ) => Promise<BoardCard | { id: string } | null | void> | BoardCard | { id: string } | null | void
}

export function NewIssueDialog({
  open,
  projectId,
  onClose,
  onCreated,
  onCreateIssue,
}: Props) {
  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [agent, setAgent] = useState<Role>("PM")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 40)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  const tags = useMemo(
    () =>
      tagsInput
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 4),
    [tagsInput],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) {
      setError("Give the issue a title.")
      return
    }

    setSubmitting(true)
    try {
      if (onCreateIssue) {
        await onCreateIssue({ title: clean, agent, tags })
        onClose()
        return
      }

      if (!projectId) {
        setError("Open a project before creating an issue.")
        return
      }

      const card = createCard(projectId, { title: clean, agent, tags })
      if (card) {
        onCreated?.(card)
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New issue"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl [animation:cp-fade-up_0.22s_ease-out]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              New issue
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Drop it on the board
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid gap-1.5">
            <Label
              htmlFor="issue-title"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Title
            </Label>
            <Input
              id="issue-title"
              ref={firstFieldRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Settings: add SSO toggle for enterprise workspaces"
              aria-invalid={!!error}
              autoComplete="off"
            />
            {error ? (
              <p className="text-[11px] text-destructive">{error}</p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Assignee
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => {
                const key = AGENT_BY_ROLE[r]
                const a = AGENTS[key]
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAgent(r)}
                    data-active={agent === r}
                    className="group flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left transition-all hover:-translate-y-px hover:border-foreground/30 data-[active=true]:-translate-y-px data-[active=true]:border-foreground data-[active=true]:shadow-sm"
                    aria-pressed={agent === r}
                  >
                    <AgentStatusDot
                      agent={key}
                      className="h-2 w-2 rounded-full"
                    />
                    <div className="min-w-0">
                      <AgentName agent={key} className="text-[13px] font-semibold">
                        {a.name}
                      </AgentName>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {r}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label
              htmlFor="issue-tags"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Tags <span className="text-muted-foreground/70">(optional, comma separated)</span>
            </Label>
            <Textarea
              id="issue-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              rows={2}
              placeholder="auth, settings"
            />
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-secondary-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create issue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
