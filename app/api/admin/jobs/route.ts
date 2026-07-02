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

export async function GET() {
  const db = getDb();
  const jobs = db.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { title, department, location, description, requirements, salary_range, job_type, is_active, sort_order } = body;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO jobs (title, department, location, description, requirements, salary_range, job_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(title, department || "", location || "", description || "", requirements || "", salary_range || "", job_type || "full-time", is_active !== false ? 1 : 0);

  return NextResponse.json({ id: result.lastInsertRowid, ok: true });
}

export async function PUT(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  const body = await request.json();
  const { title, department, location, description, requirements, salary_range, job_type, is_active } = body;

  const db = getDb();
  db.prepare(
    "UPDATE jobs SET title=?, department=?, location=?, description=?, requirements=?, salary_range=?, job_type=?, is_active=? WHERE id=?"
  ).run(title || "", department || "", location || "", description || "", requirements || "", salary_range || "", job_type || "full-time", is_active !== false ? 1 : 0, id);
  return NextResponse.json({ ok: true });
}
