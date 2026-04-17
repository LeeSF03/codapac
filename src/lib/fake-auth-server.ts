import "server-only"

import { cookies } from "next/headers"

export async function hasFakeSession() {
  const jar = await cookies()
  return jar.get("cp_fake")?.value === "1"
}
