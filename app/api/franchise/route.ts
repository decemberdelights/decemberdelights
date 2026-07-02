import { NextResponse } from "next/server";
import { getDb, hashPassword } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const formData = await request.formData();
  const db = getDb();

  const password = formData.get("password") as string;
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const saveFile = async (file: File | null): Promise<string> => {
    if (!file || !file.name) return "";
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`File type ${ext} not allowed`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File too large (max 10MB)");
    }
    const filename = `${crypto.randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "backend", "uploads", "franchise");
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    return `/uploads/franchise/${filename}`;
  };

  const phone = formData.get("phone") as string;
  const existing = db.prepare("SELECT id FROM franchise_applications WHERE phone = ?").get(phone);
  if (existing) {
    return NextResponse.json({ error: "Application already exists with this phone number" }, { status: 400 });
  }

  try {
    const result = db.prepare(
      `INSERT INTO franchise_applications (full_name, email, phone, password_hash, business_experience, preferred_location, investment_capability, message, tc_accepted, tc_language, aadhaar, pan, bank_statement, id_proof, address_proof, other_docs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      String(formData.get("full_name") || "").slice(0, 200),
      String(formData.get("email") || "").slice(0, 200),
      phone.slice(0, 20),
      hashPassword(password),
      String(formData.get("business_experience") || "").slice(0, 2000),
      String(formData.get("preferred_location") || "").slice(0, 200),
      String(formData.get("investment_capability") || "").slice(0, 200),
      String(formData.get("message") || "").slice(0, 2000),
      formData.get("tc_accepted") === "true" ? 1 : 0,
      String(formData.get("tc_language") || "en").slice(0, 10),
      await saveFile(formData.get("aadhaar") as File | null),
      await saveFile(formData.get("pan") as File | null),
      await saveFile(formData.get("bank_statement") as File | null),
      await saveFile(formData.get("id_proof") as File | null),
      await saveFile(formData.get("address_proof") as File | null),
      await saveFile(formData.get("other_docs") as File | null),
    );

    const id = result.lastInsertRowid;
    const loginId = `DD${phone.slice(-4)}${String(id).padStart(4, "0")}`;
    db.prepare("UPDATE franchise_applications SET login_id = ? WHERE id = ?").run(loginId, id);

    return NextResponse.json({ ok: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
