import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const phone = searchParams.get("phone");

  if (!name || !phone || name.length < 2 || phone.length < 5) {
    return NextResponse.json({ error: "Name and phone number required" }, { status: 400 });
  }

  const sanitized = name.replace(/[%_]/g, "");

  const db = getDb();
  const applications = db.prepare(
    "SELECT id, full_name, position, status, created_at FROM career_applications WHERE full_name LIKE ? AND phone = ? ORDER BY created_at DESC"
  ).all(`%${sanitized}%`, phone);

  return NextResponse.json(applications);
}
