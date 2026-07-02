import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { checkAdmin } from "@/lib/admin-auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const { status, admin_notes, notes } = body;
  const reason = admin_notes || notes || "";

  const validStatuses = ["pending", "preparing", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();
  if (reason) {
    db.prepare("UPDATE orders SET status = ?, notes = ? WHERE id = ?").run(status, reason, id);
  } else {
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  }

  const statusLabel = status === "pending" ? "Pending" : status === "preparing" ? "Packing" : status === "delivered" ? "Delivered" : "Cancelled";
  logActivity(admin.id as number, admin.username as string, `Order #${id} → ${statusLabel}`, "order", Number(id), reason);

  return NextResponse.json({ ok: true });
}
