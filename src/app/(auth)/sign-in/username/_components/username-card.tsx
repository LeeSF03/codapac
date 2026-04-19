import { Card } from "@/components/ui/card"

import { UsernameForm } from "./username-form"

export function UsernameCard() {
  return (
    <Card className="border-border bg-card w-full max-w-md rounded-2xl p-7 shadow-lg">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold tracking-tight">
          Pick a username
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          This is how your agents and teammates will tag you in the board and
          chat.
        </p>
      </div>

      <UsernameForm />
    </Card>
  )
}
