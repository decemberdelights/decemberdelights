import { NextResponse } from "next/server";
import { getDb, decodeToken } from "@/lib/db";

function checkAdmin(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return null;
  const payload = decodeToken(sessionMatch[1]);
  if (!payload || payload.type !== "admin") return null;
  const db = getDb();
  const user = db.prepare("SELECT id, role, is_active FROM admin_users WHERE id = ?").get(payload.sub) as Record<string, unknown> | undefined;
  if (!user || !user.is_active) return null;
  return { ...payload, ...user };
}

export async function GET(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const q = (sql: string) => {
    const row = db.prepare(sql).get() as Record<string, number>;
    return row[Object.keys(row)[0]];
  };

  const today = new Date().toLocaleDateString("en-CA");
  const todayOrders = db.prepare("SELECT * FROM orders WHERE created_at LIKE ?").all(today + "%") as any[];

  return NextResponse.json({
    franchise_count: q("SELECT COUNT(*) as c FROM franchise_applications"),
    career_count: q("SELECT COUNT(*) as c FROM career_applications"),
    contact_count: q("SELECT COUNT(*) as c FROM contact_messages"),
    menu_count: q("SELECT COUNT(*) as c FROM menu_items"),
    product_count: q("SELECT COUNT(*) as c FROM products"),
    job_opening_count: q("SELECT COUNT(*) as c FROM jobs WHERE is_active = 1"),
    order_count: q("SELECT COUNT(*) as c FROM orders"),
    total_revenue: q("SELECT COALESCE(SUM(total), 0) as c FROM orders"),
    admin_count: q("SELECT COUNT(*) as c FROM admin_users"),
    pending_franchise: q("SELECT COUNT(*) as c FROM franchise_applications WHERE status='pending'"),
    pending_careers: q("SELECT COUNT(*) as c FROM career_applications WHERE status='pending'"),
    approved_careers: q("SELECT COUNT(*) as c FROM career_applications WHERE status='approved'"),
    rejected_careers: q("SELECT COUNT(*) as c FROM career_applications WHERE status='rejected'"),
    pending_contacts: q("SELECT COUNT(*) as c FROM contact_messages WHERE status='pending'"),
    submitted_franchise: q("SELECT COUNT(*) as c FROM franchise_applications WHERE status='submitted'"),
    under_process_franchise: q("SELECT COUNT(*) as c FROM franchise_applications WHERE status='under_process'"),
    approved_franchise: q("SELECT COUNT(*) as c FROM franchise_applications WHERE status='approved'"),
    rejected_franchise: q("SELECT COUNT(*) as c FROM franchise_applications WHERE status='rejected'"),
    products_online: q("SELECT COUNT(*) as c FROM products WHERE is_active = 1"),
    franchise_month_count: q(`SELECT COUNT(*) as c FROM franchise_applications WHERE created_at >= date('now', 'start of month')`),
    pending_orders: q("SELECT COUNT(*) as c FROM orders WHERE status='pending'"),
    preparing_orders: q("SELECT COUNT(*) as c FROM orders WHERE status='preparing'"),
    delivered_orders: q("SELECT COUNT(*) as c FROM orders WHERE status='delivered'"),
    cancelled_orders: q("SELECT COUNT(*) as c FROM orders WHERE status='cancelled'"),
    today_orders: todayOrders.length,
    today_revenue: todayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0),
  });
}
