import { Suspense } from "react"

import { SignInSteps } from "../_components/sign-in-steps"
import { VerifyCard } from "./_components/verify-card"

export default function VerifyPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-6">
      <SignInSteps current="verify" />
      <Suspense fallback={null}>
        <VerifyCard />
      </Suspense>
    </main>
  )
}
