import { SignInHeader } from "./_components/sign-in-header"

export default function SignInLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="bg-background flex h-dvh flex-col overflow-hidden">
      <SignInHeader />
      {children}
    </div>
  )
}
