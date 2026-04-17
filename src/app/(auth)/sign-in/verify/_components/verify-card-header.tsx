import { Mail } from "lucide-react"

type VerifyCardHeaderProps = {
  maskedEmail: string
}

export function VerifyCardHeader({ maskedEmail }: VerifyCardHeaderProps) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="bg-primary/10 text-primary grid h-10 w-10 place-items-center rounded-full">
        <Mail className="h-5 w-5" aria-hidden />
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Check your inbox
        </h2>
        <p className="text-muted-foreground text-[13px]">
          We sent a 6-digit code to{" "}
          <span className="text-foreground font-medium">
            {maskedEmail || "your email"}
          </span>
        </p>
      </div>
    </div>
  )
}
