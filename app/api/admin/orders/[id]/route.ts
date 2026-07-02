import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { checkAdmin, checkSuperAdmin } from "@/lib/admin-auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  if (body.status) {
    const validStatuses = ["pending", "preparing", "delivered", "cancelled"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.admin_notes || body.notes) {
      db.prepare("UPDATE orders SET status = ?, notes = ? WHERE id = ?").run(body.status, body.admin_notes || body.notes || "", id);
    } else {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(body.status, id);
    }
    const statusLabel = body.status === "pending" ? "Pending" : body.status === "preparing" ? "Packing" : body.status === "delivered" ? "Delivered" : "Cancelled";
    logActivity(admin.id as number, admin.username as string, `Order #${id} → ${statusLabel}`, "order", Number(id));
  }

  if (body.customer_name !== undefined) {
    db.prepare("UPDATE orders SET customer_name = ?, customer_phone = ?, customer_address = ?, items = ?, total = ?, status = ?, payment_method = ?, payment_status = ?, notes = ? WHERE id = ?")
      .run(body.customer_name, body.customer_phone, body.customer_address || "", JSON.stringify(body.items || []), body.total || 0, body.status || "pending", body.payment_method || "cash", body.payment_status || "unpaid", body.notes || "", id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = checkSuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM orders WHERE id = ?").run(id);
  logActivity(admin.id as number, admin.username as string, `Deleted Order #${id}`, "order", Number(id));
  return NextResponse.json({ ok: true });
}
