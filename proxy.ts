import { NextRequest, NextResponse } from "next/server";

/**
 * better-auth session cookie names.
 * The library sets one of these depending on whether the request is over HTTPS.
 */
const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthenticated = SESSION_COOKIES.some(
    (name) => !!request.cookies.get(name)?.value
  );

  // Block unauthenticated access to protected routes
  const isProtected =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/rooms") ||
    pathname.startsWith("/room/");

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect already-authenticated users away from auth pages
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/dashboard/:path*", "/rooms/:path*", "/room/:path*", "/login", "/signup"],
};
