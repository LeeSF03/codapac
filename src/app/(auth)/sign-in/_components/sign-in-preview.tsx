import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"

const boardColumns = [
  {
    title: "To Do",
    dotClassName: "bg-amber-500",
    items: ["SSO toggle", "Outlook spacing"],
  },
  {
    title: "In Progress",
    dotClassName: "bg-sky-500",
    items: ["Search reset cache"],
  },
  {
    title: "Done",
    dotClassName: "bg-emerald-500",
    items: ["Chart legend", "Skip button"],
  },
]

const previewMessages = [
  {
    name: "Priya",
    time: "11:42",
    text: "Parsed issue #128 - dropping a card on the board.",
    tint: "bg-amber-500",
  },
  {
    name: "Enzo",
    time: "11:45",
    text: "Picking it up. Branching feat/search-reset-cache.",
    tint: "bg-sky-500",
  },
  {
    name: "Quinn",
    time: "11:54",
    text: "Playwright green. Raising PR #412.",
    tint: "bg-emerald-500",
  },
]

export function SignInPreview() {
  return (
    <section className="hidden h-full min-h-0 flex-col justify-center gap-5 lg:flex">
      <div>
        <h1 className="max-w-xl text-[40px] leading-[1.05] font-semibold tracking-tight">
          Your autonomous engineering team,{" "}
          <span className="text-muted-foreground">waiting on a sign in.</span>
        </h1>
        <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
          Drop a GitHub issue and watch three agents plan, write and ship - from
          one board and one chat.
        </p>
      </div>

      <Card className="border-border bg-muted overflow-hidden rounded-3xl p-0 shadow-lg">
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-muted-foreground text-[11px] tracking-[0.2em] uppercase">
              acme/web - sprint 24
            </p>
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              live
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {boardColumns.map((column) => (
              <div
                key={column.title}
                className="border-border bg-card flex flex-col gap-2 rounded-2xl border p-2.5"
              >
                <div className="flex items-center gap-1.5 px-0.5">
                  <span
                    className={`h-2 w-2 rounded-full ${column.dotClassName}`}
                  />
                  <span className="text-[12px] font-semibold">
                    {column.title}
                  </span>
                  <span className="bg-muted text-muted-foreground ml-auto rounded-full px-1.5 text-[10px] font-semibold">
                    {column.items.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {column.items.map((item) => (
                    <div
                      key={item}
                      className="border-border bg-card rounded-lg border px-2.5 py-2 text-[12px] leading-snug font-medium shadow-xs"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-border bg-card border-t p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[13px] font-semibold">Sprint chat</span>
            <span className="text-muted-foreground text-[11px]">
              #issue-128
            </span>
          </div>

          <div className="space-y-2.5">
            {previewMessages.map((message) => (
              <div
                key={`${message.name}-${message.time}`}
                className="flex gap-2.5"
              >
                <Avatar className="h-7 w-7 shrink-0 text-[10px]">
                  <AvatarFallback
                    className={`${message.tint} font-bold text-white`}
                  >
                    {message.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="border-border bg-muted/60 flex-1 rounded-xl rounded-tl-sm border px-3 py-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12px] font-semibold">
                      {message.name}
                    </span>
                    <span className="text-muted-foreground ml-auto text-[10px]">
                      {message.time}
                    </span>
                  </div>
                  <p className="text-foreground/90 text-[12.5px] leading-snug">
                    {message.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  )
}
