// 平台访问密码认证（公司内部共享密码）
export const AUTH_COOKIE = "skill_auth";

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 期望的 cookie token = sha256(密码)；未设置 APP_PASSWORD 时认证关闭
export async function expectedToken(): Promise<string | null> {
  const pw = process.env.APP_PASSWORD;
  return pw ? sha256(pw) : null;
}

// 校验请求：cookie token 或 Authorization: Bearer <密码>
export async function isAuthed(req: Request, cookieToken?: string): Promise<boolean> {
  const expected = await expectedToken();
  if (!expected) return true; // 未配置密码 = 不启用认证
  if (cookieToken && cookieToken === expected) return true;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return (await sha256(auth.slice(7))) === expected;
  }
  return false;
}

export { sha256 };
