import { NextResponse } from "next/server";
import { getDb, decodeToken } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

function checkAdmin(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return null;
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin") return null;
  return payload;
}

const ALLOWED_DOC_KEYS = ["aadhaar", "pan", "bank_statement", "id_proof", "address_proof", "other_docs"];

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appId } = await params;
  const body = await request.json();
  const { doc_key } = body;

  if (!ALLOWED_DOC_KEYS.includes(doc_key)) {
    return NextResponse.json({ error: "Invalid document key" }, { status: 400 });
  }

  const db = getDb();
  const app = db.prepare(`SELECT ${doc_key} FROM franchise_applications WHERE id = ?`).get(appId) as { [key: string]: string } | undefined;

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const docPath = app[doc_key];
  if (!docPath) return NextResponse.json({ error: "No document to delete" }, { status: 404 });

  // Delete the file from disk
  try {
    const fullPath = path.join(process.cwd(), "backend", docPath);
    await unlink(fullPath);
  } catch {
    // File might not exist, continue to clear the DB reference
  }

  // Clear the reference in the database
  db.prepare(`UPDATE franchise_applications SET ${doc_key} = '' WHERE id = ?`).run(appId);

  return NextResponse.json({ ok: true });
}
