import { NextRequest, NextResponse } from "next/server";
export const proxy = (request: NextRequest) => {
  const authenticated =
    request.cookies.has("partner_access_token") ||
    request.cookies.has("partner_refresh_token");
  if (!authenticated && request.nextUrl.pathname !== "/login")
    return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
};
export const config = {
  matcher: ["/login", "/dashboard/:path*", "/products/:path*"],
};
