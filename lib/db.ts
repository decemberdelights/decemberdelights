import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "backend", "database.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: false });
    _db.pragma("journal_mode = WAL");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL DEFAULT 0,
      original_price REAL DEFAULT 0,
      category TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      stock INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      offer TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      department TEXT DEFAULT '',
      location TEXT DEFAULT '',
      description TEXT DEFAULT '',
      requirements TEXT DEFAULT '',
      salary_range TEXT DEFAULT '',
      job_type TEXT DEFAULT 'full-time',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS franchise_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      business_experience TEXT DEFAULT '',
      preferred_location TEXT DEFAULT '',
      investment_capability TEXT DEFAULT '',
      message TEXT DEFAULT '',
      aadhaar TEXT DEFAULT '',
      pan TEXT DEFAULT '',
      bank_statement TEXT DEFAULT '',
      id_proof TEXT DEFAULT '',
      address_proof TEXT DEFAULT '',
      other_docs TEXT DEFAULT '',
      tc_accepted INTEGER DEFAULT 0,
      tc_language TEXT DEFAULT 'en',
      status TEXT DEFAULT 'pending',
      tier TEXT DEFAULT '',
      city TEXT DEFAULT '',
      admin_notes TEXT DEFAULT '',
      login_id TEXT DEFAULT '',
      payment_status TEXT DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS career_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      position TEXT DEFAULT '',
      message TEXT DEFAULT '',
      resume_url TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      admin_notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      admin_notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      items TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      admin_username TEXT DEFAULT '',
      action TEXT NOT NULL,
      target_type TEXT DEFAULT '',
      target_id INTEGER DEFAULT 0,
      details TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_franchise_status ON franchise_applications(status);
    CREATE INDEX IF NOT EXISTS idx_franchise_created ON franchise_applications(created_at);
    CREATE INDEX IF NOT EXISTS idx_careers_status ON career_applications(status);
    CREATE INDEX IF NOT EXISTS idx_contacts_status ON contact_messages(status);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
  `);

  // Migration: ensure all required columns exist in admin_users
  const columns = db.prepare("PRAGMA table_info(admin_users)").all() as { name: string }[];
  const colNames = columns.map((c) => c.name);
  if (!colNames.includes("role")) {
    db.exec(`ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'admin'`);
  }
  if (!colNames.includes("is_active")) {
    db.exec(`ALTER TABLE admin_users ADD COLUMN is_active INTEGER DEFAULT 1`);
  }

  // Fix existing rows that have NULL values for new columns
  db.prepare("UPDATE admin_users SET role = 'super_admin' WHERE username = 'admin' AND (role IS NULL OR role = '')").run();
  db.prepare("UPDATE admin_users SET is_active = 1 WHERE is_active IS NULL").run();

  // Migration: ensure orders table has all required columns
  const orderColumns = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  const orderColNames = orderColumns.map((c) => c.name);
  const orderMigrations: Record<string, string> = {
    customer_email: "TEXT DEFAULT ''",
    payment_method: "TEXT DEFAULT 'cash'",
    payment_status: "TEXT DEFAULT 'unpaid'",
    notes: "TEXT DEFAULT ''",
    updated_at: "DATETIME DEFAULT CURRENT_TIMESTAMP",
  };
  for (const [col, colType] of Object.entries(orderMigrations)) {
    if (!orderColNames.includes(col)) {
      db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${colType}`);
    }
  }

  const adminCount = db.prepare("SELECT COUNT(*) as c FROM admin_users").get() as { c: number };
  if (adminCount.c === 0) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "changeme";
    const hash = hashPassword(defaultPassword);
    db.prepare("INSERT INTO admin_users (username, password_hash, role, is_active) VALUES (?, ?, ?, 1)").run("admin", hash, "super_admin");
  }

  // Ensure admin user exists
  // Note: admin is_active is NOT auto-reactivated to respect intentional disabling
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 600000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  // bcrypt hashes start with $2b$ or $2a$
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
    return bcrypt.compareSync(password, stored);
  }
  // PBKDF2 format: salt:hash
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  // Try current iteration count first
  const verify = crypto.pbkdf2Sync(password, salt, 600000, 64, "sha512").toString("hex");
  if (crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verify, "hex"))) return true;
  // Fallback: try legacy 10000 iterations for old passwords
  const legacyVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  if (crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(legacyVerify, "hex"))) return true;
  return false;
}

export function createToken(payload: Record<string, unknown>): string {
  const secret = getJwtSecret();
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 86400000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const secret = getJwtSecret();
    const [header, body, signature] = token.split(".");
    const verify = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    const sigBuf = Buffer.from(signature, "base64url");
    const verifyBuf = Buffer.from(verify, "base64url");
    if (sigBuf.length !== verifyBuf.length || !crypto.timingSafeEqual(sigBuf, verifyBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function logActivity(adminId: number, adminUsername: string, action: string, targetType: string, targetId: number, details: string = "") {
  try {
    const db = getDb();
    const cols = (db.prepare("PRAGMA table_info(activity_logs)").all() as { name: string }[]).map(c => c.name);
    if (cols.includes("admin_id")) {
      db.prepare("INSERT INTO activity_logs (admin_id, admin_username, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)").run(adminId, adminUsername, action, targetType, targetId, details);
    } else {
      db.prepare("INSERT INTO activity_logs (admin_username, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)").run(adminUsername, action, targetType, targetId, details);
    }
  } catch {}
}
