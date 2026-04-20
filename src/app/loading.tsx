import { CodapacMark, CodapacWordmark } from "@/components/codapac-logo"

export default function RootLoading() {
  return (
    <div className="bg-background relative flex h-screen w-screen items-center justify-center overflow-hidden">
      {/* Ambient radial glows — matches hero/landing palette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.10),transparent_55%),radial-gradient(circle_at_12%_60%,rgba(14,165,233,0.07),transparent_55%),radial-gradient(circle_at_60%_95%,rgba(16,185,129,0.06),transparent_65%)]"
      />

      {/* Soft dot-grid, masked toward center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_85%)]"
      >
        <div className="text-foreground h-full w-full [background-image:radial-gradient(circle,_currentColor_1px,_transparent_1.5px)] [background-size:28px_28px] opacity-[0.06]" />
      </div>

      <div className="flex flex-col items-center gap-8">
        {/* Orbiting rings around the brand mark */}
        <div className="relative grid h-40 w-40 place-items-center">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-amber-500/25 [animation:cp-orbit_6s_linear_infinite]"
            style={{ transformOrigin: "50% 50%" }}
          >
            <span className="bg-primary absolute top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px] shadow-primary/70" />
          </span>
          <span
            aria-hidden
            className="absolute inset-3 rounded-full border border-sky-500/20 [animation:cp-orbit-reverse_9s_linear_infinite]"
            style={{ transformOrigin: "50% 50%" }}
          >
            <span className="absolute top-1/2 right-0 h-1.5 w-1.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-sky-500 shadow-[0_0_10px] shadow-sky-500/60" />
          </span>
          <span
            aria-hidden
            className="absolute inset-6 rounded-full border border-emerald-500/20 [animation:cp-orbit_12s_linear_infinite]"
            style={{ transformOrigin: "50% 50%" }}
          >
            <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500 shadow-[0_0_10px] shadow-emerald-500/60" />
          </span>

          {/* Soft breathing halo behind the mark */}
          <span
            aria-hidden
            className="bg-primary/20 absolute h-20 w-20 rounded-[22px] blur-2xl [animation:cp-breath_2.8s_ease-in-out_infinite]"
          />

          {/* Brand mark — gently floats */}
          <span className="group relative [animation:cp-float_3s_ease-in-out_infinite]">
            <CodapacMark className="h-14 w-14 rounded-[18px]" />
          </span>
        </div>

        {/* Wordmark */}
        <CodapacWordmark size="md" />

        {/* Status label */}
        <p className="text-muted-foreground font-serif text-[15px] leading-relaxed italic">
          Getting the team ready
          <span className="ml-0.5 inline-flex w-4 justify-start not-italic">
            <span className="[animation:cp-blink_1.4s_ease-in-out_infinite]">
              .
            </span>
            <span
              className="[animation:cp-blink_1.4s_ease-in-out_infinite]"
              style={{ animationDelay: "0.2s" }}
            >
              .
            </span>
            <span
              className="[animation:cp-blink_1.4s_ease-in-out_infinite]"
              style={{ animationDelay: "0.4s" }}
            >
              .
            </span>
          </span>
        </p>

        {/* Indeterminate progress rail */}
        <div className="bg-muted relative h-[3px] w-56 overflow-hidden rounded-full">
          <div className="from-primary/0 via-primary to-primary/0 absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r [animation:cp-stream_1.8s_ease-in-out_infinite]" />
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        Loading
      </span>
    </div>
  )
}
