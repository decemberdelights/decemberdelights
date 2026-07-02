import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone || phone.length < 5) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }

  const db = getDb();
  const orders = db.prepare(
    "SELECT id, customer_name, customer_phone, items, total, status, created_at FROM orders WHERE customer_phone = ? ORDER BY created_at DESC"
  ).all(phone);

  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { customer_name, customer_phone, customer_address, items, total } = body;

  if (!customer_name || !customer_phone || !customer_address || !items?.length) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO orders (customer_name, customer_phone, customer_address, items, total) VALUES (?, ?, ?, ?, ?)"
  ).run(customer_name, customer_phone, customer_address, JSON.stringify(items), total);

  return NextResponse.json({ id: result.lastInsertRowid, ok: true });
}
