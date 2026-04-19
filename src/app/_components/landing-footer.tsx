import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="border-border border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-6 py-8 text-[12.5px] sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold">
            C
          </div>
          <span className="text-foreground font-semibold tracking-tight">
            codapac
          </span>
          <span>
            — a calm little crew for the stuff that&apos;s been bugging you.
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Board
          </Link>
          <Link
            href="/mock/agents"
            className="hover:text-foreground transition-colors"
          >
            Team
          </Link>
          <Link href="/sign-in" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  )
}
