import { NextResponse } from "next/server";
import { getDb, verifyPassword, createToken } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username) as Record<string, unknown> | undefined;
  if (!user || !verifyPassword(password, user.password_hash as string)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (!user.is_active) {
    return NextResponse.json({ error: "Account disabled" }, { status: 403 });
  }

  const token = createToken({ sub: user.id, type: "admin", role: user.role });
  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ ok: true, role: user.role, username: user.username });
  response.headers.set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isProd ? "; Secure" : ""}`);
  return response;
}
