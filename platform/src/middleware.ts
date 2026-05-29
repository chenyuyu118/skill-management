import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isAuthed } from "@/lib/auth";

// 放行登录相关路径与静态资源
const PUBLIC = ["/login", "/api/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const cookieToken = req.cookies.get(AUTH_COOKIE)?.value;
  if (await isAuthed(req, cookieToken)) return NextResponse.next();

  // API 请求返回 401，页面请求重定向到登录页
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
