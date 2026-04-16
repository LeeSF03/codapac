import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/webpack"],
      },
    },
  },

  reactCompiler: true,
  typedRoutes: true,
  logging: {
    browserToTerminal: true,
  },
  experimental: {
    authInterrupts: true,
    serverComponentsHmrCache: true,
  },
}

export default nextConfig
