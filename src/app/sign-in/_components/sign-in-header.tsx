import Link from "next/link"

export function SignInHeader() {
  return (
    <header className="shrink-0 bg-neutral-950 text-white">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground grid h-7 w-7 place-items-center rounded-md text-[13px] font-bold">
            C
          </div>
          <span className="text-[15px] font-bold tracking-tight">codapac</span>
        </Link>
      </div>
    </header>
  )
}
