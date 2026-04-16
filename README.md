# TNG Finhack

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). It uses [Convex](https://convex.dev) as a backend and [Better Auth](https://www.better-auth.com/) for authentication.

## Prerequisites

- [Bun](https://bun.sh) installed.
- A Convex account and project.

## Getting Started

### 1. Installation

Install the dependencies:

```bash
bun install
```

### 2. Start Development & Initialize Convex

Run the development server. The first time you run this, the Convex CLI will guide you through connecting to a project (or creating a new one). It will automatically generate your `.env.local` file with the necessary deployment variables and start the Next.js frontend and Convex backend in parallel.

```bash
bun run dev
```

### 3. Set Better Auth Environment Variables

After initializing your Convex project, you must set the required environment variables in your Convex deployment for Better Auth to function correctly:

```bash
# Set the site URL (e.g., http://localhost:3000 for local development)
npx convex env set SITE_URL http://localhost:3000
# or
bun x convex env set SITE_URL http://localhost:3000

# Generate a Better Auth secret
npx auth secret
# or
bun x auth secret

npx convex env set BETTER_AUTH_SECRET <BETTER_AUTH_SECRET_YOU_GENERATED>
# or
bun x convex env set BETTER_AUTH_SECRET <BETTER_AUTH_SECRET_YOU_GENERATED>

# Add this environment variable to your .env.local file
NEXT_PUBLIC_SITE_URL=http://localhost:3000

```
