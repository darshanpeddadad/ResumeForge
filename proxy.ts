import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public landing page, auth pages, static assets, and Better Auth API
  if (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    // If signed-in user visits sign-in or sign-up, redirect to callback or /generate
    const sessionCookie = getSessionCookie(request);
    if (sessionCookie && (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/generate";
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
    return NextResponse.next();
  }

  // 2. Check for Better Auth session token cookie
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // For protected API endpoints, return JSON 401
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For all other pages (/cover-letter, /generate, /settings, etc.), redirect to sign-in
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
