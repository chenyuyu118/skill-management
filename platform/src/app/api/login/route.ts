import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken, sha256 } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };
  const expected = await expectedToken();
  if (!expected) return NextResponse.json({ error: "认证未启用" }, { status: 400 });
  if (!password || (await sha256(password)) !== expected) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
