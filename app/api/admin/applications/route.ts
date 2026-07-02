import { NextResponse } from "next/server";
import { getDb, decodeToken } from "@/lib/db";

function checkAdmin(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return null;
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin") return null;
  const db = getDb();
  const user = db.prepare("SELECT id, username, role, is_active FROM admin_users WHERE id = ?").get(payload.sub) as Record<string, unknown> | undefined;
  if (!user || !user.is_active) return null;
  return { ...payload, ...user };
}

const FRANCHISE_SAFE_COLS = "id, full_name, email, phone, business_experience, preferred_location, investment_capability, message, aadhaar, pan, bank_statement, id_proof, address_proof, other_docs, tc_accepted, tc_language, status, tier, city, admin_notes, login_id, payment_status, created_at, updated_at";

export async function GET(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  return NextResponse.json({
    franchise: db.prepare(`SELECT ${FRANCHISE_SAFE_COLS} FROM franchise_applications ORDER BY created_at DESC`).all(),
    careers: db.prepare("SELECT * FROM career_applications ORDER BY created_at DESC").all(),
    contacts: db.prepare("SELECT * FROM contact_messages ORDER BY created_at DESC").all(),
  });
}
