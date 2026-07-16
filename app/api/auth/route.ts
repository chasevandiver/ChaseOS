import { NextRequest, NextResponse } from "next/server";
import { createSessionValue, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const passcode = process.env.PASSCODE;
  if (!passcode) {
    return NextResponse.json({ error: "PASSCODE is not configured" }, { status: 500 });
  }

  let submitted = "";
  try {
    const body = await request.json();
    submitted = String(body?.passcode ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (submitted !== passcode) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionValue(passcode),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
  return response;
}
