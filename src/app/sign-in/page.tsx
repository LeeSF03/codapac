import { SignInCard } from "./_components/sign-in-card"
import { SignInPreview } from "./_components/sign-in-preview"

export default function SignInPage() {
  return (
    <main className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 items-center gap-8 overflow-hidden px-6 py-6 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
      <SignInPreview />

      <section className="flex h-full items-center justify-center overflow-hidden">
        <SignInCard />
      </section>
    </main>
  )
}
