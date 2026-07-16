import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth";

// Everything is behind the passcode gate except the login screen, the auth
// endpoint, and static assets needed to render the login screen and the PWA
// shell (manifest, icons).

const PUBLIC_PATHS = new Set(["/login", "/api/auth", "/manifest.webmanifest"]);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const passcode = process.env.PASSCODE;
  if (!passcode) {
    return new NextResponse("PASSCODE is not configured", { status: 500 });
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionValue(cookie, passcode)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
