import { NextResponse } from "next/server";
import { getDb, decodeToken } from "@/lib/db";

function checkAdmin(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return null;
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin") return null;
  return payload;
}

function checkSuperAdmin(request: Request) {
  const admin = checkAdmin(request);
  if (!admin || admin.role !== "super_admin") return null;
  return admin;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const { name, description, price, original_price, category, image_url, stock, is_active, offer, sort_order } = body;

  const db = getDb();
  db.prepare(
    "UPDATE products SET name=?, description=?, price=?, original_price=?, category=?, image_url=?, stock=?, is_active=?, offer=?, sort_order=? WHERE id=?"
  ).run(name || "", description || "", price || 0, original_price || 0, category || "", image_url || "", stock || 0, is_active !== false ? 1 : 0, offer || "", sort_order || 0, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkSuperAdmin(request)) return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM products WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
