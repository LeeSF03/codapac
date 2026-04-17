type SignInStep = "email" | "verify" | "username"

const steps: { key: SignInStep; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "verify", label: "Verify" },
  { key: "username", label: "Username" },
]

export function SignInSteps({ current }: { current: SignInStep }) {
  const currentIndex = steps.findIndex((step) => step.key === current)

  return (
    <div className="text-muted-foreground mb-5 hidden items-center gap-2 text-[12px] sm:inline-flex">
      {steps.map((step, index) => (
        <div key={step.key} className="contents">
          {index > 0 ? <Line /> : null}
          <Step active={index <= currentIndex}>{step.label}</Step>
        </div>
      ))}
    </div>
  )
}

function Step({
  children,
  active,
}: {
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {children}
    </span>
  )
}

function Line() {
  return <span className="bg-border h-px w-4" />
}
