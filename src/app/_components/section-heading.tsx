import { LandingReveal } from "./landing-reveal"

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <LandingReveal className="mx-auto max-w-2xl text-center">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.22em] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
          {description}
        </p>
      ) : null}
    </LandingReveal>
  )
}
