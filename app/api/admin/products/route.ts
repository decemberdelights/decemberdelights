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
  const uploadDir = path.join(process.cwd(), "backend", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/products/${filename}`;
}

export async function GET(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const products = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let name = "", description = "", price = 0, original_price = 0, category = "", image_url = "", stock = 0;
  let is_active: number | boolean = 1;
  let offer = "", sort_order = 0;

  const ct = request.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const fd = await request.formData();
    name = String(fd.get("name") || "");
    description = String(fd.get("description") || "");
    price = Number(fd.get("price") || 0);
    original_price = Number(fd.get("original_price") || 0);
    category = String(fd.get("category") || "");
    stock = Number(fd.get("stock") || 0);
    is_active = fd.get("is_active") === "false" ? 0 : 1;
    offer = String(fd.get("offer") || "");
    sort_order = Number(fd.get("sort_order") || 0);
    const image = fd.get("image") as File | null;
    if (image && image.size > 0) image_url = await saveFile(image);
  } else {
    const body = await request.json();
    ({ name, description, price, original_price, category, image_url, stock, is_active, offer, sort_order } = body);
  }

  const db = getDb();
  const isActiveNum = is_active === false || is_active === 0 ? 0 : 1;
  const result = db.prepare(
    "INSERT INTO products (name, description, price, original_price, category, image_url, stock, is_active, offer, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(name || "", description || "", price || 0, original_price || 0, category || "", image_url || "", stock || 0, isActiveNum, offer || "", sort_order || 0);
  return NextResponse.json({ id: result.lastInsertRowid, ok: true });
}

export async function PUT(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();

  let name = "", description = "", price = 0, original_price = 0, category = "", image_url = "", stock = 0;
  let is_active: number | boolean = 1;
  let offer = "", sort_order = 0;

  const ct = request.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const fd = await request.formData();
    name = String(fd.get("name") || "");
    description = String(fd.get("description") || "");
    price = Number(fd.get("price") || 0);
    original_price = Number(fd.get("original_price") || 0);
    category = String(fd.get("category") || "");
    stock = Number(fd.get("stock") || 0);
    is_active = fd.get("is_active") === "false" ? 0 : 1;
    offer = String(fd.get("offer") || "");
    sort_order = Number(fd.get("sort_order") || 0);
    const image = fd.get("image") as File | null;
    if (image && image.size > 0) image_url = await saveFile(image);
  } else {
    const body = await request.json();
    ({ name, description, price, original_price, category, image_url, stock, is_active, offer, sort_order } = body);
  }

  const db = getDb();
  const isActiveNum = is_active === false || is_active === 0 ? 0 : 1;
  if (image_url) {
    db.prepare(
      "UPDATE products SET name=?, description=?, price=?, original_price=?, category=?, image_url=?, stock=?, is_active=?, offer=?, sort_order=? WHERE id=?"
    ).run(name || "", description || "", price || 0, original_price || 0, category || "", image_url, stock || 0, isActiveNum, offer || "", sort_order || 0, id);
  } else {
    db.prepare(
      "UPDATE products SET name=?, description=?, price=?, original_price=?, category=?, stock=?, is_active=?, offer=?, sort_order=? WHERE id=?"
    ).run(name || "", description || "", price || 0, original_price || 0, category || "", stock || 0, isActiveNum, offer || "", sort_order || 0, id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  const db = getDb();
  db.prepare("DELETE FROM products WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
