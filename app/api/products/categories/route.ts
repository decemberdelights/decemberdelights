import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const cats = db.prepare("SELECT DISTINCT category FROM products WHERE is_active = 1 AND category != ''").all() as { category: string }[];
  return NextResponse.json(cats.map((c) => c.category));
}
