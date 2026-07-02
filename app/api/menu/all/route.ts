import { NextResponse } from "next/server";
import { getDb, decodeToken } from "@/lib/db";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const items = db.prepare("SELECT * FROM menu_items ORDER BY sort_order").all();
  return NextResponse.json(items);
}
