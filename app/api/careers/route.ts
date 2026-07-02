import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const formData = await request.formData();
  const db = getDb();

  let resumeUrl = "";
  const resume = formData.get("resume") as File | null;
  if (resume && resume.name) {
    const ext = path.extname(resume.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: `File type ${ext} not allowed` }, { status: 400 });
    }
    if (resume.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }
    const filename = `${crypto.randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "backend", "uploads", "careers");
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await resume.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    resumeUrl = `/uploads/careers/${filename}`;
  }

  db.prepare(
    "INSERT INTO career_applications (full_name, email, phone, position, message, resume_url) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    String(formData.get("full_name") || "").slice(0, 200),
    String(formData.get("email") || "").slice(0, 200),
    String(formData.get("phone") || "").slice(0, 20),
    String(formData.get("position") || "").slice(0, 200),
    String(formData.get("message") || "").slice(0, 2000),
    resumeUrl,
  );

  return NextResponse.json({ ok: true });
}
