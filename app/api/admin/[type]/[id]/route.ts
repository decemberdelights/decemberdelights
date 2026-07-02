import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { checkAdmin, checkSuperAdmin } from "@/lib/admin-auth";

const TABLE_MAP: Record<string, string> = {
  franchise: "franchise_applications",
  careers: "career_applications",
  contacts: "contact_messages",
};

const TYPE_LABELS: Record<string, string> = {
  franchise: "Franchise",
  careers: "Career",
  contacts: "Contact",
};

const VALID_STATUSES = ["pending", "submitted", "approved", "rejected", "under_process"];

export async function PUT(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const admin = checkAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { type, id } = await params;
  const table = TABLE_MAP[type];
  if (!table) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const body = await request.json();
  const status = body.status;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`UPDATE ${table} SET status=?, admin_notes=? WHERE id=?`).run(status, String(body.admin_notes || "").slice(0, 2000), id);

  const label = TYPE_LABELS[type] || type;
  logActivity(admin.id as number, admin.username as string, `${label} #${id} → ${status}`, type, Number(id), String(body.admin_notes || "").slice(0, 200));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const admin = checkSuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  const { type, id } = await params;
  const table = TABLE_MAP[type];
  if (!table) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  let reason = "";
  try {
    const body = await request.json();
    reason = body.reason || "";
  } catch { /* no body */ }

  const db = getDb();
  db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);

  const label = TYPE_LABELS[type] || type;
  logActivity(admin.id as number, admin.username as string, `Deleted ${label} #${id}`, type, Number(id), reason ? `Reason: ${reason}` : "");

  return NextResponse.json({ ok: true });
}
