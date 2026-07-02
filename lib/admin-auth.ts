import { getDb, decodeToken } from "./db";

export function checkAdmin(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return null;
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin") return null;
  const db = getDb();
  const user = db.prepare("SELECT id, username, role, is_active FROM admin_users WHERE id = ?").get(payload.sub) as Record<string, unknown> | undefined;
  if (!user || !user.is_active) return null;
  return { ...payload, ...user };
}

export function checkSuperAdmin(request: Request) {
  const admin = checkAdmin(request);
  if (!admin || admin.role !== "super_admin") return null;
  return admin;
}
