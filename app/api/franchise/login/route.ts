import { NextResponse } from "next/server";
import { getDb, verifyPassword, createToken } from "@/lib/db";

const SAFE_FIELDS = [
  "id", "full_name", "email", "phone", "preferred_location",
  "status", "tier", "city", "login_id", "payment_status",
  "tc_accepted", "created_at", "updated_at",
];

export async function POST(request: Request) {
  const body = await request.json();
  const { phone, password } = body;
  if (!phone || !password) {
    return NextResponse.json({ error: "Phone and password required" }, { status: 400 });
  }

  const db = getDb();
  const app = db.prepare("SELECT * FROM franchise_applications WHERE phone = ?").get(phone) as Record<string, unknown> | undefined;
  if (!app || !verifyPassword(password, app.password_hash as string)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createToken({ sub: app.id, type: "franchise" });
  const safeApp = Object.fromEntries(
    Object.entries(app).filter(([key]) => SAFE_FIELDS.includes(key))
  );
  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ application: safeApp });
  response.headers.set("Set-Cookie", `franchise_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isProd ? "; Secure" : ""}`);
  return response;
}
