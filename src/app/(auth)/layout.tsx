import { AuthHeader } from "./_components/auth-header"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="bg-background flex h-dvh flex-col overflow-hidden">
      <AuthHeader />
      {children}
    </div>
  )
}
