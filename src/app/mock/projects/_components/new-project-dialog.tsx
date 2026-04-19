"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  PROJECT_COLORS,
  PROJECT_EMOJIS,
  type NewProjectInput,
  type Project,
  type ProjectColor,
  type ProjectVisibility,
  slugify,
  useCreateProject,
} from "@/lib/mock-projects"

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: (project: Pick<Project, "id" | "slug">) => void
  onCreateProject?: (
    input: NewProjectInput,
  ) => Promise<Pick<Project, "id" | "slug">> | Pick<Project, "id" | "slug">
}

type FieldErrors = Partial<Record<"name" | "slug", string>>

export function NewProjectDialog({
  open,
  onClose,
  onCreated,
  onCreateProject,
}: Props) {
  const createProject = useCreateProject()
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugDirty, setSlugDirty] = useState(false)
  const [description, setDescription] = useState("")
  const [emoji, setEmoji] = useState<string>(PROJECT_EMOJIS[0])
  const [color, setColor] = useState<ProjectColor>("sky")
  const [visibility, setVisibility] = useState<ProjectVisibility>("private")
  const [repoUrl, setRepoUrl] = useState("")
  const [kickoffPrompt, setKickoffPrompt] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName("")
    setSlug("")
    setSlugDirty(false)
    setDescription("")
    setEmoji(PROJECT_EMOJIS[Math.floor(Math.random() * PROJECT_EMOJIS.length)])
    setColor(
      PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)].key,
    )
    setVisibility("private")
    setRepoUrl("")
    setKickoffPrompt("")
    setErrors({})
    setSubmitting(false)
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const derivedSlug = useMemo(
    () => (slugDirty ? slug : slugify(name)),
    [name, slug, slugDirty],
  )

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (!name.trim()) next.name = "Give your project a name."
    if (!derivedSlug.trim()) next.slug = "Slug can't be empty."
    return next
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setSubmitting(true)
    const input: NewProjectInput = {
      name: name.trim(),
      slug: derivedSlug,
      description: description.trim(),
      emoji,
      color,
      visibility,
      repoUrl: repoUrl.trim() || undefined,
      kickoffPrompt: kickoffPrompt.trim() || undefined,
    }
    try {
      const project = onCreateProject
        ? await onCreateProject(input)
        : createProject(input)
      onCreated?.(project)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create a new project"
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
              New project
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Spin up a fresh board
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
          <div className="flex items-center gap-3">
            <div
              className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-background text-2xl"
              aria-hidden
            >
              {emoji}
            </div>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="project-name" className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Name
              </Label>
              <Input
                id="project-name"
                ref={firstFieldRef}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
                }}
                placeholder="acme/marketing"
                aria-invalid={!!errors.name}
                autoComplete="off"
              />
              {errors.name ? (
                <p className="text-[11px] text-destructive">{errors.name}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label htmlFor="project-slug" className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Slug
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">codapac/</span>
              <Input
                id="project-slug"
                value={derivedSlug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value))
                  setSlugDirty(true)
                  if (errors.slug) setErrors((p) => ({ ...p, slug: undefined }))
                }}
                placeholder="my-project"
                aria-invalid={!!errors.slug}
                className="font-mono"
              />
            </div>
            {errors.slug ? (
              <p className="text-[11px] text-destructive">{errors.slug}</p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label htmlFor="project-description" className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Description <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project for?"
              rows={3}
            />
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Icon
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_EMOJIS.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => setEmoji(candidate)}
                  data-active={emoji === candidate}
                  className="grid size-9 place-items-center rounded-lg border border-border bg-background text-lg transition-all hover:-translate-y-px hover:border-foreground/30 data-[active=true]:-translate-y-px data-[active=true]:border-foreground data-[active=true]:shadow-sm"
                  aria-pressed={emoji === candidate}
                  aria-label={`Pick ${candidate}`}
                >
                  {candidate}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Accent
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_COLORS.map((candidate) => (
                <button
                  key={candidate.key}
                  type="button"
                  onClick={() => setColor(candidate.key)}
                  data-active={color === candidate.key}
                  className="group flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:-translate-y-px hover:border-foreground/30 hover:text-foreground data-[active=true]:-translate-y-px data-[active=true]:border-foreground data-[active=true]:text-foreground"
                  aria-pressed={color === candidate.key}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${candidate.dot}`} />
                  {candidate.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Visibility
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    key: "private",
                    title: "Private",
                    hint: "Only invited teammates.",
                  },
                  {
                    key: "public",
                    title: "Public",
                    hint: "Anyone with the link.",
                  },
                ] as { key: ProjectVisibility; title: string; hint: string }[]
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setVisibility(option.key)}
                  data-active={visibility === option.key}
                  className="flex flex-col items-start gap-0.5 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-all hover:-translate-y-px hover:border-foreground/30 data-[active=true]:-translate-y-px data-[active=true]:border-foreground data-[active=true]:shadow-sm"
                >
                  <span className="text-[13px] font-semibold">{option.title}</span>
                  <span className="text-[11px] text-muted-foreground">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label htmlFor="project-kickoff" className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Kickoff prompt <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <Textarea
              id="project-kickoff"
              value={kickoffPrompt}
              onChange={(e) => setKickoffPrompt(e.target.value)}
              placeholder="Build a fintech onboarding app for Malaysian SMEs with KYC, team approvals, and a responsive admin dashboard."
              rows={4}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              When provided, this brief can be handed to BOSS later to turn into the initial todo backlog.
            </p>
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label htmlFor="project-repo" className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Repository URL <span className="text-muted-foreground/70">(optional)</span>
            </Label>
            <Input
              id="project-repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/your-org/your-repo"
              inputMode="url"
              type="url"
              className="font-mono text-[13px]"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
