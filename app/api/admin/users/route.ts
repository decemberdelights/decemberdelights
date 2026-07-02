import { NextResponse } from "next/server";
import { getDb, decodeToken, hashPassword } from "@/lib/db";

function checkSuperAdmin(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return null;
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin" || payload.role !== "super_admin") return null;
  return payload;
}

export async function GET(request: Request) {
  if (!checkSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const db = getDb();
  const users = db.prepare("SELECT id, username, role, is_active, created_at FROM admin_users ORDER BY created_at").all();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  if (!checkSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await request.json();
  const { username, password, role } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }
  if (!["admin", "super_admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const db = getDb();

  if (role === "admin") {
    const adminCount = (db.prepare("SELECT COUNT(*) as c FROM admin_users WHERE role = 'admin'").get() as { c: number }).c;
    if (adminCount >= 3) {
      return NextResponse.json({ error: "Maximum 3 normal admins allowed (4 total including super admin)" }, { status: 400 });
    }
  }
  const existing = db.prepare("SELECT id FROM admin_users WHERE username = ?").get(username);
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 400 });
  }

  const result = db.prepare("INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)").run(username, hashPassword(password), role);
  return NextResponse.json({ id: result.lastInsertRowid, username, role });
}
