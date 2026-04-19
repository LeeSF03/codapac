import { Check } from "lucide-react"

export function UsernameRule({
  ok,
  children,
}: {
  ok: boolean
  children: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`grid h-3.5 w-3.5 place-items-center rounded-full ${
          ok
            ? "bg-emerald-500/15 text-emerald-600"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {ok ? (
          <Check className="h-2.5 w-2.5" aria-hidden />
        ) : (
          <span className="h-1 w-1 rounded-full bg-current" />
        )}
      </span>
      <span className={ok ? "text-foreground/80" : undefined}>{children}</span>
    </li>
  )
}
