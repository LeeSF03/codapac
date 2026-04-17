import { SignInSteps } from "../_components/sign-in-steps"
import { UsernameCard } from "./_components/username-card"

export default function UsernamePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-6">
      <SignInSteps current="username" />
      <UsernameCard />
    </main>
  )
}
