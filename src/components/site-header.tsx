"use client"
import { CodapacLogo } from "@/components/codapac-logo"

export function SiteHeader() {
  return (
    <header className="border-border/60 bg-background/80 text-foreground supports-[backdrop-filter]:bg-background/60 shrink-0 border-b backdrop-blur-xl transition-colors duration-200">
      <div className="flex w-full items-center gap-4 px-6 py-4">
        <CodapacLogo href="/" />
      </div>

      <div className="flex shrink-0 items-center gap-3 transition-all duration-300 ease-out"></div>
    </header>
  )
}
