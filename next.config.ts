import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/webpack"],
      },
    },
  },

  // Allow ngrok and any external host for mobile testing
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],

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
