import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const items = db.prepare("SELECT * FROM menu_items WHERE is_active = 1 ORDER BY sort_order").all();
  const result: Record<string, unknown[]> = {};
  for (const item of items as Record<string, unknown>[]) {
    const cat = item.category as string;
    if (!result[cat]) result[cat] = [];
    result[cat].push(item);
  }
  return NextResponse.json(result);
}
