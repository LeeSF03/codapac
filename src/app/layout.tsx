import type { Metadata } from "next"
import { IBM_Plex_Mono, Lora, Plus_Jakarta_Sans } from "next/font/google"

import { NuqsAdapter } from "nuqs/adapters/next/app"

import { getToken } from "@/lib/auth-server"
import { ConvexClientProvider } from "@/provider/ConvexClientProvider"
import { ThemeProvider } from "@/provider/ThemeProvider"

import "./globals.css"
import Script from "next/script"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
})

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["100", "200", "300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: {
    default: "CodaPac",
    template: "%s | CodaPac",
  },
  description:
    "CodaPac gives non-technical builders a familiar workspace to plan, ship, and track software delivery with AI agents.",
  icons: {
    icon: "/icon.svg",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const token = await getToken()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} h-full antialiased`}
    >
      <head>{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>
            <ConvexClientProvider initialToken={token}>
              {children}
            </ConvexClientProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  )
}
