import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value
  const { pathname } = request.nextUrl

  // Already logged in → redirect from auth pages to dashboard
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Protected routes → redirect to login if no token
  if (!token && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("reason", "login_required")
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
}
