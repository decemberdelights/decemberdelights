import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkSuperAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  if (!checkSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 500);
  const offset = Number(url.searchParams.get("offset") || "0");
  const logs = db.prepare("SELECT * FROM activity_logs ORDER BY id DESC LIMIT ? OFFSET ?").all(limit, offset);
  const total = (db.prepare("SELECT COUNT(*) as c FROM activity_logs").get() as any).c;
  return NextResponse.json({ logs, total });
}
