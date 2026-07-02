import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const products = db.prepare("SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order").all();
  return NextResponse.json(products);
}
