import { NextResponse } from "next/server";
import { getDb, decodeToken } from "@/lib/db";

const ALLOWED_FIELDS: Record<string, string> = {
  title: "title",
  department: "department",
  location: "location",
  description: "description",
  requirements: "requirements",
  salary_range: "salary_range",
  job_type: "job_type",
  is_active: "is_active",
};

function checkAdmin(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return null;
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin") return null;
  return payload;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const db = getDb();
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (key in ALLOWED_FIELDS) {
      const col = ALLOWED_FIELDS[key];
      fields.push(`${col} = ?`);
      values.push(key === "is_active" ? (val ? 1 : 0) : val);
    }
  }
  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
