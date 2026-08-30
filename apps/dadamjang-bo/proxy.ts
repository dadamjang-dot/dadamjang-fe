import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/invite/accept", "/forgot-password"];

export const proxy = (request: NextRequest) => {
  const authenticated =
    request.cookies.has("bo_access_token") ||
    request.cookies.has("bo_refresh_token");
  const isPublic = PUBLIC_PATHS.some(
    (path) => request.nextUrl.pathname === path,
  );
  if (!authenticated && !isPublic)
    return NextResponse.redirect(new URL("/login", request.url));
  if (authenticated && isPublic && request.nextUrl.pathname === "/login")
    return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
};

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/partners/:path*",
    "/products/:path*",
    "/orders/:path*",
    "/categories/:path*",
    "/admins/:path*",
    "/audit-logs/:path*",
  ],
};
