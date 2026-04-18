import { NextRequest, NextResponse } from "next/server"

import { isAuthenticated } from "@/lib/auth-server"

export async function proxy(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard"], // Specify the routes the middleware applies to
}
