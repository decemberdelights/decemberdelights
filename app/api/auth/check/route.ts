import { NextResponse } from "next/server";
import { getDb, decodeToken } from "@/lib/db";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return NextResponse.json({ authenticated: false });
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin") return NextResponse.json({ authenticated: false });
  const db = getDb();
  const user = db.prepare("SELECT id, username, role, is_active FROM admin_users WHERE id = ?").get(payload.sub) as Record<string, unknown> | undefined;
  if (!user || !user.is_active) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, role: user.role, username: user.username });
}
