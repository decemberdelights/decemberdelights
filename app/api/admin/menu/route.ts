import { NextResponse } from "next/server";
import { getDb, decodeToken } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

function checkAdmin(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return null;
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin") return null;
  return payload;
}

const ALLOWED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

async function saveFile(file: File): Promise<string> {
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
    throw new Error(`File type ${ext} not allowed. Use: ${ALLOWED_IMAGE_EXTS.join(", ")}`);
  }
  const filename = `${crypto.randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "backend", "uploads", "menu");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/menu/${filename}`;
}

export async function GET(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  return NextResponse.json(db.prepare("SELECT * FROM menu_items ORDER BY id DESC").all());
}

export async function POST(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let category = "", name = "", description = "", price = "", image_url = "";
  let is_active: number | boolean = 1;
  let sort_order = 0;

  const ct = request.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const fd = await request.formData();
    category = String(fd.get("category") || "");
    name = String(fd.get("name") || "");
    description = String(fd.get("description") || "");
    price = String(fd.get("price") || "");
    is_active = fd.get("is_active") === "false" ? 0 : 1;
    sort_order = Number(fd.get("sort_order") || 0);
    const image = fd.get("image") as File | null;
    if (image && image.size > 0) image_url = await saveFile(image);
  } else {
    const body = await request.json();
    ({ category, name, description, price, image_url, is_active, sort_order } = body);
  }

  const db = getDb();
  const isActiveNum = is_active === false || is_active === 0 ? 0 : 1;
  const result = db.prepare(
    "INSERT INTO menu_items (category, name, description, price, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(category || "", name || "", description || "", price || "", image_url || "", isActiveNum, sort_order || 0);
  return NextResponse.json({ id: result.lastInsertRowid, ok: true });
}

export async function PUT(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();

  let category = "", name = "", description = "", price = "", image_url = "";
  let is_active: number | boolean = 1;
  let sort_order = 0;

  const ct = request.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const fd = await request.formData();
    category = String(fd.get("category") || "");
    name = String(fd.get("name") || "");
    description = String(fd.get("description") || "");
    price = String(fd.get("price") || "");
    is_active = fd.get("is_active") === "false" ? 0 : 1;
    sort_order = Number(fd.get("sort_order") || 0);
    const image = fd.get("image") as File | null;
    if (image && image.size > 0) image_url = await saveFile(image);
  } else {
    const body = await request.json();
    ({ category, name, description, price, image_url, is_active, sort_order } = body);
  }

  const db = getDb();
  const isActiveNum = is_active === false || is_active === 0 ? 0 : 1;
  if (image_url) {
    db.prepare(
      "UPDATE menu_items SET category=?, name=?, description=?, price=?, image_url=?, is_active=?, sort_order=? WHERE id=?"
    ).run(category || "", name || "", description || "", price || "", image_url, isActiveNum, sort_order || 0, id);
  } else {
    db.prepare(
      "UPDATE menu_items SET category=?, name=?, description=?, price=?, is_active=?, sort_order=? WHERE id=?"
    ).run(category || "", name || "", description || "", price || "", isActiveNum, sort_order || 0, id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  const db = getDb();
  db.prepare("DELETE FROM menu_items WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
