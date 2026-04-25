import { AuthHeader } from "./_components/auth-header"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <AuthHeader />
      {children}
    </div>
  )
}
