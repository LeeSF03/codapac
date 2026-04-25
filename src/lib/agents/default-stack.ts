export const DEFAULT_APP_STACK_LABEL = "Bun + Vite + React + Tailwind CSS"

export const DEFAULT_APP_STACK_GUIDANCE = [
  `Default greenfield stack: ${DEFAULT_APP_STACK_LABEL}.`,
  "For new or nearly empty repositories, scaffold the app with Bun, Vite, React, and Tailwind CSS by default.",
  "Prefer a React + TypeScript Vite app structure unless the repository already clearly uses a different stack.",
  "If the repository already has a working app stack, preserve it instead of forcing a rewrite.",
].join(" ")
