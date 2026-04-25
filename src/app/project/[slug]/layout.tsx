import type { Metadata } from "next"

import { fetchAuthQuery } from "@/lib/auth-server"

import { api } from "~/convex/_generated/api"

type ProjectDetailLayoutProps = Readonly<{
  children: React.ReactNode
}>

type ProjectMetadataProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: ProjectMetadataProps): Promise<Metadata> {
  const { slug } = await params
  const project = await fetchAuthQuery(api.projects.getBySlug, { slug }).catch(
    () => undefined
  )

  if (project === null) {
    return {
      title: "Project not found",
    }
  }

  if (project) {
    return {
      title: project.name,
    }
  }

  return {
    title: "Project",
  }
}

export default function ProjectDetailLayout({
  children,
}: ProjectDetailLayoutProps) {
  return children
}
