import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "orquestra_session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "signin_required");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/central-admin/:path*", "/portal/:path*"],
};
