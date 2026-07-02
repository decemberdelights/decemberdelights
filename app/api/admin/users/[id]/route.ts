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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  const user = db.prepare("SELECT * FROM admin_users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.username && body.username !== user.username) {
    const existing = db.prepare("SELECT id FROM admin_users WHERE username = ? AND id != ?").get(body.username, id);
    if (existing) return NextResponse.json({ error: "Username already exists" }, { status: 400 });
  }

  if (body.username) db.prepare("UPDATE admin_users SET username = ? WHERE id = ?").run(body.username, id);
  if (body.password) db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(hashPassword(body.password), id);
  if (body.role && ["admin", "super_admin"].includes(body.role)) {
    if (user.role === "super_admin" && body.role !== "super_admin") {
      const count = (db.prepare("SELECT COUNT(*) as c FROM admin_users WHERE role = 'super_admin'").get() as { c: number }).c;
      if (count <= 1) return NextResponse.json({ error: "Cannot remove the last super admin" }, { status: 400 });
      const adminCount = (db.prepare("SELECT COUNT(*) as c FROM admin_users WHERE role = 'admin'").get() as { c: number }).c;
      if (adminCount >= 3) return NextResponse.json({ error: "Maximum 3 normal admins allowed. Cannot demote." }, { status: 400 });
    }
    db.prepare("UPDATE admin_users SET role = ? WHERE id = ?").run(body.role, id);
  }
  if (body.is_active !== undefined) db.prepare("UPDATE admin_users SET is_active = ? WHERE id = ?").run(body.is_active ? 1 : 0, id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const db = getDb();

  const user = db.prepare("SELECT * FROM admin_users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role === "super_admin") {
    const count = (db.prepare("SELECT COUNT(*) as c FROM admin_users WHERE role = 'super_admin'").get() as { c: number }).c;
    if (count <= 1) return NextResponse.json({ error: "Cannot delete the last super admin" }, { status: 400 });
  }

  db.prepare("DELETE FROM admin_users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
