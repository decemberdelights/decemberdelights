import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  let orders;
  if (status) {
    orders = db.prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC").all(status);
  } else {
    orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  }
  return NextResponse.json(orders);
}
