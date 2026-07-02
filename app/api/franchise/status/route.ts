import { NextResponse } from "next/server";
import { getDb, decodeToken } from "@/lib/db";

const SAFE_FIELDS = [
  "id", "full_name", "email", "phone", "preferred_location",
  "status", "tier", "city", "admin_notes", "login_id", "payment_status",
  "tc_accepted", "created_at", "updated_at",
];

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/franchise_session=([^;]+)/);
  if (!sessionMatch) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "franchise") return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const db = getDb();
  const app = db.prepare("SELECT * FROM franchise_applications WHERE id = ?").get(payload.sub) as Record<string, unknown> | undefined;
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const safeApp = Object.fromEntries(
    Object.entries(app).filter(([key]) => SAFE_FIELDS.includes(key))
  );
  return NextResponse.json({ application: safeApp });
}
