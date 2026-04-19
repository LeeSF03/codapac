import { SiteHeader } from "@/components/site-header"

import { AmbientBackdrop } from "./ambient-backdrop"
import { BoardPreviewSection } from "./board-preview-section"
import { FinalCtaSection } from "./final-cta-section"
import { HeroSection } from "./hero-section"
import { HowItWorksSection } from "./how-it-works-section"
import { LandingFooter } from "./landing-footer"
import { MeetTheTeamSection } from "./meet-the-team-section"
import { StatsSection } from "./stats-section"

export function LandingPage() {
  return (
    <div className="bg-background min-h-dvh">
      <div className="sticky top-0 z-20">
        <SiteHeader />
      </div>

      <main className="relative">
        <AmbientBackdrop />
        <HeroSection />
        <HowItWorksSection />
        <MeetTheTeamSection />
        <BoardPreviewSection />
        <StatsSection />
        <FinalCtaSection />
        <LandingFooter />
      </main>
    </div>
  )
}
