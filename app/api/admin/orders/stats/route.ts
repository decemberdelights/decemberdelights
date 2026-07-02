import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const monthStart = today.slice(0, 7) + "-01";

  const allOrders = db.prepare("SELECT * FROM orders").all() as any[];

  const todayOrders = allOrders.filter((o: any) => o.created_at && o.created_at.startsWith(today));
  const monthOrders = allOrders.filter((o: any) => o.created_at && o.created_at >= monthStart);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daily: Record<string, { orders: number; revenue: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-CA");
    const shortLabel = `${dayNames[d.getDay()]} ${d.getDate()}`;
    const dayOrders = allOrders.filter((o: any) => o.created_at && o.created_at.startsWith(dateStr));
    daily[shortLabel] = { orders: dayOrders.length, revenue: dayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0) };
  }

  const monthly: Record<string, { orders: number; revenue: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("en-US", { month: "short" });
    const mStr = d.toISOString().slice(0, 7);
    const mOrders = allOrders.filter((o: any) => o.created_at && o.created_at.startsWith(mStr));
    monthly[key] = { orders: mOrders.length, revenue: mOrders.reduce((s: number, o: any) => s + (o.total || 0), 0) };
  }

  return NextResponse.json({
    daily,
    monthly,
    today_orders: todayOrders.length,
    today_revenue: todayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0),
    month_orders: monthOrders.length,
    month_revenue: monthOrders.reduce((s: number, o: any) => s + (o.total || 0), 0),
    total_orders: allOrders.length,
    total_revenue: allOrders.reduce((s: number, o: any) => s + (o.total || 0), 0),
    pending: allOrders.filter((o: any) => o.status === "pending").length,
    preparing: allOrders.filter((o: any) => o.status === "preparing").length,
    delivered: allOrders.filter((o: any) => o.status === "delivered").length,
    cancelled: allOrders.filter((o: any) => o.status === "cancelled").length,
  });
}
